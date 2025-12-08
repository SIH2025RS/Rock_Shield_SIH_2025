const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const pool = require('../db/pool');

/**
 * CSV Data Service
 * Reads and parses rockfall patch CSV data for historical sensor readings
 * Provides data for LSTM windowing and feature extraction
 */

const CSV_PATH = path.join(__dirname, '../../../ai-ml/rockfall-prediction-system/Datasets/rockfall_patch_JH-UG-01_realistic_processed.csv');

/**
 * Parse CSV file and return array of records
 */
function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        if (!fs.existsSync(filePath)) {
            return reject(new Error(`CSV file not found: ${filePath}`));
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Convert string values to numbers
                const parsed = {};
                for (const [key, value] of Object.entries(row)) {
                    // Try to parse as number, keep as string if fails
                    const num = parseFloat(value);
                    parsed[key] = isNaN(num) ? value : num;
                }
                results.push(parsed);
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

/**
 * Get historical sensor data from CSV for a specific location
 * @param {string} locationId - Location identifier (e.g., 'JH-UG-01')
 * @param {number} limit - Number of recent records to return (default: 8 for LSTM)
 * @returns {Promise<Array>} Array of sensor readings, most recent first
 */
async function getHistoricalData(locationId, limit = 8) {
    try {
        const allData = await parseCSV(CSV_PATH);

        // Filter by location_id
        const locationData = allData.filter(row => row.location_id === locationId);

        if (locationData.length === 0) {
            console.warn(`No data found for location: ${locationId}`);
            return [];
        }

        // Sort by timestamp descending (most recent first)
        locationData.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB - dateA;
        });

        // Return limited number of records
        return locationData.slice(0, limit);

    } catch (err) {
        console.error('Failed to get historical data:', err.message);
        throw new Error('CSV data fetch failed');
    }
}

/**
 * Get latest sensor reading from CSV
 */
async function getLatestReading(locationId) {
    const data = await getHistoricalData(locationId, 1);
    return data.length > 0 ? data[0] : null;
}

/**
 * Get all available location IDs from CSV
 */
async function getAvailableLocations() {
    try {
        const allData = await parseCSV(CSV_PATH);
        const locations = [...new Set(allData.map(row => row.location_id))];
        return locations.filter(loc => loc); // Remove nulls
    } catch (err) {
        console.error('Failed to get locations:', err.message);
        return [];
    }
}

/**
 * Store sensor reading in database (sensor_history table)
 * This maintains a rolling buffer for LSTM windowing
 */
async function storeSensorReading(sensorData) {
    try {
        const insert = `
      INSERT INTO sensor_history(
        sensor_id, location_id,
        fs, fs_rate, pore_pressure_kpa, pore_pressure_kpa_rate,
        displacement_mm, displacement_mm_rate, strain_microstrain, strain_microstrain_rate,
        temperature_c, humidity_pct, vibration_hz, dust_ugm3,
        methane_ppm, co_ppm, airflow_mps,
        pore_pressure_ratio, normal_stress_kpa, shear_stress_kpa,
        slope_angle_deg, slope_height_m, cohesion_kpa, friction_angle_deg,
        unit_weight_knm3, reinforcement_numeric,
        latitude, longitude, measured_at
      ) VALUES(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *
    `;

        const values = [
            sensorData.sensor_id || sensorData.patch_id,
            sensorData.location_id,
            sensorData.fs,
            sensorData.fs_rate,
            sensorData.pore_pressure_kpa,
            sensorData.pore_pressure_kpa_rate,
            sensorData.displacement_mm,
            sensorData.displacement_mm_rate,
            sensorData.strain_microstrain,
            sensorData.strain_microstrain_rate,
            sensorData.temperature_c,
            sensorData.humidity_pct,
            sensorData.vibration_hz,
            sensorData.dust_ugm3,
            sensorData.methane_ppm,
            sensorData.co_ppm,
            sensorData.airflow_mps,
            sensorData.pore_pressure_ratio,
            sensorData.normal_stress_kpa,
            sensorData.shear_stress_kpa,
            sensorData.slope_angle_deg,
            sensorData.slope_height_m,
            sensorData.cohesion_kpa,
            sensorData.friction_angle_deg,
            sensorData.unit_weight_knm3,
            sensorData.reinforcement_numeric,
            sensorData.latitude,
            sensorData.longitude,
            sensorData.timestamp || new Date()
        ];

        const { rows } = await pool.query(insert, values);

        // Cleanup: Keep only last 1000 readings per sensor for performance
        await pool.query(`
      DELETE FROM sensor_history
      WHERE sensor_id = $1
      AND id NOT IN (
        SELECT id FROM sensor_history
        WHERE sensor_id = $1
        ORDER BY measured_at DESC
        LIMIT 1000
      )
    `, [sensorData.sensor_id || sensorData.patch_id]);

        return rows[0];

    } catch (err) {
        console.error('Failed to store sensor reading:', err.message);
        throw err;
    }
}

/**
 * Get sensor history from database (for LSTM windowing)
 */
async function getSensorHistory(sensorId, limit = 8) {
    try {
        const query = `
      SELECT * FROM sensor_history
      WHERE sensor_id = $1
      ORDER BY measured_at DESC
      LIMIT $2
    `;

        const { rows } = await pool.query(query, [sensorId, limit]);
        return rows;

    } catch (err) {
        console.error('Failed to get sensor history:', err.message);
        return [];
    }
}

/**
 * Map CSV row to feature dict for ML model
 */
function csvRowToFeatures(csvRow) {
    return {
        // Factor of Safety and rates
        fs: csvRow.fs,
        fs_rate: csvRow.fs_rate,

        // Pore pressure
        pore_pressure_kpa: csvRow.pore_pressure_kpa,
        pore_pressure_kpa_rate: csvRow.pore_pressure_kpa_rate,
        pore_pressure_ratio: csvRow.pore_pressure_ratio,

        // Displacement and strain
        displacement_mm: csvRow.displacement_mm,
        displacement_mm_rate: csvRow.displacement_mm_rate,
        strain_microstrain: csvRow.strain_microstrain,
        strain_microstrain_rate: csvRow.strain_microstrain_rate,

        // Stress
        normal_stress_kpa: csvRow.normal_stress_kpa,
        shear_stress_kpa: csvRow.shear_stress_kpa,

        // Environmental sensors
        temperature_c: csvRow.temperature_c,
        humidity_pct: csvRow.humidity_pct,
        vibration_hz: csvRow.vibration_hz,
        dust_ugm3: csvRow.dust_ugm3,
        methane_ppm: csvRow.methane_ppm,
        co_ppm: csvRow.co_ppm,
        airflow_mps: csvRow.airflow_mps,

        // Geological parameters
        slope_angle_deg: csvRow.slope_angle_deg,
        slope_height_m: csvRow.slope_height_m,
        cohesion_kpa: csvRow.cohesion_kpa,
        friction_angle_deg: csvRow.friction_angle_deg,
        unit_weight_knm3: csvRow.unit_weight_knm3,
        reinforcement_numeric: csvRow.reinforcement_numeric,

        // Location
        latitude: csvRow.latitude,
        longitude: csvRow.longitude
    };
}

module.exports = {
    getHistoricalData,
    getLatestReading,
    getAvailableLocations,
    storeSensorReading,
    getSensorHistory,
    csvRowToFeatures,
    parseCSV
};
