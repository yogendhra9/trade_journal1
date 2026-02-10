# Phase 3: Market Pattern Learning

## Setup

```bash
cd backend/ml
pip install -r requirements.txt
```

## Run Pattern Learning

```bash
python pattern_learning.py
```

This will:
1. Load `stocks_df.csv` (~4M rows)
2. Engineer features (volatility, trend, drawdown, etc.)
3. Run K-Means clustering (k=9)
4. Save artifacts to `artifacts/` folder

## Output Artifacts

- `artifacts/centroids.npy` - Cluster centers for pattern matching
- `artifacts/patterns.json` - Pattern definitions + stats for LLM
- `artifacts/scaler.pkl` - StandardScaler for normalizing new data
