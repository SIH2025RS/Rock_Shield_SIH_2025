const iotService = require('../services/iotservice');

exports.postData = async (req, res) => {
  const { sensor_id, lat, lon, payload, measured_at } = req.body || {};
  if (!sensor_id) return res.status(400).json({ error: 'sensor_id required' });
  try {
    const data = await iotService.addSensorData({ sensor_id, lat, lon, payload, measured_at });
    res.status(201).json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getData = async (req, res) => {
  const { sensor_id, limit } = req.query;
  if (!sensor_id) return res.status(400).json({ error: 'sensor_id required' });
  const lim = Math.min(parseInt(limit) || 100, 1000);
  try {
    const data = await iotService.getSensorData(sensor_id, lim);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getLatest = async (req, res) => {
  const sensor_id = req.params.sensor_id || req.query.sensor_id;
  if (!sensor_id) return res.status(400).json({ error: 'sensor_id required' });
  try {
    const data = await iotService.getLatestForSensor(sensor_id);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
