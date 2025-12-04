const express = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/miner/tasks
router.get('/tasks', ...requireRole('miner'), async (req, res) => {
  try {
    const clerkId = req.user.id;
    const dbUser = await pool.query('SELECT id FROM users WHERE clerk_user_id = $1', [clerkId]);
    const userId = dbUser.rows[0]?.id;
    const { rows } = await pool.query(
      `SELECT id, title, description, task_type, priority, status, location_lat, location_lon, location_name, due_date, completed_at, notes, metadata, created_at, updated_at
       FROM tasks
       WHERE assigned_to = $1
       ORDER BY (CASE status WHEN 'pending' THEN 0 WHEN 'assigned' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END), created_at DESC
       LIMIT 200`,
      [userId]
    );
    return res.json({ tasks: rows });
  } catch (err) {
    console.error('GET /api/miner/tasks error', err);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/miner/alerts - forwarded alerts for miners
router.get('/alerts', ...requireRole('miner'), async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    let query = `SELECT id, severity, title, description, source, sensor_id, location_lat, location_lon, recommended_action, status, forwarded_to_miners, forwarded_at, created_at FROM alerts WHERE forwarded_to_miners = TRUE`;
    const params = [];
    if (severity) {
      params.push(severity);
      query += ` AND severity = $${params.length}`;
    }
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(query, params);
    return res.json({ alerts: rows });
  } catch (err) {
    console.error('GET /api/miner/alerts error', err);
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/miner/update-status
router.post('/update-status', ...requireRole('miner'), async (req, res) => {
  try {
    const { taskId, status } = req.body || {};
    if (!taskId || !status) return res.status(400).json({ error: 'taskId and status are required' });

    // This demo endpoint just stores an event in iot_sensor_data as an audit log
    await pool.query(
      `INSERT INTO iot_sensor_data (sensor_id, payload, measured_at)
       VALUES ($1, $2::jsonb, now())`,
      ['miner_task_update', JSON.stringify({ taskId, status })]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('POST /api/miner/update-status error', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;

