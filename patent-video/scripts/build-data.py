"""Build every number the video shows from the real models and datasets.

Run with the ML service venv (has pandas, scikit-learn, xgboost 3.0.5, tensorflow):
  ../ai-ml/ml-service/.venv/bin/python -I scripts/build-data.py

Writes public/data/*.json. Nothing in the video is hand-typed: metrics, the example event
window, sensor sparklines and the preprocessing before/after all come from here.
"""
import json
import os
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SYSTEM = REPO / "ai-ml" / "rockfall-prediction-system"
DATA = SYSTEM / "Datasets"
MODELS = SYSTEM / "Models"
OUT = ROOT / "public" / "data"

CFG = json.loads((MODELS / "ensemble_config.json").read_text())
XGB_F, LSTM_F, W = CFG["xgb_features"], CFG["lstm_features"], CFG["window_size"]
SAFE, WARN = CFG["alert_thresholds"]["safe"], CFG["alert_thresholds"]["warning"]
INTERVAL_MIN = 5


def write(name: str, obj) -> None:
    (OUT / name).write_text(json.dumps(obj, indent=1, default=float) + "\n")
    print(f"  wrote public/data/{name}")


def r(x, n=4):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), n)


def level(score: float) -> str:
    return "LOW" if score < SAFE else ("MEDIUM" if score < WARN else "HIGH")


def parse_pipeline(s: pd.Series) -> pd.Series:
    """What ModelPipeline/lstm_xgb_ensemble2.py does. It swaps day/month for ISO dates on days 1-12."""
    return pd.to_datetime(s, format="mixed", dayfirst=True)


def parse_correct(s: pd.Series) -> pd.Series:
    """The files mix ISO ('2025-09-05 10:00:00') and day-first ('05-09-2025 10:00') timestamps."""
    s = s.astype(str)
    iso = s.str.match(r"^\d{4}-\d{2}-\d{2}")
    out = pd.Series(pd.NaT, index=s.index, dtype="datetime64[ns]")
    out[iso] = pd.to_datetime(s[iso], format="%Y-%m-%d %H:%M:%S")
    out[~iso] = pd.to_datetime(s[~iso], format="%d-%m-%Y %H:%M")
    return out


def load_merged(parse) -> pd.DataFrame:
    """Same merge as the training pipeline: patches + weather (timestamp) + DEM (patch_id)."""
    weather = pd.read_csv(DATA / "weather_with_TWI_realistic.csv")
    weather["timestamp"] = parse(weather["timestamp"])
    dem = pd.read_csv(DATA / "dem_features_from_rasters_realistic.csv")
    parts = []
    for i in range(1, 6):
        df = pd.read_csv(DATA / f"rockfall_patch_JH-UG-0{i}_realistic_processed.csv")
        df["timestamp"] = parse(df["timestamp"])
        df = df.sort_values("timestamp").merge(weather, on="timestamp", how="left").merge(dem, on="patch_id", how="left")
        parts.append(df)
    return pd.concat(parts, ignore_index=True).sort_values(["patch_id", "timestamp"]).reset_index(drop=True)


def score(full: pd.DataFrame, xgb, scaler, lstm) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Score the last 20% of each patch the way the training pipeline evaluates it."""
    test = pd.concat([g.iloc[int(len(g) * 0.8):] for _, g in full.groupby("patch_id")]).reset_index(drop=True)
    test["xgb"] = xgb.predict_proba(test[XGB_F].astype(np.float32))[:, 1]
    windows, ends = [], []
    for _, g in test.groupby("patch_id"):
        v = g[LSTM_F].fillna(0).values.astype(np.float32)
        for k in range(len(g) - W + 1):
            windows.append(v[k:k + W])
            ends.append(g.index[k + W - 1])
    X = np.array(windows)
    Xs = scaler.transform(X.reshape(-1, X.shape[-1])).reshape(X.shape)
    test["lstm"] = np.nan
    test.loc[ends, "lstm"] = lstm.predict(Xs, verbose=0, batch_size=1024)[:, 0]
    scored = test.dropna(subset=["lstm"]).copy()
    scored["ensemble"] = CFG["xgb_weight"] * scored["xgb"] + CFG["lstm_weight"] * scored["lstm"]
    return test, scored


def score_every_row(full: pd.DataFrame, xgb, scaler, lstm) -> pd.DataFrame:
    """Ensemble score for every row that has a full LSTM window, in time order."""
    out = full.copy()
    out["xgb"] = xgb.predict_proba(out[XGB_F].astype(np.float32))[:, 1]
    windows, ends = [], []
    for _, g in out.groupby("patch_id"):
        v = g[LSTM_F].fillna(0).values.astype(np.float32)
        for k in range(len(g) - W + 1):
            windows.append(v[k:k + W])
            ends.append(g.index[k + W - 1])
    X = np.array(windows)
    Xs = scaler.transform(X.reshape(-1, X.shape[-1])).reshape(X.shape)
    out["lstm"] = np.nan
    out.loc[ends, "lstm"] = lstm.predict(Xs, verbose=0, batch_size=2048)[:, 0]
    out = out.dropna(subset=["lstm"]).copy()
    out["ensemble"] = CFG["xgb_weight"] * out["xgb"] + CFG["lstm_weight"] * out["lstm"]
    return out


def aucs(test: pd.DataFrame, scored: pd.DataFrame) -> dict:
    y_w = scored["rockfall_label"].astype(int)
    return {
        "xgbAuc": r(roc_auc_score(test["rockfall_label"].astype(int), test["xgb"])),
        "lstmAuc": r(roc_auc_score(y_w, scored["lstm"])),
        "ensembleAuc": r(roc_auc_score(y_w, scored["ensemble"])),
        "testRows": int(len(test)),
        "testFrom": test["timestamp"].min().strftime("%Y-%m-%d"),
        "testTo": test["timestamp"].max().strftime("%Y-%m-%d"),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    import joblib
    from tensorflow import keras

    xgb = joblib.load(MODELS / "xgb_model.pkl")
    scaler = joblib.load(MODELS / "scaler.pkl")
    lstm = keras.models.load_model(MODELS / "lstm_model.h5")

    # Metrics two ways: the training pipeline's own held-out split (its day/month parsing
    # scrambles the time order), and a correctly time-ordered last 20% per patch.
    pipe_test, pipe_scored = score(load_merged(parse_pipeline), xgb, scaler, lstm)
    full = load_merged(parse_correct)
    test, scored = score(full, xgb, scaler, lstm)
    metrics = {
        "dataset": "simulated (synthetic) sensor dataset modelled on Jharia JH-UG-01..05",
        "pipelineSplit": {"description": "held-out 20% exactly as the training pipeline selects it", **aucs(pipe_test, pipe_scored)},
        "timeOrderedSplit": {"description": "last 20% of each patch after correct timestamp parsing", **aucs(test, scored)},
        "weights": {"xgb": CFG["xgb_weight"], "lstm": CFG["lstm_weight"]},
        "thresholds": {"safe": SAFE, "warning": WARN},
    }
    write("metrics.json", metrics)

    # Example event window (system behaviour, not accuracy): in true time order the held-out
    # week only de-escalates, so search the whole simulated dataset, scored by the same models,
    # for a genuine LOW -> MEDIUM -> HIGH escalation.
    every = score_every_row(full, xgb, scaler, lstm)
    best = None
    for pid, g in every.groupby("patch_id"):
        lv = "".join(level(x)[0] for x in g["ensemble"].values)
        for k in range(11, len(lv) - 1):
            # k is the last step of a LOW stretch at least 12 steps long
            if lv[k - 11:k + 1] != "L" * 12 or lv[k + 1] == "L":
                continue
            j = lv.find("H" * 6, k + 1, k + 90)
            if j == -1:
                continue
            start = max(k - 11, j - 40)
            middle = lv[k + 1:j]
            reversals = sum(1 for a, b in zip(lv[start:j + 12], lv[start + 1:j + 12]) if "LMH".index(b) < "LMH".index(a))
            quality = min(middle.count("M"), 20) - 3 * reversals
            if best is None or quality > best[0]:
                best = (quality, g.iloc[start:j + 12])
    if best is None:
        raise SystemExit("No LOW->MEDIUM->HIGH escalation found")
    seg = best[1]
    steps = []
    for _, row in seg.iterrows():
        steps.append({
            "t": row["timestamp"].strftime("%Y-%m-%d %H:%M"),
            "xgb": r(row["xgb"]), "lstm": r(row["lstm"]), "ensemble": r(row["ensemble"]),
            "level": level(row["ensemble"]),
            "label": int(row["rockfall_label"]), "failure": int(row["rockfall_label_original"]),
            "sensors": {k: r(row[k], 3) for k in ["fs", "pore_pressure_kpa", "strain_microstrain", "displacement_mm", "vibration_hz", "rain_A24"]},
        })
    first_high = next(i for i, s in enumerate(steps) if s["level"] == "HIGH")
    write("event-timeline.json", {
        "patch": seg["location_id"].iloc[0], "intervalMinutes": INTERVAL_MIN,
        "source": "example sequence from the simulated dataset, scored by the prototype's XGBoost + LSTM ensemble",
        "firstMedium": next(i for i, s in enumerate(steps) if s["level"] == "MEDIUM"),
        "firstHigh": first_high, "steps": steps,
    })

    # One real reading for the method walkthrough (claim 18): the first HIGH step
    row = seg.iloc[first_high]
    write("reading.json", {
        "patch": row["location_id"], "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M"),
        "raw": {k: r(row[k], 3) for k in ["pore_pressure_kpa", "strain_microstrain", "displacement_mm", "vibration_hz", "methane_ppm", "temperature_c", "humidity_pct", "rain_A24"]},
        "xgbFeatures": len(XGB_F), "lstmFeatures": len(LSTM_F), "window": W,
        "xgb": r(row["xgb"]), "lstm": r(row["lstm"]), "ensemble": r(row["ensemble"]), "level": level(row["ensemble"]),
    })

    # Sensor sparklines (claim 2) from one patch + weather, 144 points = 12 h
    p1 = full[full["patch_id"] == 1].iloc[2000:2144]
    sensors = [
        ("Pore pressure", "pore_pressure_kpa", "kPa"), ("Strain", "strain_microstrain", "µε"),
        ("Displacement", "displacement_mm", "mm"), ("Vibration", "vibration_hz", "Hz"),
        ("Methane", "methane_ppm", "ppm"), ("Carbon monoxide", "co_ppm", "ppm"),
        ("Temperature", "temperature_c", "°C"), ("Humidity", "humidity_pct", "%"),
        ("Dust", "dust_ugm3", "µg/m³"), ("Airflow", "airflow_mps", "m/s"),
        ("Rainfall (24 h)", "rain_A24", "mm"),
    ]
    write("sensors.json", [{"name": n, "column": c, "unit": u, "values": [r(v, 3) for v in p1[c]]} for n, c, u in sensors])

    # Preprocessing before/after (claim 4): raw 1-min data with gaps vs the cleaned output
    raw = pd.read_csv(DATA / "raw sensor data" / "raw_sensor_data_generated.csv")
    clean = pd.read_csv(DATA / "raw sensor data" / "clean_preprocessed_sensor_data.csv")
    col, a, b = "vibration_hz", 600, 780
    idx = LSTM_F.index(col)
    mean, scale = float(scaler.mean_[idx]), float(scaler.scale_[idx])
    filled = raw[col].ffill().bfill()
    write("preprocess-sample.json", {
        "column": col, "unit": "Hz", "intervalMinutes": 1,
        "raw": [r(v, 3) for v in raw[col].iloc[a:b]],
        "filled": [r(v, 3) for v in filled.iloc[a:b]],
        "clean": [r(v, 3) for v in clean[col].iloc[a:b]],
        "normalized": [r((v - mean) / scale, 3) for v in clean[col].iloc[a:b]],
        "missingShare": r(raw[col].isna().mean(), 3),
        "rows": int(len(raw)),
    })

    write("dataset.json", {
        "patches": int(full["patch_id"].nunique()), "rowsPerPatch": int(len(full) // full["patch_id"].nunique()),
        "intervalMinutes": INTERVAL_MIN,
        "from": full["timestamp"].min().strftime("%Y-%m-%d"), "to": full["timestamp"].max().strftime("%Y-%m-%d"),
        "lat": r(full["latitude"].mean(), 4), "lon": r(full["longitude"].mean(), 4),
        "patchCoords": [{"id": g["location_id"].iloc[0], "lat": r(g["latitude"].mean(), 5), "lon": r(g["longitude"].mean(), 5)} for _, g in full.groupby("patch_id")],
        "xgbFeatures": XGB_F, "lstmFeatures": LSTM_F, "window": W,
    })
    print(f"  example window: {steps[0]['t']} -> {steps[-1]['t']} on {seg['location_id'].iloc[0]}, "
          f"MEDIUM at step {next(i for i, s in enumerate(steps) if s['level'] == 'MEDIUM')}, HIGH at step {first_high}")


if __name__ == "__main__":
    main()
