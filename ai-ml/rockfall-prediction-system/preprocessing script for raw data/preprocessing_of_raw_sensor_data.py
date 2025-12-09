import pandas as pd
import numpy as np
from scipy.signal import savgol_filter
from pathlib import Path

# ==========================================================
# 1. LOAD RAW DATA
# ==========================================================
DATA_PATH = Path(__file__).resolve().parent.parent / "raw_sensor_data_generated.csv"
df = pd.read_csv(DATA_PATH)



# Ensure timestamp column is in correct format
df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
df = df.dropna(subset=["timestamp"])
df = df.sort_values("timestamp").reset_index(drop=True)

# List of sensor columns (auto-detect)
SENSOR_COLS = [c for c in df.columns if c != "timestamp"]

# ==========================================================
# 2. HANDLE MISSING VALUES
# ==========================================================

# Step 2.1: Forward fill (good for time-series)
df[SENSOR_COLS] = df[SENSOR_COLS].fillna(method="ffill")

# Step 2.2: Backward fill (fix beginning missing)
df[SENSOR_COLS] = df[SENSOR_COLS].fillna(method="bfill")

# Step 2.3: Drop rows still missing (rare case)
df = df.dropna()

# ==========================================================
# 3. REMOVE EXTREME OUTLIERS
# ==========================================================

def remove_outliers(series, z_thresh=4):
    """Remove extreme outliers using Z-score."""
    mean = series.mean()
    std = series.std()
    z_scores = (series - mean) / std
    series[z_scores.abs() > z_thresh] = np.nan
    return series

for col in SENSOR_COLS:
    df[col] = remove_outliers(df[col])
    df[col] = df[col].fillna(method="ffill").fillna(method="bfill")

# ==========================================================
# 4. NOISE REDUCTION (Savgol Filter Smoothing)
# ==========================================================

def smooth_series(series):
    """Apply Savitzky–Golay smoothing filter."""
    try:
        return savgol_filter(series, window_length=21, polyorder=3)
    except:
        return series  # for short arrays

df_smooth = df.copy()
for col in SENSOR_COLS:
    df_smooth[col] = smooth_series(df[col])

# ==========================================================
# 5. FIX INVALID NEGATIVE VALUES (physical sensors can't be negative)
# ==========================================================
for col in SENSOR_COLS:
    df_smooth[col] = df_smooth[col].clip(lower=0)

# ==========================================================
# 6. EXPORT CLEANED DATA
# ==========================================================
df_smooth.to_csv("clean_preprocessed_sensor_data.csv", index=False)

print("Preprocessing complete!")
print("Saved as: clean_preprocessed_sensor_data.csv")
