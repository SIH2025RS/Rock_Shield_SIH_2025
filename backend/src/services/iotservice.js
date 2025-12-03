const pool = require('../db/pool');

async function addSensorData({ sensor_id, lat = null, lon = null, payload = {}, measured_at = null }) {
  const text = 'INSERT INTO iot_sensor_data(sensor_id, lat, lon, payload, measured_at) VALUES($1,$2,$3,$4,COALESCE($5, now())) RETURNING *';
  const values = [sensor_id, lat, lon, payload, measured_at];
  const { rows } = await pool.query(text, values);
  return rows[0];
}

async function getSensorData(sensor_id, limit = 100) {
  const text = 'SELECT * FROM iot_sensor_data WHERE sensor_id = $1 ORDER BY measured_at DESC LIMIT $2';
  const { rows } = await pool.query(text, [sensor_id, limit]);
  return rows;
}

async function getLatestForSensor(sensor_id) {
  const text = 'SELECT * FROM iot_sensor_data WHERE sensor_id = $1 ORDER BY measured_at DESC LIMIT 1';
  const { rows } = await pool.query(text, [sensor_id]);
  return rows[0] || null;
}

module.exports = { addSensorData, getSensorData, getLatestForSensor };
