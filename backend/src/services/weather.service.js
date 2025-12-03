const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config/config');

async function fetchAndStoreWeather(lat, lon) {
  const url = config.weather.baseUrl;
  let temperature = null, windspeed = null, weathercode = null;
  try {
    const resp = await axios.get(url, { params: { latitude: lat, longitude: lon, current_weather: true }, timeout: 10000 });
    if (resp.data && resp.data.current_weather) {
      const cw = resp.data.current_weather;
      temperature = cw.temperature;
      windspeed = cw.windspeed;
      weathercode = cw.weathercode;
    } else {
      throw new Error('No weather data');
    }
  } catch (err) {
    throw new Error('Weather fetch failed');
  }

  const insert = 'INSERT INTO weather_data(lat, lon, temperature, windspeed, weathercode) VALUES($1,$2,$3,$4,$5) RETURNING *';
  const { rows } = await pool.query(insert, [lat, lon, temperature, windspeed, weathercode]);
  return rows[0];
}

module.exports = { fetchAndStoreWeather };
