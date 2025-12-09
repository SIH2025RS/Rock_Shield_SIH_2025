const express = require("express");
const pool = require("../db/pool");
const { verifyClerkToken } = require("../middleware/auth");

const router = express.Router();

router.post("/escalate", verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.userId || null;
    const { alertId, channels, message, language, severity, location } =
      req.body || {};
    const ch = Array.isArray(channels) ? channels : [];

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_escalations (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER,
        requested_by TEXT,
        channels JSONB,
        language VARCHAR(8),
        message TEXT,
        severity TEXT,
        location JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(
      "INSERT INTO alert_escalations(alert_id, requested_by, channels, language, message, severity, location) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        alertId || null,
        userId,
        JSON.stringify(ch),
        language || null,
        message || null,
        severity || null,
        location ? JSON.stringify(location) : null,
      ]
    );

    res.status(202).json({ success: true, queued: true });
  } catch (e) {
    res.status(500).json({ error: "failed_to_escalate" });
  }
});

module.exports = router;
