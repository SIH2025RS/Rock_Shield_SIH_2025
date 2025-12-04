const weatherService = require('../services/weatherservice');
const pool = require('../db/pool');

exports.getWeather = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const data = await weatherService.fetchAndStoreWeather(lat, lon);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/weather/latest?hubId=123 OR ?lat=..&lon=..
exports.getLatestWeather = async (req, res) => {
  try {
    const hubId = req.query.hubId ? Number(req.query.hubId) : null;
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lon = req.query.lon != null ? Number(req.query.lon) : null;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id SERIAL PRIMARY KEY,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL,
        temperature DOUBLE PRECISION,
        windspeed DOUBLE PRECISION,
        weathercode INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_weather_data_created ON weather_data(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_weather_data_location ON weather_data(lat, lon);
    `);

    let qlat = lat, qlon = lon;
    if (hubId && (!isFinite(qlat) || !isFinite(qlon))) {
      const hub = await pool.query('SELECT lat, lon FROM plant_hubs WHERE id = $1', [hubId]);
      if (!hub.rows.length) return res.status(404).json({ error: 'hub_not_found' });
      qlat = Number(hub.rows[0].lat);
      qlon = Number(hub.rows[0].lon);
    }

    let row = null;
    if (isFinite(qlat) && isFinite(qlon)) {
      const delta = 0.1; // ~11km latitude window
      const { rows } = await pool.query(
        `SELECT lat, lon, temperature, windspeed, weathercode, created_at
         FROM weather_data
         WHERE lat BETWEEN $1-$3 AND $1+$3 AND lon BETWEEN $2-$3 AND $2+$3
         ORDER BY created_at DESC
         LIMIT 1`,
        [qlat, qlon, delta]
      );
      row = rows[0] || null;
    } else {
      const { rows } = await pool.query(
        `SELECT lat, lon, temperature, windspeed, weathercode, created_at
         FROM weather_data
         ORDER BY created_at DESC
         LIMIT 1`
      );
      row = rows[0] || null;
    }

    if (!row) return res.json({ current: null, coords: { lat: qlat || null, lon: qlon || null } });

    // Map DB columns to Open‑Meteo-like keys used on the frontend
    const current = {
      temperature_2m: row.temperature,
      wind_speed_10m: row.windspeed,
      weather_code: row.weathercode,
      at: row.created_at,
    };
    const coords = { lat: row.lat, lon: row.lon };
    const current_units = { temperature_2m: '°C', wind_speed_10m: 'km/h' };
    return res.json({ current, current_units, coords, hubId: hubId || null });
  } catch (e) {
    console.error('GET /api/weather/latest error', e);
    return res.status(500).json({ error: 'failed_to_fetch_latest_weather' });
  }
};
