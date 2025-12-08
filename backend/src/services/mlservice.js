const axios = require('axios');
const config = require('../config/config');

function getBaseUrl() {
  const base = (config.ai.baseUrl || '').trim();
  return base || 'http://localhost:8001';
}

async function predict(packet) {
  const url = getBaseUrl().replace(/\/$/, '') + '/predict';
  const { data } = await axios.post(url, packet, { timeout: 15000 });
  return data;
}

async function health() {
  const url = getBaseUrl().replace(/\/$/, '') + '/health';
  try {
    const { data } = await axios.get(url, { timeout: 5000 });
    return data;
  } catch (e) {
    return { status: 'down' };
  }
}

module.exports = { predict, health };
