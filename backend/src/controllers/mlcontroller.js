const pool = require('../db/pool');
const iotService = require('../services/iotservice');
const demService = require('../services/demservice');
const weatherService = require('../services/weatherservice');
const csvDataService = require('../services/csvdataservice');
const mlService = require('../services/mlservice');

/**
 * Enhanced ML Controller for Ensemble Prediction
 * Orchestrates data collection from multiple sources and calls ML service
 */

function pickCoord(body, sensorRows) {
  const blat = parseFloat(body?.lat);
  const blon = parseFloat(body?.lon);
  if (Number.isFinite(blat) && Number.isFinite(blon)) return { lat: blat, lon: blon };
  const latest = Array.isArray(sensorRows) && sensorRows.length ? sensorRows[0] : null;
  if (latest && Number.isFinite(latest.lat) && Number.isFinite(latest.lon)) return { lat: latest.lat, lon: latest.lon };
  return { lat: null, lon: null };
}

exports.health = async (req, res) => {
  try {
    const h = await mlService.health();
    res.json(h);
  } catch (e) {
    res.status(500).json({ status: 'down' });
  }
};

/**
 * Enhanced predict endpoint for ensemble model
 * Collects data from CSV, DEM API, Weather API and sensor database
 */
exports.predict = async (req, res) => {
  const {
    sensorId,
    locationId,
    timeRange,
    limit,
    features,
    sensorData  // Can be passed directly from frontend
  } = req.body || {};

  try {
    // Step 1: Get historical sensor data for LSTM windowing
    let historicalData = [];

    if (sensorData && Array.isArray(sensorData)) {
      // Use sensor data passed from frontend
      historicalData = sensorData;
    } else if (locationId) {
      // Get from CSV file
      try {
        historicalData = await csvDataService.getHistoricalData(locationId, 8);
        console.log(`✓ Loaded ${historicalData.length} historical readings from CSV for ${locationId}`);
      } catch (err) {
        console.warn('Failed to load CSV data:', err.message);
      }
    } else if (sensorId) {
      // Get from database (rolling buffer)
      try {
        historicalData = await csvDataService.getSensorHistory(sensorId, 8);
        console.log(`✓ Loaded ${historicalData.length} historical readings from DB for ${sensorId}`);
      } catch (err) {
        console.warn('Failed to load sensor history:', err.message);
      }
    }

    // Step 2: Get coordinates from latest sensor reading or request body
    const latestSensor = historicalData.length > 0 ? historicalData[0] : null;
    const { lat, lon } = pickCoord(req.body, latestSensor ? [latestSensor] : []);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Please provide lat/lon or sensor data with coordinates'
      });
    }

    // Step 3: Fetch enhanced DEM data (with terrain derivatives)
    let demData = null;
    try {
      demData = await demService.fetchAndStoreDemEnhanced(lat, lon);
      console.log(`✓ DEM data fetched with terrain derivatives`);
      console.log(`  DEM fields: elevation=${demData?.dem_elevation}, slope=${demData?.dem_slope_angle}, curvature=${demData?.dem_curvature}, aspect=${demData?.dem_aspect}, tri=${demData?.dem_terrain_ruggedness}, drainage=${demData?.dem_drainage_distance}, twi=${demData?.TWI_dynamic}`);
    } catch (err) {
      console.error('DEM fetch failed:', err.message);
      console.error('DEM error stack:', err.stack);
    }

    // Step 4: Fetch enhanced weather data (with rainfall aggregations)
    let weatherData = null;
    try {
      weatherData = await weatherService.fetchAndStoreWeatherEnhanced(lat, lon);
      console.log(`✓ Weather data fetched with rainfall aggregations`);
      console.log(`  Weather fields: temp=${weatherData?.weather_temperature}, humidity=${weatherData?.weather_humidity}, rain24=${weatherData?.rain_A24}, rain72=${weatherData?.rain_A72}, rain168=${weatherData?.rain_A168}`);
    } catch (err) {
      console.error('Weather fetch failed:', err.message);
      console.error('Weather error stack:', err.stack);
    }

    // Step 5: Build feature dictionary
    const featureDict = {};

    // Add sensor features from historical data
    if (historicalData.length > 0) {
      const latest = historicalData[0];
      const sensorFeatures = csvDataService.csvRowToFeatures(latest);
      Object.assign(featureDict, sensorFeatures);
    }

    // Add DEM features
    if (demData) {
      featureDict.dem_elevation = demData.dem_elevation || demData.elevation;
      featureDict.dem_slope_angle = demData.dem_slope_angle || demData.slope_angle;
      featureDict.dem_curvature = demData.dem_curvature || demData.curvature;
      featureDict.dem_aspect = demData.dem_aspect || demData.aspect;
      featureDict.dem_terrain_ruggedness = demData.dem_terrain_ruggedness || demData.terrain_ruggedness;
      featureDict.dem_drainage_distance = demData.dem_drainage_distance || demData.drainage_distance;
      featureDict.TWI_dynamic = demData.TWI_dynamic || demData.twi;
    }

    // Add weather features
    if (weatherData) {
      featureDict.rain_A24 = weatherData.rain_A24 || weatherData.rain_24h || 0;
      featureDict.rain_A72 = weatherData.rain_A72 || weatherData.rain_72h || 0;
      featureDict.rain_A168 = weatherData.rain_A168 || weatherData.rain_168h || 0;
      featureDict.weather_temperature = weatherData.weather_temperature || weatherData.temperature;
      featureDict.weather_humidity = weatherData.weather_humidity || weatherData.humidity;
    }

    // Override with any features provided directly in request
    if (features && typeof features === 'object') {
      Object.assign(featureDict, features);
    }

    // Step 6: Build packet for ML service
    const packet = {
      sensor_data: historicalData.map(row => csvDataService.csvRowToFeatures(row)),
      weather: weatherData ? {
        rain_A24: weatherData.rain_A24 || weatherData.rain_24h,
        rain_A72: weatherData.rain_A72 || weatherData.rain_72h,
        rain_A168: weatherData.rain_A168 || weatherData.rain_168h,
        weather_temperature: weatherData.weather_temperature || weatherData.temperature,
        weather_humidity: weatherData.weather_humidity || weatherData.humidity,
        windspeed: weatherData.windspeed,
        weathercode: weatherData.weathercode
      } : null,
      dem: demData ? {
        dem_elevation: demData.dem_elevation || demData.elevation,
        dem_slope_angle: demData.dem_slope_angle || demData.slope_angle,
        dem_curvature: demData.dem_curvature || demData.curvature,
        dem_aspect: demData.dem_aspect || demData.aspect,
        dem_terrain_ruggedness: demData.dem_terrain_ruggedness || demData.terrain_ruggedness,
        dem_drainage_distance: demData.dem_drainage_distance || demData.drainage_distance,
        TWI_dynamic: demData.TWI_dynamic || demData.twi
      } : null,
      metadata: {
        sensor_id: sensorId || null,
        location_id: locationId || null,
        lat,
        lon,
        timeRange: timeRange || null
      },
      features: featureDict
    };

    console.log(`✓ Packet built with ${packet.sensor_data.length} historical readings`);
    console.log(`✓ Feature dict has ${Object.keys(featureDict).length} features`);

    // Step 7: Call ML service for prediction
    const prediction = await mlService.predict(packet);

    // Step 8: Save prediction to database
    const insert = `
      INSERT INTO ml_predictions(
        sensor_id, location_id, lat, lon, 
        risk_score, klass, recommended_action, 
        model_name, confidence, 
        explainability, ensemble_details
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `;

    const { rows } = await pool.query(insert, [
      sensorId || null,
      locationId || null,
      lat,
      lon,
      prediction.risk_score,
      prediction.klass,
      prediction.recommended_action,
      prediction.model_name,
      prediction.confidence,
      JSON.stringify(prediction.explainability || {}),
      JSON.stringify(prediction.ensemble_details || {})
    ]);

    const enrichedPrediction = {
      ...prediction,
      id: rows[0].id,
      created_at: rows[0].created_at,
      lat,
      lon,
      sensor_id: sensorId || null,
      location_id: locationId || null
    };

    const risk = Number(prediction.risk_score);
    if (Number.isFinite(risk)) {
      let severity = null;
      if (risk >= 0.6) severity = 'critical';
      else if (risk >= 0.3) severity = 'high';
      if (severity) {
        try {
          const insertAlert = `
            INSERT INTO alerts(
              severity, title, description, source, sensor_id,
              location_lat, location_lon, recommended_action, metadata
            ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
          `;
          const title = severity === 'critical' ? 'ML Risk Critical' : 'ML Risk Warning';
          const description = `Risk score ${risk.toFixed(3)} at (${lat}, ${lon})`;
          const meta = {
            model_name: prediction.model_name,
            confidence: prediction.confidence,
            ensemble_details: prediction.ensemble_details || null,
            explainability: prediction.explainability || null,
          };
          await pool.query(insertAlert, [
            severity,
            title,
            description,
            'ml-model',
            sensorId || null,
            lat,
            lon,
            prediction.recommended_action || null,
            JSON.stringify(meta)
          ]);
        } catch (e) {}
      }
    }

    if (Number.isFinite(risk)) {
      let reportSeverity = null;
      if (risk >= 0.6) reportSeverity = 'critical';
      else if (risk >= 0.3) reportSeverity = 'high';
      if (reportSeverity) {
        try {
          const shapTop = (prediction.explainability && prediction.explainability.shap_top) || (prediction.ensemble_details && prediction.ensemble_details.xgb_info && prediction.ensemble_details.xgb_info.shap_top) || null;
          const reportTitle = reportSeverity === 'critical' ? 'ML SHAP Report - Critical' : 'ML SHAP Report - Warning';
          const reportDesc = `Risk ${risk.toFixed(3)} at (${lat}, ${lon})`;
          const reportMeta = {
            shap_top: shapTop,
            risk_score: prediction.risk_score,
            model_name: prediction.model_name,
            ensemble_details: prediction.ensemble_details || null
          };
          const insertIncident = `
            INSERT INTO incidents (title, description, incident_type, location_lat, location_lon, location_name, severity, reported_by, attachments, metadata)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *
          `;
          const { rows: incRows } = await pool.query(insertIncident, [
            reportTitle,
            reportDesc,
            'ml_shap_report',
            lat,
            lon,
            null,
            reportSeverity,
            null,
            JSON.stringify([]),
            JSON.stringify(reportMeta)
          ]);
          const io = req.app.get('io');
          if (io) {
            io.emit('admin_incident_reported', { id: incRows[0].id, title: incRows[0].title, severity: incRows[0].severity || null });
          }
        } catch (e) {}
      }
    }

    // Step 9: Emit real-time event (if socket available)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const payload = {
        prediction: enrichedPrediction,
        location: { lat, lon },
        sensor_id: sensorId,
        location_id: locationId
      };
      io.emit('ml:prediction', payload);
      io.emit('prediction:new', payload);
    }

    // Step 10: Return response
    res.json({
      success: true,
      prediction: enrichedPrediction,
      data_sources: {
        sensor_readings: historicalData.length,
        dem_available: !!demData,
        weather_available: !!weatherData,
        features_extracted: Object.keys(featureDict).length
      }
    });

  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({
      error: 'Prediction failed',
      message: err.message
    });
  }
};

/**
 * Get available locations from CSV
 */
exports.getLocations = async (req, res) => {
  try {
    const locations = await csvDataService.getAvailableLocations();
    res.json({ locations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get locations', message: err.message });
  }
};

/**
 * Get historical sensor data for a location
 */
exports.getHistoricalData = async (req, res) => {
  const { locationId, limit } = req.query;

  if (!locationId) {
    return res.status(400).json({ error: 'locationId required' });
  }

  try {
    const data = await csvDataService.getHistoricalData(
      locationId,
      parseInt(limit) || 8
    );

    res.json({
      location_id: locationId,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get historical data', message: err.message });
  }
};

module.exports = exports;
