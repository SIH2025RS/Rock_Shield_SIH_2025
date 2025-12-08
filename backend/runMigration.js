/**
 * Run Database Migration for Ensemble Model
 * 
 * This script applies the database schema updates needed for the ensemble model.
 * Run with: node runMigration.js
 */

const pool = require('./src/db/pool');

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting database migration...\n');

        // Create sensor_history table
        console.log('[1/7] Creating sensor_history table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS sensor_history (
        id SERIAL PRIMARY KEY,
        sensor_id VARCHAR(100) NOT NULL,
        location_id VARCHAR(100),
        fs DOUBLE PRECISION, fs_rate DOUBLE PRECISION,
        pore_pressure_kpa DOUBLE PRECISION, pore_pressure_kpa_rate DOUBLE PRECISION,
        displacement_mm DOUBLE PRECISION, displacement_mm_rate DOUBLE PRECISION,
        strain_microstrain DOUBLE PRECISION, strain_microstrain_rate DOUBLE PRECISION,
        temperature_c DOUBLE PRECISION, humidity_pct DOUBLE PRECISION,
        vibration_hz DOUBLE PRECISION, dust_ugm3 DOUBLE PRECISION,
        methane_ppm DOUBLE PRECISION, co_ppm DOUBLE PRECISION, airflow_mps DOUBLE PRECISION,
        pore_pressure_ratio DOUBLE PRECISION, normal_stress_kpa DOUBLE PRECISION,
        shear_stress_kpa DOUBLE PRECISION, slope_angle_deg DOUBLE PRECISION,
        slope_height_m DOUBLE PRECISION, cohesion_kpa DOUBLE PRECISION,
        friction_angle_deg DOUBLE PRECISION, unit_weight_knm3 DOUBLE PRECISION,
        reinforcement_numeric INTEGER, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
        measured_at TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('✅ sensor_history table created\n');

        // Update DEM table
        console.log('[2/7] Adding columns to dem_data...');
        await client.query(`
      ALTER TABLE dem_data 
      ADD COLUMN IF NOT EXISTS slope_angle DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS curvature DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS aspect DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS terrain_ruggedness DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS drainage_distance DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS twi DOUBLE PRECISION
    `);
        console.log('✅ DEM columns added\n');

        // Update weather table
        console.log('[3/7] Adding columns to weather_data...');
        await client.query(`
      ALTER TABLE weather_data
      ADD COLUMN IF NOT EXISTS humidity DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS rain_24h DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS rain_72h DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS rain_168h DOUBLE PRECISION
    `);
        console.log('✅ Weather columns added\n');

        // Create indexes
        console.log('[4/7] Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sensor_history_sensor ON sensor_history(sensor_id, measured_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sensor_history_location ON sensor_history(location_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sensor_history_time ON sensor_history(measured_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_data_coords ON weather_data(lat, lon)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_data_time ON weather_data(fetched_at DESC)`);
        console.log('✅ Indexes created\n');

        // Add unique constraint to DEM
        console.log('[5/7] Adding constraint to dem_data...');
        try {
            await client.query(`ALTER TABLE dem_data ADD CONSTRAINT dem_data_lat_lon_key UNIQUE (lat, lon)`);
            console.log('✅ Constraint added\n');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('⚠️  Constraint already exists\n');
            } else throw err;
        }

        // Verify
        console.log('[6/7] Verifying schema...');
        const demCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'dem_data' AND column_name = 'twi'`);
        const weatherCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'weather_data' AND column_name = 'rain_24h'`);
        const sensorCheck = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sensor_history')`);

        console.log(`  - DEM TWI column: ${demCheck.rows.length > 0 ? '✓' : '✗'}`);
        console.log(`  - Weather rain column: ${weatherCheck.rows.length > 0 ? '✓' : '✗'}`);
        console.log(`  - Sensor history table: ${sensorCheck.rows[0].exists ? '✓' : '✗'}`);
        console.log('');

        console.log('[7/7] ✅ Migration completed successfully!\n');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n✓ Migration script completed');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n✗ Migration script failed');
        process.exit(1);
    });
