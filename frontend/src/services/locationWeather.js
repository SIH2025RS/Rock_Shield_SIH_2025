/**
 * Location and Weather Service
 * Provides utilities for working with coordinates and weather data
 */

/**
 * Search for locations using Nominatim (OpenStreetMap)
 * @param {string} query - Location search query
 * @returns {Promise<Array>} Array of location results
 */
export const searchLocations = async (query) => {
  if (!query) return []
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    )
    if (!response.ok) throw new Error('Search failed')
    return await response.json()
  } catch (error) {
    console.error('Location search error:', error)
    return []
  }
}

/**
 * Fetch weather data for given coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Weather data object
 */
export const fetchWeatherData = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,weather_code`
    )
    if (!response.ok) throw new Error('Weather fetch failed')
    const data = await response.json()
    return data.current
  } catch (error) {
    console.error('Weather fetch error:', error)
    return null
  }
}

/**
 * Get extended weather data with hourly and daily forecasts
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Extended weather data
 */
export const fetchExtendedWeatherData = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum`
    )
    if (!response.ok) throw new Error('Extended weather fetch failed')
    return await response.json()
  } catch (error) {
    console.error('Extended weather fetch error:', error)
    return null
  }
}

/**
 * Convert weather code to description (WMO codes)
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
export const getWeatherDescription = (code) => {
  if (code === 0) return 'Clear sky'
  if (code >= 1 && code <= 3) return 'Partly cloudy'
  if (code >= 45 && code <= 48) return 'Fog'
  if (code >= 51 && code <= 67) return 'Drizzle / Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Unknown'
}

/**
 * Format coordinates for API requests
 * @param {Object} coords - Coordinates object { lat, lon }
 * @returns {Object} Formatted coordinates
 */
export const formatCoordinates = (coords) => {
  return {
    latitude: parseFloat(coords.lat).toFixed(6),
    longitude: parseFloat(coords.lon).toFixed(6),
    lat: parseFloat(coords.lat),
    lon: parseFloat(coords.lon)
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Send location and weather data to backend for ML prediction
 * @param {Object} coords - Coordinates { lat, lon }
 * @param {Object} weather - Weather data object
 * @param {string} endpoint - Backend endpoint URL
 * @returns {Promise<Object>} Prediction response
 */
export const sendToMLModel = async (coords, weather, endpoint) => {
  try {
    const payload = {
      latitude: coords.lat,
      longitude: coords.lon,
      temperature: weather?.temperature_2m,
      humidity: weather?.relative_humidity_2m,
      wind_speed: weather?.wind_speed_10m,
      weather_code: weather?.weather_code,
      timestamp: new Date().toISOString()
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('ML request failed')
    return await response.json()
  } catch (error) {
    console.error('ML model request error:', error)
    return null
  }
}

/**
 * Get reverse geocoding (coordinates to address)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Address information
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    )
    if (!response.ok) throw new Error('Reverse geocoding failed')
    return await response.json()
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
