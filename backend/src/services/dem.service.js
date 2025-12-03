const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config/config');

async function fetchAndStoreDem(lat, lon) {
  const url = config.dem.baseUrl;
  let elevation;
  try {
    const resp = await axios.get(url, { params: { locations: `${lat},${lon}` }, timeout: 10000 });
    const results = resp.data && resp.data.results;
    if (!results || !results.length) throw new Error('No DEM results');
    elevation = results[0].elevation;
  } catch (err) {
    throw new Error('DEM fetch failed');
  }

  const insert = 'INSERT INTO dem_data(lat, lon, elevation, source) VALUES($1,$2,$3,$4) RETURNING *';
  const { rows } = await pool.query(insert, [lat, lon, elevation, 'api']);
  return rows[0];
}

module.exports = { fetchAndStoreDem };
