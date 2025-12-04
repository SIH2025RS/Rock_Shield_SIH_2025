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

  CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    sensor_id TEXT,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    recommended_action VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    forwarded_to_miners BOOLEAN DEFAULT false,
    forwarded_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
  CREATE INDEX IF NOT EXISTS idx_alerts_sensor ON alerts(sensor_id);

  CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    incident_type VARCHAR(50) NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    location_name VARCHAR(255),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    reported_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
  CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
  CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    assigned_to INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    location_name VARCHAR(255),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
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

