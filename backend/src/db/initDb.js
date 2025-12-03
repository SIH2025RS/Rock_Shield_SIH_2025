const pool = require('./pool');

async function init() {
  const sql = `
  CREATE TABLE IF NOT EXISTS dem_data (
    id SERIAL PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION NOT NULL,
    source TEXT,
    fetched_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_dem_lat_lon ON dem_data(lat, lon);

  CREATE TABLE IF NOT EXISTS iot_sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    measured_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_iot_sensor_time ON iot_sensor_data(sensor_id, measured_at DESC);

  CREATE TABLE IF NOT EXISTS weather_data (
    id SERIAL PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION,
    windspeed DOUBLE PRECISION,
    weathercode INTEGER,
    fetched_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_weather_lat_lon ON weather_data(lat, lon);

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    full_name VARCHAR(150),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `;

  try {
    await pool.query(sql);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init failed', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();

