"""
Pattern Learning Pipeline

Learns market behavior patterns from historical OHLCV data using K-Means clustering.
Patterns represent market regimes, NOT predictions.

Usage:
    python pattern_learning.py

Output:
    artifacts/centroids.npy   - Cluster centers
    artifacts/patterns.json   - Pattern definitions + stats
    artifacts/scaler.pkl      - StandardScaler for runtime matching
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics import silhouette_score
import joblib

from feature_engineering import extract_features_batch


# Pattern definitions (human-interpretable labels for clusters)
# These will be mapped to clusters based on centroid characteristics
PATTERN_TEMPLATES = {
    "P1": {
        "name": "Low Volatility Range-Bound",
        "description": "Flat trend, low volatility, narrow price range",
        "characteristics": [
            "Low realized volatility",
            "Near-zero trend slope",
            "Declining or stable volume"
        ],
        "risks": ["Overtrading", "Noise dominates price", "Breakouts often fail"]
    },
    "P2": {
        "name": "Volatility Expansion",
        "description": "Sudden increase in volatility, transition regime",
        "characteristics": [
            "Sharp volatility increase",
            "Volume spikes",
            "No clear directional trend yet"
        ],
        "risks": ["Risk increases sharply", "Poor position sizing leads to drawdowns"]
    },
    "P3": {
        "name": "Trending Up",
        "description": "Positive trend with stable momentum",
        "characteristics": [
            "Positive trend slope",
            "Moderate volatility",
            "Healthy volume participation"
        ],
        "risks": ["Counter-trend trades suffer", "Late entries may face pullbacks"]
    },
    "P4": {
        "name": "Trending Down",
        "description": "Negative trend with controlled volatility",
        "characteristics": [
            "Negative trend slope",
            "Consistent lower highs/lows",
            "Sustained selling pressure"
        ],
        "risks": ["Long trades face headwinds", "Risk management critical"]
    },
    "P5": {
        "name": "High Volatility Whipsaw",
        "description": "Very high volatility with frequent direction changes",
        "characteristics": [
            "Extreme volatility",
            "Large intraday ranges",
            "Volume spikes without follow-through"
        ],
        "risks": ["Stop losses hit frequently", "Emotional trading leads to losses"]
    },
    "P6": {
        "name": "Volatility Compression",
        "description": "Decreasing volatility, pre-breakout coiling",
        "characteristics": [
            "Decreasing volatility",
            "Tightening price range",
            "Declining volume"
        ],
        "risks": ["Premature entries fail", "Risk-reward asymmetric"]
    },
    "P7": {
        "name": "Exhaustion / Blow-Off",
        "description": "Sharp price movement with extreme volume",
        "characteristics": [
            "Sharp price move",
            "Extremely high volume",
            "Often followed by reversal"
        ],
        "risks": ["Late entries suffer", "Sharp reversal risk"]
    },
    "P8": {
        "name": "Mean-Reversion Dominant",
        "description": "Price oscillates around mean, extremes fade",
        "characteristics": [
            "Price reverts after extremes",
            "Moderate symmetric volatility",
            "Stable volume"
        ],
        "risks": ["Trend-following underperforms", "Patience required"]
    },
    "P9": {
        "name": "Illiquid / Thin Participation",
        "description": "Low volume with irregular price jumps",
        "characteristics": [
            "Low volume",
            "Irregular price movements",
            "Large bid-ask impact"
        ],
        "risks": ["Slippage dominates", "Position sizing errors amplified"]
    }
}


def load_data(filepath: str) -> pd.DataFrame:
    """Load and validate the dataset."""
    print(f"Loading data from {filepath}...")
    df = pd.read_csv(filepath)
    
    # Validate required columns
    required = ['Date', 'Stock', 'Open', 'High', 'Low', 'Close', 'Volume']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")
    
    print(f"Loaded {len(df):,} rows, {df['Stock'].nunique()} stocks")
    return df


def prepare_features(df: pd.DataFrame) -> tuple:
    """Extract features and prepare for clustering."""
    print("\n=== Feature Engineering ===")
    features_df = extract_features_batch(df)
    
    # Get feature columns (exclude metadata)
    feature_cols = [c for c in features_df.columns if c not in ['date', 'stock']]
    
    # Drop rows with NaN (from rolling windows)
    clean_df = features_df.dropna()
    print(f"After dropping NaN: {len(clean_df):,} rows")
    
    X = clean_df[feature_cols].values
    metadata = clean_df[['date', 'stock']].copy()
    
    return X, metadata, feature_cols


def train_clustering(X: np.ndarray, n_clusters: int = 9) -> tuple:
    """Train MiniBatchKMeans clustering (fast for large datasets)."""
    print(f"\n=== Training MiniBatchKMeans (k={n_clusters}) ===")
    print(f"Dataset size: {len(X):,} samples")
    
    # Normalize features
    print("Normalizing features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train MiniBatchKMeans (much faster than regular KMeans)
    print("Clustering (this should take ~1-2 minutes)...")
    kmeans = MiniBatchKMeans(
        n_clusters=n_clusters, 
        random_state=42, 
        batch_size=10000,  # Process in batches
        n_init=3,  # Fewer initializations
        max_iter=100
    )
    labels = kmeans.fit_predict(X_scaled)
    
    # Evaluate on a sample (silhouette is slow on 4M rows)
    print("Evaluating cluster quality...")
    sample_size = min(100000, len(X_scaled))
    sample_idx = np.random.choice(len(X_scaled), sample_size, replace=False)
    silhouette = silhouette_score(X_scaled[sample_idx], labels[sample_idx])
    print(f"Silhouette Score (sample): {silhouette:.3f}")
    
    # Cluster distribution
    unique, counts = np.unique(labels, return_counts=True)
    print("Cluster distribution:")
    for cluster, count in zip(unique, counts):
        print(f"  Cluster {cluster}: {count:,} samples ({count/len(labels)*100:.1f}%)")
    
    return kmeans, scaler, labels


def map_clusters_to_patterns(kmeans, feature_cols: list) -> dict:
    """
    Map K-Means clusters to pattern definitions based on centroid characteristics.
    This is a heuristic mapping based on feature interpretation.
    """
    centroids = kmeans.cluster_centers_
    
    # Feature index mapping
    idx = {name: i for i, name in enumerate(feature_cols)}
    
    # Score each cluster for each pattern type
    pattern_mapping = {}
    used_patterns = set()
    
    for cluster_id in range(len(centroids)):
        c = centroids[cluster_id]
        
        # Calculate pattern scores based on centroid values
        scores = {}
        
        # P1: Low volatility, flat trend
        scores['P1'] = -abs(c[idx.get('volatility_10d', 0)]) - abs(c[idx.get('trend_slope_10d', 0)])
        
        # P2: High volatility change (proxy: high vol with low trend)
        scores['P2'] = c[idx.get('volatility_10d', 0)] - abs(c[idx.get('trend_slope_10d', 0)])
        
        # P3: Positive trend
        scores['P3'] = c[idx.get('trend_slope_10d', 0)] + c[idx.get('momentum_10d', 0)]
        
        # P4: Negative trend
        scores['P4'] = -c[idx.get('trend_slope_10d', 0)] - c[idx.get('momentum_10d', 0)]
        
        # P5: High volatility + low momentum persistence
        scores['P5'] = c[idx.get('volatility_10d', 0)] + abs(c[idx.get('momentum_5d', 0)])
        
        # P6: Low volatility + compression
        scores['P6'] = -c[idx.get('volatility_10d', 0)] - c[idx.get('range_compression_10d', 0)]
        
        # P7: High volume + drawdown
        scores['P7'] = c[idx.get('volume_ratio_10d', 0)] + abs(c[idx.get('drawdown_20d', 0)])
        
        # P8: Low trend slope, moderate volatility
        scores['P8'] = -abs(c[idx.get('trend_slope_10d', 0)]) + c[idx.get('volatility_10d', 0)] * 0.5
        
        # P9: Low volume
        scores['P9'] = -c[idx.get('volume_ratio_10d', 0)]
        
        # Find best available pattern
        sorted_patterns = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        for pattern_id, score in sorted_patterns:
            if pattern_id not in used_patterns:
                pattern_mapping[cluster_id] = pattern_id
                used_patterns.add(pattern_id)
                break
    
    return pattern_mapping


def calculate_pattern_stats(labels: np.ndarray, metadata: pd.DataFrame, mapping: dict) -> dict:
    """Calculate statistics for each pattern from the data."""
    stats = {}
    
    for cluster_id, pattern_id in mapping.items():
        cluster_mask = labels == cluster_id
        count = cluster_mask.sum()
        
        stats[pattern_id] = {
            "sampleCount": int(count),
            "percentage": round(count / len(labels) * 100, 2)
        }
    
    return stats


def save_artifacts(kmeans, scaler, pattern_mapping: dict, pattern_stats: dict, 
                   feature_cols: list, output_dir: str = "artifacts"):
    """Save all artifacts for runtime use."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Save centroids
    np.save(os.path.join(output_dir, "centroids.npy"), kmeans.cluster_centers_)
    
    # Save scaler
    joblib.dump(scaler, os.path.join(output_dir, "scaler.pkl"))
    
    # Save feature columns
    with open(os.path.join(output_dir, "feature_cols.json"), 'w') as f:
        json.dump(feature_cols, f, indent=2)
    
    # Build and save patterns.json
    patterns = {}
    for cluster_id, pattern_id in pattern_mapping.items():
        template = PATTERN_TEMPLATES[pattern_id].copy()
        template["clusterId"] = cluster_id
        template["centroid"] = kmeans.cluster_centers_[cluster_id].tolist()
        
        if pattern_id in pattern_stats:
            template["stats"] = pattern_stats[pattern_id]
        
        patterns[pattern_id] = template
    
    with open(os.path.join(output_dir, "patterns.json"), 'w') as f:
        json.dump(patterns, f, indent=2)
    
    print(f"\nArtifacts saved to {output_dir}/")


def main():
    """Main pipeline execution."""
    print("=" * 60)
    print("Market Pattern Learning Pipeline")
    print("=" * 60)
    
    # Configuration
    DATA_PATH = "../stocks_df.csv"
    N_CLUSTERS = 9
    OUTPUT_DIR = "artifacts"
    
    # Load data
    df = load_data(DATA_PATH)
    
    # Extract features
    X, metadata, feature_cols = prepare_features(df)
    
    # Train clustering
    kmeans, scaler, labels = train_clustering(X, N_CLUSTERS)
    
    # Map clusters to patterns
    pattern_mapping = map_clusters_to_patterns(kmeans, feature_cols)
    print("\nCluster → Pattern mapping:")
    for cluster_id, pattern_id in sorted(pattern_mapping.items()):
        print(f"  Cluster {cluster_id} → {pattern_id}: {PATTERN_TEMPLATES[pattern_id]['name']}")
    
    # Calculate stats
    pattern_stats = calculate_pattern_stats(labels, metadata, pattern_mapping)
    
    # Save artifacts
    save_artifacts(kmeans, scaler, pattern_mapping, pattern_stats, feature_cols, OUTPUT_DIR)
    
    print("\n" + "=" * 60)
    print("Pattern learning complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
