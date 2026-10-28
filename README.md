# 🛡️ Rock Shield - Advanced Rockfall Prediction & Monitoring System

Rock Shield is a cutting-edge, AI-driven IoT solution designed to predict and monitor rockfall risks in real-time. By integrating sensor data with advanced machine learning models (XGBoost & LSTM), it provides early warnings and actionable insights to ensure safety in hazardous areas.

![Dashboard Overview](./Screenshots/Dashboard/Screenshot%202025-12-09%20170122.png)

## 🚀 Key Functionalities & Uniqueness

- **Real-Time Monitoring**: Live tracking of tilt, vibration, and environmental conditions.
- **AI-Powered Risk Prediction**: Uses an ensemble of **XGBoost** (for feature-based classification) and **LSTM** (for time-series analysis) to calculate accurate risk scores.
- **Multi-Platform Access**: seamless experience across Web (React) and Mobile (React Native/Expo).
- **Instant Alerts**: Integrated Twilio SMS system for immediate "Critical" and "High" risk alerts.
- **Scalable Architecture**: Built on a microservices-inspired architecture with a robust Node.js backend and fast Python ML service.
- **Interactive Maps**: 3D Visualization using Mapbox GL JS for intuitive location monitoring.
- **Multilingual**: This project features multilingual support for Hindi and English, Tamil, Kannad, Marathi and more.

## 🛠️ Tech Stack

### Frontend (Web)

- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **Auth**: Clerk
- **Communication**: Socket.io-client

### Mobile App

- **Framework**: React Native (Expo)
- **Navigation**: Expo Router
- **Auth**: Clerk (Expo)

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (with TimescaleDB support)
- **Real-time**: Socket.io
- **Auth**: Clerk SDK

### AI & Machine Learning

- **API**: FastAPI (Python)
- **Models**: XGBoost, TensorFlow (LSTM)
- **Data Processing**: Numpy, Pandas, Joblib
- **Notifications**: Twilio

---

## 🏗️ System Design

The system follows a modular data flow where IoT sensors transmit data to the **Nano Banana Pro** single-board computer (Edge Node). This device pre-processes readings and pushes data to the backend, which is then processed by the ML Engine for risk assessment. Results are broadcasted to the Web Dashboard and Mobile App in real-time.

![System Architecture](./Screenshots/system_architecture.jpg)

```mermaid
graph TD
    subgraph "Edge / Sensors"
        Sensors[IoT Sensors] -->|GPIO/Serial| NanoBanana[Nano Banana Pro]
        NanoBanana -->|MQTT/HTTP| Backend
    end

    subgraph "Backend Layer (Node.js)"
        Backend[Express API]
        Backend -->|Store Data| DB[(PostgreSQL + TimescaleDB)]
        Backend -->|Request Prediction| MLEngine
        Backend -->|Broadcast Updates| Clients
    end

    subgraph "AI/ML Engine (Python)"
        MLEngine[FastAPI Service]
        MLEngine -->|Load| XGB[XGBoost Model]
        MLEngine -->|Load| LSTM[LSTM Model]
        MLEngine -->|Alerts| Twilio[Twilio SMS]
    end

    subgraph "clients"
        Clients -->|Web| WebApp[React Dashboard]
        Clients -->|Mobile| MobileApp[React Native App]
    end
```

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL (v14+)

### 1. Database Setup (TimescaleDB)

The project is optimized for time-series data using TimescaleDB.

`backend/.env` connects as the `postgres` user to a database named `rock_shield`. Homebrew installs don't create a `postgres` role, so on macOS run this once:

```bash
createuser -s postgres
createdb -U postgres rock_shield
```

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert standard table to hypertable (after running backend initialization)
SELECT create_hypertable('iot_sensor_data', 'measured_at');
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run init-db  # Initialize database tables
npm start
```

#### Test accounts

When the backend starts outside production, it creates one login per role in Clerk (if missing) and assigns its role in the `users` table ([backend/src/db/seedTestAccounts.js](backend/src/db/seedTestAccounts.js)). The usernames, emails and passwords come from the `TEST_ADMIN_*`, `TEST_OPERATOR_*` and `TEST_MINER_*` variables in `backend/.env`. You can also run `npm run seed`, or set `SEED_TEST_ACCOUNTS=false` to skip it.

| Role | Username | Email | Password |
| --- | --- | --- | --- |
| System admin | `test_admin` | `admin+clerk_test@example.com` | `RockShield#Admin2025` |
| Operator | `test_operator` | `operator+clerk_test@example.com` | `RockShield#Operator2025` |
| Miner | `test_miner` | `miner+clerk_test@example.com` | `RockShield#Miner2025` |

Sign in with the username or email. If Clerk asks for a verification code (first sign-in on a new device), enter `424242`.

### 3. ML Service Setup

```bash
cd ai-ml/ml-service
pip install -r requirements.txt
python main.py
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 5. Mobile App Setup

```bash
cd rockshield-mobile
npm install
npx expo start
```

---

### Environment variables

Each service's `.env` is committed with the team's shared development keys (Clerk, Mapbox, OpenTopography, Twilio), so a fresh clone works without extra setup. The `.env.example` files list the same variables with blank values.

The one value you must change is `EXPO_PUBLIC_API_BASE_URL` in `rockshield-mobile/.env`: set it to your own computer's LAN IP (`ipconfig getifaddr en0` on macOS) so a phone on the same Wi-Fi can reach the backend. To override other values without changing the shared file, use a `.env.local` file (ignored by git). Vite and Expo read it automatically; the backend and ML service do not.

---

## 🔮 Future Plans: Edge Computing

We are actively working on moving inference closer to the source:

- **TinyML**: Deploying quantized TFLite models directly on ESP32/microcontrollers.
- **Latency Reduction**: Minimize network dependency by processing critical alerts locally on the edge device.
- **Hybrid Mode**: Edge for immediate safety cutoffs, Cloud for long-term trend analysis.

---

## 📸 More Screenshots

|                                               Mobile Alert                                               |                            Dashboard Detail                             |
| :------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------: |
| ![Alert](./Screenshots/Alert%20Notifications/WhatsApp%20Image%202025-12-09%20at%2017.04.29_783f9817.jpg) | ![Detail](./Screenshots/Dashboard/Screenshot%202025-12-09%20165931.png) |

## Acknowledgements

- **Libraries**: Mapbox, Recharts, Clerk, Expo, FastAPI, TensorFlow, XGBoost.
- **Data**: Geological survey datasets for training rockfall models.
- **Collaborators**: The entire Rock Shield development team.
