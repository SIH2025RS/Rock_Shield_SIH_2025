"""
Rockfall Early-Warning ML Pipeline (8-Timestep Version)
======================================================

This script:
  1. Loads patch, DEM, and weather data
  2. Merges them into a single ML-ready dataframe
  3. (Optionally) Creates 8-step early-warning labels from rockfall_label_original
  4. Ensures rate features exist (fs_rate, pore_pressure_kpa_rate, ...)
  5. Builds XGBoost row-wise dataset
  6. Builds LSTM sequence dataset with window size = 8
  7. Trains XGBoost & LSTM
  8. Saves artifacts: models, scaler, feature order, window size, ensemble config

You can adapt file paths, feature lists, and hyperparameters as needed.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    classification_report,
    roc_curve,
    precision_recall_curve,
    average_precision_score,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from sklearn.utils.class_weight import compute_class_weight

import joblib

from xgboost import XGBClassifier

import tensorflow as tf
from tensorflow.keras import layers, models

import matplotlib.pyplot as plt
import seaborn as sns


# =========================
# 0. CONFIG
# =========================

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "Datasets"
print("DATA_DIR =", DATA_DIR)

PATCH_FILES = [
    "rockfall_patch_JH-UG-01_realistic_processed.csv",
    "rockfall_patch_JH-UG-02_realistic_processed.csv",
    "rockfall_patch_JH-UG-03_realistic_processed.csv",
    "rockfall_patch_JH-UG-04_realistic_processed.csv",
    "rockfall_patch_JH-UG-05_realistic_processed.csv",
]

DEM_FILE = "dem_features_from_rasters_realistic.csv"
WEATHER_FILE = "weather_with_TWI_realistic.csv"

WINDOW_SIZE = 8   # for both label shift and LSTM window
TARGET_COL = "rockfall_label"          # shifted warning label
ORIG_LABEL_COL = "rockfall_label_original"


# These features should exist in your patch files + merged DEM/weather
XGB_FEATURES = [
    "fs", "fs_rate",
    "pore_pressure_kpa", "pore_pressure_kpa_rate",
    "displacement_mm", "displacement_mm_rate",
    "strain_microstrain", "strain_microstrain_rate",
    "pore_pressure_ratio",
    "normal_stress_kpa", "shear_stress_kpa",
    "temperature_c", "humidity_pct",
    "vibration_hz", "dust_ugm3",
    "methane_ppm", "co_ppm", "airflow_mps",
    "slope_angle_deg", "slope_height_m",
    "cohesion_kpa", "friction_angle_deg", "unit_weight_knm3",
    "reinforcement_numeric",
    "latitude", "longitude",

    # DEM features
    "dem_elevation", "dem_slope_angle", "dem_curvature",
    "dem_aspect", "dem_terrain_ruggedness", "dem_drainage_distance",

    # weather features
    "rain_A24", "rain_A72", "rain_A168",
    "weather_temperature", "weather_humidity",
    "TWI_dynamic"
]

# Time-varying features for LSTM (do NOT include static/constant ones)
LSTM_FEATURES = [
    "fs", "fs_rate",
    "pore_pressure_kpa", "pore_pressure_kpa_rate",
    "displacement_mm", "displacement_mm_rate",
    "strain_microstrain", "strain_microstrain_rate",
    "temperature_c", "humidity_pct",
    "vibration_hz",
    "dust_ugm3",
    "airflow_mps",
    "methane_ppm", "co_ppm",

    # weather features
    "rain_A24", "rain_A72", "rain_A168",
    "weather_temperature", "weather_humidity",
    "TWI_dynamic"
]


# =========================
# 1. HELPER FUNCTIONS
# =========================

def plot_precursor_trends(df_patch, patch_id):
    plt.figure(figsize=(14, 6))
    plt.title(f"Factor of Safety Trend – Patch {patch_id}")
    plt.plot(df_patch["timestamp"], df_patch["fs"], label="FS")
    plt.scatter(
        df_patch["timestamp"],
        df_patch[ORIG_LABEL_COL] * df_patch["fs"].max(),
        color="red", label="Failure event", s=20
    )
    plt.xlabel("Time"); plt.ylabel("Factor of Safety")
    plt.legend(); plt.grid(True)
    plt.show()

    plt.figure(figsize=(14, 6))
    plt.title(f"Pore Pressure Trend – Patch {patch_id}")
    plt.plot(df_patch["timestamp"], df_patch["pore_pressure_kpa"], label="Pore Pressure")
    plt.scatter(
        df_patch["timestamp"],
        df_patch[ORIG_LABEL_COL] * df_patch["pore_pressure_kpa"].max(),
        color="red", label="Failure event", s=20
    )
    plt.xlabel("Time"); plt.ylabel("Pore Pressure (kPa)")
    plt.legend(); plt.grid(True)
    plt.show()

    plt.figure(figsize=(14, 6))
    plt.title(f"Displacement Trend – Patch {patch_id}")
    plt.plot(df_patch["timestamp"], df_patch["displacement_mm"], label="Displacement (mm)")
    plt.scatter(
        df_patch["timestamp"],
        df_patch[ORIG_LABEL_COL] * df_patch["displacement_mm"].max(),
        color="red", label="Failure event", s=20
    )
    plt.xlabel("Time"); plt.ylabel("Displacement (mm)")
    plt.legend(); plt.grid(True)
    plt.show()

    plt.figure(figsize=(14, 6))
    plt.title(f"Microstrain Trend – Patch {patch_id}")
    plt.plot(df_patch["timestamp"], df_patch["strain_microstrain"], label="Strain (µε)")
    plt.scatter(
        df_patch["timestamp"],
        df_patch[ORIG_LABEL_COL] * df_patch["strain_microstrain"].max(),
        color="red", label="Failure event", s=20
    )
    plt.xlabel("Time"); plt.ylabel("Microstrain (µε)")
    plt.legend(); plt.grid(True)
    plt.show()


def load_patch_data():
    """Load all patch CSVs into a list of dataframes, sorted by timestamp."""
    patch_dfs = []
    for f in PATCH_FILES:
        df = pd.read_csv(DATA_DIR / f)
        if "timestamp" not in df.columns:
            raise ValueError(f"'timestamp' column missing in {f}")

        df["timestamp"] = pd.to_datetime(df["timestamp"], format='mixed', dayfirst=True)
        df = df.sort_values("timestamp").reset_index(drop=True)
        patch_dfs.append(df)

    return patch_dfs


def load_dem_data():
    """Load DEM features, indexed by patch_id."""
    dem_df = pd.read_csv(DATA_DIR / DEM_FILE)
    if "patch_id" not in dem_df.columns:
        raise ValueError("DEM file must contain 'patch_id' column")
    return dem_df


def load_weather_data():
    """Load weather data, indexed by timestamp."""
    weather_df = pd.read_csv(DATA_DIR / WEATHER_FILE)
    if "timestamp" not in weather_df.columns:
        raise ValueError("Weather file must contain 'timestamp' column")

    # keep consistent with patch timestamps
    weather_df["timestamp"] = pd.to_datetime(weather_df["timestamp"], format='mixed', dayfirst=True)

    return weather_df


def merge_dem_weather(patch_dfs, dem_df, weather_df):
    """Merge DEM & weather into each patch dataframe."""
    merged_dfs = []
    dem_cols_to_use = [c for c in dem_df.columns if c != "patch_id"]
    weather_cols_to_use = [c for c in weather_df.columns if c != "timestamp"]

    for df in patch_dfs:
        # Merge weather on timestamp (same weather for all patches)
        df = df.merge(
            weather_df[["timestamp"] + weather_cols_to_use],
            on="timestamp",
            how="left"
        )
        # Merge DEM on patch_id
        if "patch_id" not in df.columns:
            raise ValueError("Patch dataframe missing 'patch_id' column.")

        df = df.merge(
            dem_df[["patch_id"] + dem_cols_to_use],
            on="patch_id",
            how="left"
        )
        merged_dfs.append(df)

    return merged_dfs


def show_actual_vs_predicted(df, n_samples=20):
    """
    Display a table comparing actual vs predicted output for a sample of rows.
    Columns shown:
        timestamp, actual_label, predicted_prob, risk_level
    """
    display_cols = ["timestamp", TARGET_COL, "ensemble_prob", "risk_level"]
    
    # Sort latest high-risk first to inspect interesting samples
    df_sorted = df.sort_values("ensemble_prob", ascending=False)
    
    print(f"\nShowing {n_samples} rows (sorted by highest risk):\n")
    print(df_sorted[display_cols].head(n_samples).to_string(index=False))


def create_early_warning_label(df, shift_back=8):
    """
    Create early-warning labels that mark ONLY the pre-failure window as 1.
    - The failure moment itself is labeled 0.
    - No labels after failure are set to 1.
    Only used if TARGET_COL is missing in the CSV.
    """
    if ORIG_LABEL_COL not in df.columns:
        raise ValueError(f"Original label column '{ORIG_LABEL_COL}' not found.")

    label = np.zeros(len(df), dtype=int)
    event_indices = df.index[df[ORIG_LABEL_COL] == 1].tolist()

    for event in event_indices:
        start = max(0, event - shift_back)
        end = event  # do not include the actual failure timestamp
        label[start:end] = 1

    df[TARGET_COL] = label
    return df


def add_rate_features(df, group_col="patch_id"):
    """
    If your CSVs don't already have *_rate, you can use this.
    Currently not used in main, assuming rates are precomputed.
    """
    time_features = ["fs", "pore_pressure_kpa", "displacement_mm", "strain_microstrain"]
    df = df.sort_values([group_col, "timestamp"])

    for col in time_features:
        rate_col = f"{col}_rate"
        df[rate_col] = df.groupby(group_col)[col].diff()

    return df


def assign_risk_levels(df, prob_col="ensemble_prob"):
    """
    Assign risk levels based on a threshold.
    - 0: Safe (low risk)
    - 1: Warning (medium risk)
    - 2: Failure (high risk)
    """
    df["risk_level"] = df[prob_col].apply(lambda x: 2 if x >= 0.6 else (1 if x >= 0.3 else 0))
    return df


def drop_first_row_per_patch(df, group_col="patch_id"):
    """Drop the first row of each patch because rate/diff is NaN there."""
    first_indices = df.groupby(group_col).head(1).index
    df = df.drop(first_indices).reset_index(drop=True)
    return df


def concat_patches(patch_dfs):
    """Combine all patch dataframes into a single full dataframe."""
    full_df = pd.concat(patch_dfs, ignore_index=True)
    full_df = full_df.sort_values(["patch_id", "timestamp"]).reset_index(drop=True)
    return full_df


def train_test_split_by_time(full_df, train_ratio=0.8):
    """
    Time-based train/test split per patch to avoid leakage.
    Returns train_df, test_df.
    """
    train_parts = []
    test_parts = []

    for patch_id, df_patch in full_df.groupby("patch_id"):
        df_patch = df_patch.sort_values("timestamp")
        split_idx = int(len(df_patch) * train_ratio)
        train_parts.append(df_patch.iloc[:split_idx])
        test_parts.append(df_patch.iloc[split_idx:])

    train_df = pd.concat(train_parts).reset_index(drop=True)
    test_df = pd.concat(test_parts).reset_index(drop=True)
    return train_df, test_df


def make_lstm_windows(df, feature_cols, target_col, window_size):
    """
    Build sliding windows of length window_size per patch.
    Returns:
        X (N, window_size, features),
        y (N,),
        idx (N,)  # index of the window end-row in the original df
    """
    X_list, y_list, idx_list = [], [], []

    for patch_id, df_patch in df.groupby("patch_id"):
        df_patch = df_patch.sort_values("timestamp")
        values = df_patch[feature_cols].values
        labels = df_patch[target_col].values
        idx = df_patch.index.values

        if len(df_patch) < window_size:
            continue

        for i in range(len(df_patch) - window_size + 1):
            X_list.append(values[i: i + window_size])
            y_list.append(labels[i + window_size - 1])
            idx_list.append(idx[i + window_size - 1])

    X = np.array(X_list)
    y = np.array(y_list)
    idx_arr = np.array(idx_list)
    return X, y, idx_arr


def build_lstm_model(n_timesteps, n_features):
    """
    Define and compile LSTM model.
    """
    model = models.Sequential([
        layers.Input(shape=(n_timesteps, n_features)),
        layers.LSTM(64, return_sequences=False),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(32, activation="relu"),
        layers.Dropout(0.3),
        layers.Dense(1, activation="sigmoid")
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=[tf.keras.metrics.AUC(name="auc")]
    )
    return model


def plot_overfitting_curve(history):
    plt.figure(figsize=(8, 5))
    plt.plot(history.history["auc"], label="Train AUC")
    plt.plot(history.history["val_auc"], label="Validation AUC")
    plt.xlabel("Epoch")
    plt.ylabel("AUC")
    plt.title("Training vs Validation AUC")
    plt.legend()
    plt.grid(True)
    plt.show()

    plt.figure(figsize=(8, 5))
    plt.plot(history.history["loss"], label="Train Loss")
    plt.plot(history.history["val_loss"], label="Validation Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Training vs Validation Loss")
    plt.legend()
    plt.grid(True)
    plt.show()


def plot_roc_curve(y_true, y_prob, title):
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    auc = roc_auc_score(y_true, y_prob)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"AUC = {auc:.4f}")
    plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title(f"ROC Curve – {title}")
    plt.legend(); plt.grid(True)
    plt.show()


def plot_pr_curve(y_true, y_prob, title):
    precision, recall, _ = precision_recall_curve(y_true, y_prob)
    ap = average_precision_score(y_true, y_prob)
    plt.figure(figsize=(6, 5))
    plt.plot(recall, precision, label=f"AP = {ap:.4f}")
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title(f"Precision–Recall Curve – {title}")
    plt.legend(); plt.grid(True)
    plt.show()


def plot_prob_histograms(xgb_prob, lstm_prob, ensemble_prob):
    plt.figure(figsize=(7, 5))
    sns.kdeplot(xgb_prob, label="XGB", fill=True, alpha=0.4)
    sns.kdeplot(lstm_prob, label="LSTM", fill=True, alpha=0.4)
    sns.kdeplot(ensemble_prob, label="Ensemble", fill=True, alpha=0.4)
    plt.title("Probability Distribution Comparison")
    plt.xlabel("Predicted Probability")
    plt.legend(); plt.grid(True)
    plt.show()


def plot_failure_timeline(df, prob_col, title=""):
    """Plots early-warning label vs model predicted probability over time."""
    plt.figure(figsize=(12, 4))
    plt.plot(df["timestamp"], df[prob_col], label="Predicted prob")
    plt.scatter(
        df["timestamp"],
        df[TARGET_COL] * 1.05,
        label="Warning label", color="red", s=20
    )
    plt.xlabel("Time")
    plt.ylabel("Probability")
    plt.title(f"Probability vs Early-Warning Label – {title}")
    plt.legend(); plt.grid(True)
    plt.show()


# =========================
# 2. MAIN PIPELINE
# =========================

def main():
    # ---- Step 1: Load raw data ----
    print("Loading patch, DEM, and weather data...")
    patch_dfs = load_patch_data()
    dem_df = load_dem_data()
    weather_df = load_weather_data()

    # ---- Step 2: Merge DEM & weather ----
    print("Merging DEM and weather into patch data...")
    patch_dfs = merge_dem_weather(patch_dfs, dem_df, weather_df)

    # ---- Step 3: Label engineering (8-step early warning) ----
    # Only generate if label missing; otherwise use the one already in CSV.
    print("Ensuring early-warning labels exist...")
    for i, df in enumerate(patch_dfs):
        if TARGET_COL not in df.columns:
            patch_dfs[i] = create_early_warning_label(df, shift_back=WINDOW_SIZE)

    # ---- Step 6: Concatenate patches ----
    print("Concatenating all patches into full_df...")
    full_df = concat_patches(patch_dfs)

    # Optional: precursor inspection
    # patch_id_example = full_df["patch_id"].unique()[0]
    # df_patch_example = full_df[full_df["patch_id"] == patch_id_example]
    # plot_precursor_trends(df_patch_example, patch_id_example)

    # Basic sanity checks
    if TARGET_COL not in full_df.columns:
        raise ValueError(f"Target column {TARGET_COL} not found in full_df.")
    for col in XGB_FEATURES:
        if col not in full_df.columns:
            raise ValueError(f"XGBoost feature {col} missing in full_df.")
    for col in LSTM_FEATURES:
        if col not in full_df.columns:
            raise ValueError(f"LSTM feature {col} missing in full_df.")

    # ---- Step 7: Train-test split (time-based, per patch) ----
    print("Performing time-based train-test split per patch...")
    train_df, test_df = train_test_split_by_time(full_df, train_ratio=0.8)

    # ---- Step 8: Prepare XGBoost datasets ----
    print("Preparing XGBoost datasets...")
    X_train_xgb = train_df[XGB_FEATURES]
    y_train_xgb = train_df[TARGET_COL].astype(int)

    X_test_xgb = test_df[XGB_FEATURES]
    y_test_xgb = test_df[TARGET_COL].astype(int)

    # Class imbalance handling
    pos = y_train_xgb.sum()
    neg = len(y_train_xgb) - pos
    if pos == 0:
        raise ValueError("No positive samples in training set; cannot train model.")
    scale_pos_weight = neg / pos
    print(f"XGB scale_pos_weight = {scale_pos_weight:.2f}")

    # Train XGBoost
    print("Training XGBoost model...")
    xgb = XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        scale_pos_weight=scale_pos_weight,
        n_jobs=-1
    )
    xgb.fit(X_train_xgb, y_train_xgb)

    y_pred_prob_xgb = xgb.predict_proba(X_test_xgb)[:, 1]
    auc_xgb = roc_auc_score(y_test_xgb, y_pred_prob_xgb)
    print(f"XGBoost Test AUC: {auc_xgb:.4f}")

    # ---- Step 9: Prepare LSTM datasets (with scaling) ----
    print("Preparing LSTM datasets (scaling + sliding windows)...")
    scaler = StandardScaler()
    scaler.fit(train_df[LSTM_FEATURES])

    train_scaled = scaler.transform(train_df[LSTM_FEATURES])
    test_scaled = scaler.transform(test_df[LSTM_FEATURES])

    train_df_lstm = train_df.copy()
    test_df_lstm = test_df.copy()
    for i, col in enumerate(LSTM_FEATURES):
        train_df_lstm[col] = train_scaled[:, i]
        test_df_lstm[col] = test_scaled[:, i]

    X_train_lstm, y_train_lstm, idx_train = make_lstm_windows(
        train_df_lstm, LSTM_FEATURES, TARGET_COL, WINDOW_SIZE
    )
    X_test_lstm, y_test_lstm, idx_test = make_lstm_windows(
        test_df_lstm, LSTM_FEATURES, TARGET_COL, WINDOW_SIZE
    )

    print(f"LSTM train windows: {X_train_lstm.shape}, test windows: {X_test_lstm.shape}")

    # ---- Step 10: Train LSTM ----
    print("Training LSTM model...")
    n_timesteps = X_train_lstm.shape[1]
    n_features = X_train_lstm.shape[2]

    lstm_model = build_lstm_model(n_timesteps, n_features)

    # class weights for imbalanced data
    cw = compute_class_weight(class_weight="balanced", classes=np.array([0, 1]), y=y_train_lstm)
    class_weights = {0: cw[0], 1: cw[1]}
    print(f"LSTM class weights: {class_weights}")

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_auc",
            mode="max",
            patience=5,
            restore_best_weights=True
        )
    ]

    history = lstm_model.fit(
        X_train_lstm, y_train_lstm,
        validation_data=(X_test_lstm, y_test_lstm),
        epochs=30,
        batch_size=128,
        callbacks=callbacks,
        verbose=1,
        class_weight=class_weights
    )

    y_pred_prob_lstm = lstm_model.predict(X_test_lstm).ravel()
    auc_lstm = roc_auc_score(y_test_lstm, y_pred_prob_lstm)
    print(f"LSTM Test AUC: {auc_lstm:.4f}")

    # Overfitting curves
    plot_overfitting_curve(history)

    # ---- Step: Ensemble Prediction ----
    print("Generating ensemble predictions...")

    # Put LSTM probabilities back into row-wise test_df using window end indices
    test_df_lstm = test_df.copy()
    test_df_lstm["lstm_prob"] = np.nan
    test_df_lstm.loc[idx_test, "lstm_prob"] = y_pred_prob_lstm

    # drop rows where LSTM prob is missing (beginning of each patch)
    ensemble_df = test_df_lstm.dropna(subset=["lstm_prob"]).copy()

    # attach XGB predictions (aligned on the same rows)
    ensemble_df["xgb_prob"] = xgb.predict_proba(ensemble_df[XGB_FEATURES])[:, 1]

    # weighted blend (chosen from your earlier weight search)
    w_xgb = 0.7
    w_lstm = 0.3
    ensemble_df["ensemble_prob"] = (
        w_xgb * ensemble_df["xgb_prob"] + w_lstm * ensemble_df["lstm_prob"]
    )

    auc_ensemble = roc_auc_score(ensemble_df[TARGET_COL], ensemble_df["ensemble_prob"])
    print(f"Ensemble Test AUC: {auc_ensemble:.4f}")

    # === Confusion Matrix (Ensemble, with threshold 0.3) ===
    threshold = 0.3
    y_pred_label = (ensemble_df["ensemble_prob"] >= threshold).astype(int)

    cm = confusion_matrix(ensemble_df[TARGET_COL], y_pred_label)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot(cmap="Blues", values_format="d")
    plt.title(f"Confusion Matrix (threshold={threshold})")
    plt.show()

    for thr in [0.3, 0.5, 0.7]:
        y_pred_label_thr = (ensemble_df["ensemble_prob"] >= thr).astype(int)
        cm_thr = confusion_matrix(ensemble_df[TARGET_COL], y_pred_label_thr)
        print(
            f"Threshold {thr}: "
            f"TN={cm_thr[0,0]}, FP={cm_thr[0,1]}, "
            f"FN={cm_thr[1,0]}, TP={cm_thr[1,1]}"
        )

    # ======= MODEL VALIDATION PLOTS =======

    # ROC curves
    plot_roc_curve(y_test_xgb, y_pred_prob_xgb, "XGBoost")
    plot_roc_curve(y_test_lstm, y_pred_prob_lstm, "LSTM")
    plot_roc_curve(ensemble_df[TARGET_COL], ensemble_df["ensemble_prob"], "Ensemble")

    # Precision–Recall curves
    plot_pr_curve(y_test_xgb, y_pred_prob_xgb, "XGBoost")
    plot_pr_curve(y_test_lstm, y_pred_prob_lstm, "LSTM")
    plot_pr_curve(ensemble_df[TARGET_COL], ensemble_df["ensemble_prob"], "Ensemble")

    # Probability distributions comparison
    plot_prob_histograms(
        ensemble_df["xgb_prob"],
        ensemble_df["lstm_prob"],
        ensemble_df["ensemble_prob"]
    )

    # Failure timeline visualization for each patch (based on early-warning label)
    for patch_id, df_patch in ensemble_df.groupby("patch_id"):
        print(f"Plotting timeline for patch {patch_id}...")
        plot_failure_timeline(df_patch, "ensemble_prob", title=f"Patch {patch_id}")

    # ---- Step 11: Save artifacts ----
    print("Saving models and artifacts...")
    output_dir = Path(__file__).resolve().parents[1] / "Models"
    output_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(xgb, output_dir / "xgb_model.pkl")
    joblib.dump(scaler, output_dir / "scaler.pkl")
    lstm_model.save(output_dir / "lstm_model.h5")
    with open(output_dir / "feature_order.json", "w") as f:
        json.dump(XGB_FEATURES, f, indent=2)
    with open(output_dir / "window_size.txt", "w") as f:
        f.write(str(WINDOW_SIZE))

    ensemble_config = {
        "xgb_weight": float(w_xgb),
        "lstm_weight": float(w_lstm),
        "alert_thresholds": {
            "safe": 0.3,
            "warning": 0.6
        },
        "xgb_features": XGB_FEATURES,
        "lstm_features": LSTM_FEATURES,
        "window_size": WINDOW_SIZE
    }

    ensemble_df = assign_risk_levels(ensemble_df, prob_col="ensemble_prob")
    show_actual_vs_predicted(ensemble_df, n_samples=25)   # you can change the number

    with open(output_dir / "ensemble_config.json", "w") as f:
        json.dump(ensemble_config, f, indent=2)

    print("All artifacts saved: xgb_model.pkl, lstm_model.h5, scaler.pkl, feature_order.json, window_size.txt, ensemble_config.json")
    print("Pipeline complete.")


if __name__ == "__main__":
    main()