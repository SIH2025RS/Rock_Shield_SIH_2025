const express = require("express");
const pool = require("../db/pool");
const { verifyClerkToken } = require("../middleware/auth");
const { sendAlertEscalation } = require("../services/notifications");

const router = express.Router();

router.post("/escalate", verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.userId || null;
    const { alertId, channels, message, language, severity, location, reasons, confidence } =
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

    // Optionally send notifications if recipients are configured
    // This is a placeholder - in production, you'd fetch recipients from a config or database
    const ENABLE_NOTIFICATIONS = process.env.ENABLE_ALERT_NOTIFICATIONS === "true";
    const recipients = {
      sms: process.env.ALERT_SMS_RECIPIENTS ? process.env.ALERT_SMS_RECIPIENTS.split(",") : [],
      voice: process.env.ALERT_VOICE_RECIPIENTS ? process.env.ALERT_VOICE_RECIPIENTS.split(",") : [],
      email: process.env.ALERT_EMAIL_RECIPIENTS ? process.env.ALERT_EMAIL_RECIPIENTS.split(",") : [],
    };

    if (ENABLE_NOTIFICATIONS && (recipients.sms.length || recipients.voice.length || recipients.email.length)) {
      // Fire and forget - don't wait for notification results
      sendAlertEscalation({
        toList: recipients,
        severity: severity || "medium",
        language: language || "en",
        message,
        location: location ? JSON.stringify(location) : null,
        reasons,
        confidence,
      }).catch((err) => {
        console.error("Failed to send alert notifications:", err);
      });
    }

    res.status(202).json({ success: true, queued: true });
  } catch (e) {
    console.error("Escalation error:", e);
    res.status(500).json({ error: "failed_to_escalate" });
  }
});

module.exports = router;
