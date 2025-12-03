const express = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/miner/tasks
router.get('/tasks', ...requireRole('miner'), async (req, res) => {
  try {
    // Example static tasks; replace with real tasks table if needed
    const tasks = [
      { id: 1, title: 'Inspect zone A', status: 'pending' },
      { id: 2, title: 'Replace sensor battery', status: 'in_progress' },
    ];
    return res.json({ tasks });
  } catch (err) {
    console.error('GET /api/miner/tasks error', err);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
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
