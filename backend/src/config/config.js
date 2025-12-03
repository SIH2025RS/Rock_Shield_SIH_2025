const dotenv = require('dotenv');
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  db: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || undefined,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_NAME || undefined,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  ai: {
    baseUrl: process.env.AI_BASE_URL || '',
  },
  dem: {
    baseUrl: process.env.DEM_API_BASE_URL || 'https://api.open-elevation.com/api/v1/lookup',
    apiKey: process.env.DEM_API_KEY || '',
  },
  weather: {
    baseUrl: process.env.WEATHER_API_BASE_URL || 'https://api.open-meteo.com/v1/forecast',
    apiKey: process.env.WEATHER_API_KEY || '',
  },
};

module.exports = config;
