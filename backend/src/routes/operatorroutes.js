const express = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/operator/dashboard
router.get('/dashboard', ...requireRole(['operator', 'system_admin']), async (req, res) => {
  try {
    // Example: aggregate recent IoT data counts
    const { rows } = await pool.query(
      `SELECT sensor_id, COUNT(*) AS count
       FROM iot_sensor_data
       WHERE measured_at > now() - interval '24 hours'
       GROUP BY sensor_id
       ORDER BY count DESC
       LIMIT 20`
    );
    return res.json({ message: 'Operator dashboard data', sensors: rows });
  } catch (err) {
    console.error('GET /api/operator/dashboard error', err);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// POST /api/operator/submit-report
router.post('/submit-report', ...requireRole(['operator', 'system_admin']), async (req, res) => {
  try {
    const { payload } = req.body || {};
    if (!payload) return res.status(400).json({ error: 'payload is required' });

    await pool.query(
      `INSERT INTO iot_sensor_data (sensor_id, payload, measured_at)
       VALUES ($1, $2::jsonb, now())`,
      ['manual_report', JSON.stringify(payload)]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('POST /api/operator/submit-report error', err);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
