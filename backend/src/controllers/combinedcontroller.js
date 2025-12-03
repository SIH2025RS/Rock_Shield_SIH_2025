const demService = require('../services/demservice');
const weatherService = require('../services/weatherservice');
const iotService = require('../services/iotservice');

exports.getCombined = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const sensor_id = req.query.sensor_id;
  if (Number.isNaN(lat) || Number.isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const [dem, weather, sensor] = await Promise.all([
      demService.fetchAndStoreDem(lat, lon),
      weatherService.fetchAndStoreWeather(lat, lon),
      sensor_id ? iotService.getLatestForSensor(sensor_id) : Promise.resolve(null),
    ]);
    res.json({ dem, weather, sensor });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
