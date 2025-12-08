const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config/config');

/**
 * Enhanced Weather Service
 * Fetches weather data from Open-Meteo including:
 * - Current temperature and humidity
 * - Aggregated rainfall (24h, 72h, 168h)
 * - Additional meteorological parameters
 */

/**
 * Fetch hourly weather data for rainfall aggregation
 */
async function fetchHourlyWeather(lat, lon, hours = 168) {
  const url = 'https://api.open-meteo.com/v1/forecast';

  try {
    const resp = await axios.get(url, {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: 'temperature_2m,relative_humidity_2m,precipitation',
        past_hours: hours,
        timezone: 'auto'
      },
      timeout: 10000
    });

    if (!resp.data || !resp.data.hourly) {
      throw new Error('No hourly weather data');
    }

    return resp.data.hourly;
  } catch (err) {
    console.error('Hourly weather fetch failed:', err.message);
    throw new Error('Hourly weather fetch failed');
  }
}

/**
 * Aggregate rainfall over specified hours
 */
function aggregateRainfall(hourlyPrecipitation, hours) {
  if (!Array.isArray(hourlyPrecipitation)) {
    return 0;
  }

  // Take last N hours
  const recentData = hourlyPrecipitation.slice(-hours);

  // Sum precipitation, treating null as 0
  const total = recentData.reduce((sum, val) => {
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);

  return total;
}

/**
 * Fetch current weather data
 */
async function fetchCurrentWeather(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast';

  try {
    const resp = await axios.get(url, {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
        current: 'temperature_2m,relative_humidity_2m,precipitation',
        timezone: 'auto'
      },
      timeout: 10000
    });

    if (!resp.data) {
      throw new Error('No current weather data');
    }

    return resp.data;
  } catch (err) {
    console.error('Current weather fetch failed:', err.message);
    throw new Error('Current weather fetch failed');
  }
}

/**
 * Fetch and store enhanced weather data with rainfall aggregation
 */
async function fetchAndStoreWeatherEnhanced(lat, lon) {
  try {
    // Fetch hourly data for rainfall aggregation (past 7 days = 168 hours)
    const hourlyData = await fetchHourlyWeather(lat, lon, 168);

    // Fetch current weather
    const currentData = await fetchCurrentWeather(lat, lon);

    // Extract current conditions
    const current = currentData.current || currentData.current_weather || {};
    const weather_temperature = current.temperature_2m || current.temperature || null;
    const weather_humidity = current.relative_humidity_2m || null;
    const weathercode = current.weathercode || null;
    const windspeed = current.windspeed || current.wind_speed_10m || null;

    // Calculate rainfall aggregations
    const rain_A24 = aggregateRainfall(hourlyData.precipitation, 24);   // Last 24 hours
    const rain_A72 = aggregateRainfall(hourlyData.precipitation, 72);   // Last 72 hours (3 days)
    const rain_A168 = aggregateRainfall(hourlyData.precipitation, 168); // Last 168 hours (7 days)

    console.log(`[Weather] Calculated aggregations at (${lat}, ${lon}):`);
    console.log(`  temp=${weather_temperature}, humidity=${weather_humidity}, windspeed=${windspeed}`);
    console.log(`  rain_24h=${rain_A24}, rain_72h=${rain_A72}, rain_168h=${rain_A168}`);

    // Note: TWI_dynamic is calculated in DEM service as it requires terrain data

    // Store in database
    const insert = `
      INSERT INTO weather_data(
        lat, lon, temperature, humidity, windspeed, weathercode,
        rain_24h, rain_72h, rain_168h, fetched_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) 
      RETURNING *
    `;

    const { rows } = await pool.query(insert, [
      lat, lon, weather_temperature, weather_humidity, windspeed, weathercode,
      rain_A24, rain_A72, rain_A168
    ]);
    
    console.log(`[Weather] Inserted row into DB:`, rows[0]);

    return {
      weather_temperature,
      weather_humidity,
      windspeed,
      weathercode,
      rain_A24,
      rain_A72,
      rain_A168,
      ...rows[0]
    };

  } catch (err) {
    console.error('Enhanced weather fetch failed:', err.message);
    throw new Error('Weather fetch failed: ' + err.message);
  }
}

/**
 * Legacy function for backward compatibility
 */
async function fetchAndStoreWeather(lat, lon) {
  try {
    // Use enhanced version but return old format for compatibility
    const data = await fetchAndStoreWeatherEnhanced(lat, lon);
    return {
      temperature: data.weather_temperature,
      windspeed: data.windspeed,
      weathercode: data.weathercode,
      ...data
    };
  } catch (err) {
    // Fallback to basic current weather
    try {
      const url = 'https://api.open-meteo.com/v1/forecast';
      const resp = await axios.get(url, {
        params: { latitude: lat, longitude: lon, current_weather: true },
        timeout: 10000
      });

      if (resp.data && resp.data.current_weather) {
        const cw = resp.data.current_weather;
        const insert = 'INSERT INTO weather_data(lat, lon, temperature, windspeed, weathercode) VALUES($1,$2,$3,$4,$5) RETURNING *';
        const { rows } = await pool.query(insert, [lat, lon, cw.temperature, cw.windspeed, cw.weathercode]);
        return rows[0];
      }
    } catch (fallbackErr) {
      console.error('Weather fallback failed:', fallbackErr.message);
    }

    throw new Error('Weather fetch failed');
  }
}

module.exports = {
  fetchAndStoreWeather,
  fetchAndStoreWeatherEnhanced,
  fetchHourlyWeather,
  aggregateRainfall
};
