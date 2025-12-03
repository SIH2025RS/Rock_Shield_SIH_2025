const demService = require('../services/demservice');

exports.getDem = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const data = await demService.fetchAndStoreDem(lat, lon);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
