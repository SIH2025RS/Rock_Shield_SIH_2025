import requests
import json
import time

def test_high_alert():
    """
    Sends a prediction request with extreme values to trigger a HIGH risk alert
    and consequently a Twilio SMS.
    """
    url = "http://localhost:8001/predict"
    
    # Payload designed to force Max Normalization (1.0) for all factors
    # Formula: 0.35 + 0.3 + 0.25 + ... = > 0.8 (HIGH)
    payload = {
        "sensor_data": [{
            "tilt": 50.0,       # > 45 deg -> 1.0
            "vibration": 60.0,  # > 50 Hz -> 1.0
            "timestamp": "2024-01-01T12:00:00"
        }],
        "weather": {
            "rain_A24": 150.0,  # > 100mm -> 1.0
            "temperature": 30.0
        },
        "dem": {
            "elevation": 1000.0
        }
    }

    print("🚀 Sending HIGH RISK payload to Rock Shield ML Service...")
    print(f"Target URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Response Received:")
            print(json.dumps(data, indent=2))
            
            if data.get('klass') == 'HIGH':
                print("\n⚠️  Risk Class is HIGH. SMS should have been sent! Check your phone.")
            else:
                print(f"\n🤔 Risk Class is {data.get('klass')}. Value: {data.get('risk_score')}. Adjust payload if needed.")
        else:
            print(f"\n❌ Error: Status Code {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to the server.")
        print("Make sure the FastAPI service is running using: 'uvicorn main:app --reload --port 8001'")

if __name__ == "__main__":
    test_high_alert()
