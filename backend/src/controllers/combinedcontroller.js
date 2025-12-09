const demService = require("../services/demservice");
const weatherService = require("../services/weatherservice");
const iotService = require("../services/iotservice");

exports.getCombined = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const sensor_id = req.query.sensor_id;
  if (Number.isNaN(lat) || Number.isNaN(lon))
    return res.status(400).json({ error: "lat and lon required" });
  try {
    // Fetch weather and sensor data (required)
    const [weather, sensor] = await Promise.all([
      weatherService.fetchAndStoreWeather(lat, lon),
      sensor_id
        ? iotService.getLatestForSensor(sensor_id)
        : Promise.resolve(null),
    ]);

    // Fetch DEM data (optional - don't fail if it errors)
    let dem = null;
    try {
      dem = await demService.fetchAndStoreDem(lat, lon);
    } catch (demErr) {
      console.warn(
        "DEM fetch optional - continuing without it:",
        demErr.message
      );
    }

    res.json({ dem, weather, sensor });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
