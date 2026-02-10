"""
Feature Engineering for Market Pattern Learning (Optimized)

Extracts behavioral features from OHLCV data using sliding windows.
Optimized for processing millions of rows efficiently.
"""

import pandas as pd
import numpy as np


def calculate_log_returns(close: pd.Series) -> pd.Series:
    """Calculate log returns from close prices."""
    return np.log(close / close.shift(1))


def calculate_volatility(returns: pd.Series, window: int) -> pd.Series:
    """Rolling standard deviation of returns (realized volatility)."""
    return returns.rolling(window=window, min_periods=window).std()


def calculate_trend_slope_fast(close: pd.Series, window: int) -> pd.Series:
    """
    Fast linear regression slope using numpy.
    Uses the formula: slope = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x^2) - sum(x)^2)
    """
    y = close.values
    n = len(y)
    result = np.full(n, np.nan)
    
    # Precompute x values (0, 1, 2, ..., window-1)
    x = np.arange(window)
    sum_x = x.sum()
    sum_x_sq = (x ** 2).sum()
    
    for i in range(window - 1, n):
        y_window = y[i - window + 1:i + 1]
        if np.isnan(y_window).any():
            continue
        sum_y = y_window.sum()
        sum_xy = (x * y_window).sum()
        
        denominator = window * sum_x_sq - sum_x ** 2
        if denominator != 0:
            result[i] = (window * sum_xy - sum_x * sum_y) / denominator
    
    return pd.Series(result, index=close.index)


def calculate_drawdown(close: pd.Series, window: int) -> pd.Series:
    """Drawdown from rolling maximum."""
    rolling_max = close.rolling(window=window, min_periods=window).max()
    return (close - rolling_max) / rolling_max


def calculate_volume_ratio(volume: pd.Series, window: int) -> pd.Series:
    """Current volume vs rolling average."""
    avg_volume = volume.rolling(window=window, min_periods=window).mean()
    # Avoid division by zero
    return volume / avg_volume.replace(0, np.nan)


def calculate_range_compression(high: pd.Series, low: pd.Series, window: int) -> pd.Series:
    """Current price range vs rolling average range."""
    daily_range = high - low
    avg_range = daily_range.rolling(window=window, min_periods=window).mean()
    return daily_range / avg_range.replace(0, np.nan)


def calculate_momentum(returns: pd.Series, window: int) -> pd.Series:
    """Sum of returns over window."""
    return returns.rolling(window=window, min_periods=window).sum()


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract all features for a single stock's data.
    Optimized version with vectorized operations.
    """
    close = df['Close'].astype(float)
    high = df['High'].astype(float)
    low = df['Low'].astype(float)
    volume = df['Volume'].astype(float)
    
    # Calculate log returns first
    returns = calculate_log_returns(close)
    
    features = pd.DataFrame(index=df.index)
    features['date'] = df['Date']
    
    # Volatility features (fast)
    features['volatility_5d'] = calculate_volatility(returns, 5)
    features['volatility_10d'] = calculate_volatility(returns, 10)
    features['volatility_20d'] = calculate_volatility(returns, 20)
    
    # Trend features (optimized)
    features['trend_slope_10d'] = calculate_trend_slope_fast(close, 10)
    features['trend_slope_20d'] = calculate_trend_slope_fast(close, 20)
    
    # Drawdown
    features['drawdown_20d'] = calculate_drawdown(close, 20)
    
    # Volume behavior
    features['volume_ratio_10d'] = calculate_volume_ratio(volume, 10)
    features['volume_ratio_20d'] = calculate_volume_ratio(volume, 20)
    
    # Range compression/expansion
    features['range_compression_10d'] = calculate_range_compression(high, low, 10)
    
    # Momentum
    features['momentum_5d'] = calculate_momentum(returns, 5)
    features['momentum_10d'] = calculate_momentum(returns, 10)
    
    return features


def extract_features_batch(df: pd.DataFrame, stock_column: str = 'Stock') -> pd.DataFrame:
    """
    Extract features for all stocks in dataset.
    Optimized with progress tracking.
    """
    all_features = []
    stocks = df[stock_column].unique()
    total = len(stocks)
    
    print(f"Processing {total} stocks...")
    
    for i, stock in enumerate(stocks):
        # Progress every 50 stocks
        if i % 50 == 0:
            pct = (i / total) * 100
            print(f"  Progress: {i}/{total} ({pct:.1f}%)")
        
        stock_data = df[df[stock_column] == stock].copy()
        stock_data = stock_data.sort_values('Date')
        
        features = extract_features(stock_data)
        features['stock'] = stock
        all_features.append(features)
    
    print(f"  Progress: {total}/{total} (100%)")
    result = pd.concat(all_features, ignore_index=True)
    print(f"Total feature rows: {len(result):,}")
    
    return result
