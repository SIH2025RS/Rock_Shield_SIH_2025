import os
import json
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'rockfall-prediction-system', 'Models'))

# Model availability flags
XGB_AVAILABLE = False
LSTM_AVAILABLE = False
ENSEMBLE_CONFIG = None

# Model artifacts
_xgb = None
_lstm = None
_scaler = None
_feature_order: List[str] = []
_xgb_features: List[str] = []
_lstm_features: List[str] = []

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'your_auth_token')
TWILIO_FROM_NUMBER = os.environ.get('TWILIO_FROM_NUMBER', '+1234567890')
TWILIO_TO_NUMBER = os.environ.get('TWILIO_TO_NUMBER', '+0987654321')

def send_sms_alert(risk_score: float, action: str):
    """Send SMS alert using Twilio to multiple recipients."""
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Parse multiple numbers (comma separated)
        to_numbers = [num.strip() for num in TWILIO_TO_NUMBER.split(',') if num.strip()]
        
        message_body = (
            f"⚠ HIGH RISK ROCKFALL ALERT ⚠\n"
            f"Risk Score: {risk_score:.2f}\n"
            f"Action: {action}\n"
            f"Please check the dashboard immediately."
        )
        
        for number in to_numbers:
            try:
                message = client.messages.create(
                    body=message_body,
                    from_=TWILIO_FROM_NUMBER,
                    to=number
                )
                print(f"✓ SMS Alert sent to {number}: {message.sid}")
            except Exception as inner_e:
                 print(f"⚠ Failed to send SMS to {number}: {inner_e}")
                 
    except Exception as e:
        print(f"⚠ Failed to initialize Twilio client: {e}")

# Try to load ensemble configuration
try:
    config_path = os.path.join(MODELS_DIR, 'ensemble_config.json')
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            ENSEMBLE_CONFIG = json.load(f)
        _xgb_features = ENSEMBLE_CONFIG.get('xgb_features', [])
        _lstm_features = ENSEMBLE_CONFIG.get('lstm_features', [])
        print(f"✓ Ensemble config loaded: {len(_xgb_features)} XGB features, {len(_lstm_features)} LSTM features")
except Exception as e:
    print(f"⚠ Failed to load ensemble config: {e}")

# Try to load XGBoost model
try:
    xgb_path = os.path.join(MODELS_DIR, 'xgb_model.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'scaler.pkl')
    feat_path = os.path.join(MODELS_DIR, 'feature_order.json')
    
    if os.path.exists(xgb_path) and os.path.exists(scaler_path) and os.path.exists(feat_path):
        _xgb = joblib.load(xgb_path)
        _scaler = joblib.load(scaler_path)
        with open(feat_path, 'r') as f:
            _feature_order = json.load(f)
        XGB_AVAILABLE = True
        print(f"✓ XGBoost model loaded with {len(_feature_order)} features")
except Exception as e:
    print(f"⚠ Failed to load XGBoost model: {e}")
    XGB_AVAILABLE = False

# Try to load LSTM model
try:
    from tensorflow import keras
    lstm_path = os.path.join(MODELS_DIR, 'lstm_model.h5')
    
    if os.path.exists(lstm_path):
        _lstm = keras.models.load_model(lstm_path)
        LSTM_AVAILABLE = True
        print(f"✓ LSTM model loaded")
except Exception as e:
    print(f"⚠ Failed to load LSTM model: {e}")
    LSTM_AVAILABLE = False


class PredictRequest(BaseModel):
    sensor_data: Optional[List[Dict[str, Any]]] = None  # Historical sensor readings for LSTM
    weather: Optional[Dict[str, Any]] = None
    dem: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, Any]] = None  # Feature dict instead of flat array


class PredictResponse(BaseModel):
    risk_score: float
    klass: str
    explainability: Dict[str, Any]
    recommended_action: str
    model_name: str
    confidence: Optional[float] = None
    ensemble_details: Optional[Dict[str, Any]] = None  # XGB + LSTM contributions


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'xgb_loaded': XGB_AVAILABLE,
        'lstm_loaded': LSTM_AVAILABLE,
        'ensemble_enabled': XGB_AVAILABLE and LSTM_AVAILABLE,
        'model_name': 'ensemble' if (XGB_AVAILABLE and LSTM_AVAILABLE) else ('xgboost' if XGB_AVAILABLE else 'heuristic')
    }


def _extract_features(payload: PredictRequest, feature_list: List[str]) -> Dict[str, float]:
    """Extract features from payload and return as dict."""
    features = {}
    
    # If features dict provided directly, use it
    if payload.features:
        features.update(payload.features)
    
    # Extract from sensor_data (latest reading)
    if payload.sensor_data and len(payload.sensor_data) > 0:
        sensor = payload.sensor_data[0]  # Most recent
        for key in feature_list:
            if key in sensor and key not in features:
                features[key] = float(sensor.get(key, 0.0))
    
    # Extract from weather
    if payload.weather:
        for key in feature_list:
            if key in payload.weather and key not in features:
                features[key] = float(payload.weather.get(key, 0.0))
    
    # Extract from DEM
    if payload.dem:
        for key in feature_list:
            if key in payload.dem and key not in features:
                features[key] = float(payload.dem.get(key, 0.0))
    
    # Extract from metadata
    if payload.metadata:
        for key in feature_list:
            if key in payload.metadata and key not in features:
                features[key] = float(payload.metadata.get(key, 0.0))
    
    return features


def _create_feature_vector(features: Dict[str, float], feature_list: List[str]) -> np.ndarray:
    """Create ordered feature vector from feature dict."""
    vector = []
    missing = []
    
    for feature_name in feature_list:
        if feature_name in features:
            vector.append(features[feature_name])
        else:
            vector.append(0.0)  # Default to 0 for missing features
            missing.append(feature_name)
    
    if missing:
        print(f"⚠ Missing features ({len(missing)}): {missing[:5]}...")  # Show first 5
    
    return np.array(vector, dtype=np.float32).reshape(1, -1)


def _create_lstm_window(payload: PredictRequest, feature_list: List[str], window_size: int = 8) -> np.ndarray:
    """Create windowed sequence for LSTM from historical sensor data."""
    
    if not payload.sensor_data or len(payload.sensor_data) < window_size:
        print(f"⚠ Insufficient data for LSTM: need {window_size}, got {len(payload.sensor_data or [])}")
        # Pad with zeros if insufficient data
        window = np.zeros((window_size, len(feature_list)), dtype=np.float32)
        
        if payload.sensor_data:
            for i, reading in enumerate(payload.sensor_data[:window_size]):
                features = _extract_features(
                    PredictRequest(sensor_data=[reading], weather=payload.weather, dem=payload.dem),
                    feature_list
                )
                for j, feat_name in enumerate(feature_list):
                    window[i, j] = features.get(feat_name, 0.0)
        
        return window.reshape(1, window_size, len(feature_list))
    
    # Create window from historical data
    window = []
    for reading in payload.sensor_data[:window_size]:  # Take first window_size readings
        features = _extract_features(
            PredictRequest(sensor_data=[reading], weather=payload.weather, dem=payload.dem),
            feature_list
        )
        row = [features.get(feat, 0.0) for feat in feature_list]
        window.append(row)
    
    return np.array(window, dtype=np.float32).reshape(1, window_size, len(feature_list))


def _predict_xgboost(payload: PredictRequest) -> Dict[str, Any]:
    """Run XGBoost prediction (no scaling - use raw features)."""
    try:
        features = _extract_features(payload, _xgb_features)
        X = _create_feature_vector(features, _xgb_features)
        
        # XGBoost uses raw features (no scaling)
        # Predict
        if hasattr(_xgb, 'predict_proba'):
            prob = _xgb.predict_proba(X)
            score = float(prob[0, 1]) if prob.ndim == 2 and prob.shape[1] > 1 else float(prob[0])
        else:
            y = _xgb.predict(X)
            score = float(1 / (1 + np.exp(-float(y[0]))))  # Sigmoid
        
        score = max(0.0, min(1.0, score))
        
        return {
            'score': score,
            'features_used': len([f for f in features.values() if f != 0.0]),
            'total_features': len(_xgb_features)
        }
    except Exception as e:
        print(f"✗ XGBoost prediction failed: {e}")
        return {'score': 0.0, 'error': str(e)}


def _predict_lstm(payload: PredictRequest) -> Dict[str, Any]:
    """Run LSTM prediction (with scaling)."""
    try:
        window_size = ENSEMBLE_CONFIG.get('window_size', 8) if ENSEMBLE_CONFIG else 8
        X_window = _create_lstm_window(payload, _lstm_features, window_size)
        
        # Scale LSTM window if scaler available
        if _scaler is not None:
            # Reshape for scaling: (1, window_size, features) -> (window_size, features)
            X_window_2d = X_window.reshape(-1, X_window.shape[-1])
            X_window_scaled_2d = _scaler.transform(X_window_2d)
            # Reshape back: (window_size, features) -> (1, window_size, features)
            X_window_scaled = X_window_scaled_2d.reshape(1, window_size, -1)
        else:
            X_window_scaled = X_window
        
        # Predict
        prediction = _lstm.predict(X_window_scaled, verbose=0)
        score = float(prediction[0, 0]) if prediction.ndim == 2 else float(prediction[0])
        score = max(0.0, min(1.0, score))
        
        return {
            'score': score,
            'window_size': window_size,
            'features_per_step': len(_lstm_features)
        }
    except Exception as e:
        print(f"✗ LSTM prediction failed: {e}")
        return {'score': 0.0, 'error': str(e)}


def _ensemble_predict(payload: PredictRequest) -> Dict[str, Any]:
    """Run ensemble prediction (XGBoost + LSTM)."""
    
    xgb_weight = ENSEMBLE_CONFIG.get('xgb_weight', 0.7) if ENSEMBLE_CONFIG else 0.7
    lstm_weight = ENSEMBLE_CONFIG.get('lstm_weight', 0.3) if ENSEMBLE_CONFIG else 0.3
    
    # Get individual predictions
    xgb_result = _predict_xgboost(payload)
    lstm_result = _predict_lstm(payload)
    
    xgb_score = xgb_result.get('score', 0.0)
    lstm_score = lstm_result.get('score', 0.0)
    
    # Weighted ensemble
    ensemble_score = (xgb_weight * xgb_score) + (lstm_weight * lstm_score)
    ensemble_score = max(0.0, min(1.0, ensemble_score))
    
    # Determine risk class based on ensemble config thresholds
    thresholds = ENSEMBLE_CONFIG.get('alert_thresholds', {}) if ENSEMBLE_CONFIG else {}
    safe_threshold = thresholds.get('safe', 0.3)
    warning_threshold = thresholds.get('warning', 0.6)
    
    if ensemble_score < safe_threshold:
        klass = 'LOW'
        action = 'Continue routine monitoring'
    elif ensemble_score < warning_threshold:
        klass = 'MEDIUM'
        action = 'Increase monitoring frequency'
        # Send SMS alert for MEDIUM risk also
        send_sms_alert(ensemble_score, action)
    else:
        klass = 'HIGH'
        action = 'Immediate inspection required'
        # Send SMS alert for HIGH risk
        send_sms_alert(ensemble_score, action)
    
    return {
        'risk_score': ensemble_score,
        'klass': klass,
        'recommended_action': action,
        'model_name': 'ensemble',
        'confidence': ensemble_score,
        'ensemble_details': {
            'xgb_score': xgb_score,
            'lstm_score': lstm_score,
            'xgb_weight': xgb_weight,
            'lstm_weight': lstm_weight,
            'xgb_contribution': xgb_weight * xgb_score,
            'lstm_contribution': lstm_weight * lstm_score,
            'xgb_info': xgb_result,
            'lstm_info': lstm_result
        },
        'explainability': {
            'ensemble_calculation': f"{xgb_weight} * {xgb_score:.3f} + {lstm_weight} * {lstm_score:.3f} = {ensemble_score:.3f}",
            'thresholds': {
                'safe': f'< {safe_threshold}',
                'warning': f'< {warning_threshold}',
                'critical': f'>= {warning_threshold}'
            }
        }
    }


def _heuristic_score(payload: PredictRequest) -> Dict[str, Any]:
    """Fallback heuristic prediction when models unavailable."""
    tilt = 0.0
    vibration = 0.0
    rain = 0.0
    temp = 0.0
    elev = 0.0

    if payload.sensor_data:
        sd = payload.sensor_data[0]
        tilt = float(sd.get('tilt', sd.get('tilt_deg', 0.0)) or 0.0)
        vibration = float(sd.get('vibration', sd.get('vibration_hz', 0.0)) or 0.0)
    if payload.weather:
        rain = float(payload.weather.get('rain_A24') or payload.weather.get('rain_24hr') or 0.0)
        temp = float(payload.weather.get('temperature') or payload.weather.get('temperature_2m') or 0.0)
    if payload.dem:
        elev = float(payload.dem.get('elevation') or 0.0)

    tilt_n = min(1.0, abs(tilt) / 45.0)
    vib_n = min(1.0, vibration / 50.0)
    rain_n = min(1.0, rain / 100.0)
    elev_n = min(1.0, max(0.0, elev) / 3000.0)
    temp_n = min(1.0, max(0.0, temp) / 50.0)

    risk = 0.35 * tilt_n + 0.3 * vib_n + 0.25 * rain_n + 0.05 * elev_n + 0.05 * temp_n
    risk = float(max(0.0, min(1.0, risk)))

    klass = 'LOW'
    if risk >= 0.8:
        klass = 'HIGH'
        # Send SMS alert for HIGH risk
        send_sms_alert(risk, 'Immediate inspection required')
    elif risk >= 0.6:
        klass = 'MEDIUM'
        send_sms_alert(risk, 'Immediate inspection required')

    rec = 'Immediate inspection required' if klass == 'HIGH' else (
          'Increase monitoring frequency' if klass == 'MEDIUM' else 'Continue routine monitoring')

    explain = {
        'factors': {
            'tilt': round(tilt_n, 3),
            'vibration': round(vib_n, 3),
            'rain': round(rain_n, 3),
            'elevation': round(elev_n, 3),
            'temperature': round(temp_n, 3),
        }
    }
    return {
        'risk_score': risk,
        'klass': klass,
        'recommended_action': rec,
        'explainability': explain,
        'model_name': 'heuristic'
    }


@app.post('/predict', response_model=PredictResponse)
def predict(req: PredictRequest):
    """Main prediction endpoint - uses ensemble if available, falls back to single model or heuristic."""
    
    try:
        # Ensemble mode (both models available)
        if XGB_AVAILABLE and LSTM_AVAILABLE:
            result = _ensemble_predict(req)
            return PredictResponse(**result)
        
        # XGBoost only
        elif XGB_AVAILABLE:
            xgb_result = _predict_xgboost(req)
            score = xgb_result.get('score', 0.0)
            
            klass = 'LOW'
            if score >= 0.8:
                klass = 'HIGH'
                # Send SMS alert for HIGH risk
                send_sms_alert(score, 'Immediate inspection required')
            elif score >= 0.6:
                klass = 'MEDIUM'
                send_sms_alert(score, 'Immediate inspection required')
            
            return PredictResponse(
                risk_score=score,
                klass=klass,
                recommended_action='Immediate inspection required' if klass == 'HIGH' else (
                    'Increase monitoring frequency' if klass == 'MEDIUM' else 'Continue routine monitoring'),
                model_name='xgboost',
                confidence=score,
                explainability={'xgb_info': xgb_result}
            )
        
        # Fallback to heuristic
        else:
            result = _heuristic_score(req)
            return PredictResponse(**result, confidence=None)
    
    except Exception as e:
        print(f"✗ Prediction error: {e}")
        # Fallback to heuristic on any error
        result = _heuristic_score(req)
        return PredictResponse(**result, confidence=None)


if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', '8001'))
    uvicorn.run(app, host='0.0.0.0', port=port)
