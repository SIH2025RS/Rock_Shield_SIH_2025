const express = require("express");
const pool = require("../db/pool");
const { requireRole } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      console.error("Failed to ensure uploads dir", e);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ============= SENSORS REGISTRY API =============
router.get(
  "/sensors",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { limit = 1000 } = req.query;
      await pool.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        id SERIAL PRIMARY KEY,
        sensor_id TEXT,
        name TEXT NOT NULL,
        sensor_type TEXT,
        status TEXT,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sensors_sensor_id ON sensors(sensor_id) WHERE sensor_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_sensors_location ON sensors(lat, lon);
    `);
      const { rows } = await pool.query(
        `SELECT id, sensor_id, name, sensor_type, status, lat, lon, metadata, created_by, created_at, updated_at
       FROM sensors
       ORDER BY created_at DESC
       LIMIT $1`,
        [Number(limit) || 1000]
      );
      return res.json({ sensors: rows });
    } catch (err) {
      console.error("GET /api/operator/sensors error", err);
      return res.status(500).json({ error: "Failed to fetch sensors" });
    }
  }
);

router.post(
  "/sensors",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { sensor_id, name, sensor_type, status, lat, lon, metadata } =
        req.body || {};
      if (!name || typeof lat !== "number" || typeof lon !== "number") {
        return res.status(400).json({ error: "name, lat, lon are required" });
      }
      await pool.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        id SERIAL PRIMARY KEY,
        sensor_id TEXT,
        name TEXT NOT NULL,
        sensor_type TEXT,
        status TEXT,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sensors_sensor_id ON sensors(sensor_id) WHERE sensor_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_sensors_location ON sensors(lat, lon);
    `);
      const ures = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [req.user.id]
      );
      const createdBy = ures.rows[0]?.id || null;
      const { rows } = await pool.query(
        `INSERT INTO sensors(sensor_id, name, sensor_type, status, lat, lon, metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
       RETURNING id, sensor_id, name, sensor_type, status, lat, lon, metadata, created_by, created_at, updated_at`,
        [
          sensor_id || null,
          name,
          sensor_type || null,
          status || null,
          lat,
          lon,
          JSON.stringify(metadata || {}),
          createdBy,
        ]
      );
      return res.json({ sensor: rows[0] });
    } catch (err) {
      console.error("POST /api/operator/sensors error", err);
      return res.status(500).json({ error: "Failed to create sensor" });
    }
  }
);
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  },
});

// GET /api/operator/dashboard
router.get(
  "/dashboard",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
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
      return res.json({ message: "Operator dashboard data", sensors: rows });
    } catch (err) {
      console.error("GET /api/operator/dashboard error", err);
      return res.status(500).json({ error: "Failed to load dashboard" });
    }
  }
);

// POST /api/operator/submit-report
router.post(
  "/submit-report",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { payload } = req.body || {};
      if (!payload)
        return res.status(400).json({ error: "payload is required" });

      await pool.query(
        `INSERT INTO iot_sensor_data (sensor_id, payload, measured_at)
       VALUES ($1, $2::jsonb, now())`,
        ["manual_report", JSON.stringify(payload)]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/operator/submit-report error", err);
      return res.status(500).json({ error: "Failed to submit report" });
    }
  }
);

// GET /api/operator/reports - List submitted reports
router.get(
  "/reports",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const lim = Number(limit) || 100;
      const { rows } = await pool.query(
        `SELECT id, payload, measured_at, lat, lon
       FROM iot_sensor_data
       WHERE sensor_id = 'manual_report'
       ORDER BY measured_at DESC
       LIMIT $1`,
        [lim]
      );
      const reports = rows.map((r) => ({
        id: r.id,
        title: (r.payload || {}).title || null,
        category: (r.payload || {}).category || "general",
        message: (r.payload || {}).message || "",
        measured_at: r.measured_at,
        lat: r.lat,
        lon: r.lon,
      }));
      return res.json({ reports });
    } catch (err) {
      console.error("GET /api/operator/reports error", err);
      return res.status(500).json({ error: "Failed to fetch reports" });
    }
  }
);

// ============= ALERTS API =============

// GET /api/operator/alerts - Fetch all alerts with optional filters
router.get(
  "/alerts",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { severity, status, limit = 50 } = req.query;
      let query = `
      SELECT a.*, u.full_name as acknowledged_by_name
      FROM alerts a
      LEFT JOIN users u ON a.acknowledged_by = u.id
      WHERE 1=1
    `;
      const params = [];

      if (severity) {
        params.push(severity);
        query += ` AND a.severity = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND a.status = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

      const { rows } = await pool.query(query, params);
      return res.json({ alerts: rows });
    } catch (err) {
      console.error("GET /api/operator/alerts error", err);
      return res.status(500).json({ error: "Failed to fetch alerts" });
    }
  }
);

router.get(
  "/alerts/meta",
  ...requireRole(["operator", "system_admin", "miner"]),
  async (req, res) => {
    try {
      const colors = {
        critical: "#dc2626",
        high: "#f97316",
        medium: "#f59e0b",
        low: "#22c55e",
      };
      const actions = ["Evacuate", "Inspect", "Reduce ops"];
      return res.json({ severityColors: colors, recommendedActions: actions });
    } catch (err) {
      console.error("GET /api/operator/alerts/meta error", err);
      return res.status(500).json({ error: "Failed to fetch meta" });
    }
  }
);

// POST /api/operator/alerts - Create a new alert
router.post(
  "/alerts",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const {
        severity,
        title,
        description,
        source,
        sensor_id,
        location_lat,
        location_lon,
        recommended_action,
        metadata,
      } = req.body;

      if (!severity || !title) {
        return res
          .status(400)
          .json({ error: "severity and title are required" });
      }

      const { rows } = await pool.query(
        `INSERT INTO alerts (severity, title, description, source, sensor_id, location_lat, location_lon, recommended_action, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING *`,
        [
          severity,
          title,
          description,
          source,
          sensor_id,
          location_lat,
          location_lon,
          recommended_action,
          JSON.stringify(metadata || {}),
        ]
      );

      return res.json({ alert: rows[0] });
    } catch (err) {
      console.error("POST /api/operator/alerts error", err);
      return res.status(500).json({ error: "Failed to create alert" });
    }
  }
);

// PUT /api/operator/alerts/:id/acknowledge - Acknowledge an alert
router.put(
  "/alerts/:id/acknowledge",
  ...requireRole(["operator", "system_admin", "miner"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const clerkId = req.user.id;
      const dbUser = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [clerkId]
      );
      const userId = dbUser.rows[0]?.id;

      const { rows } = await pool.query(
        `UPDATE alerts 
       SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING *`,
        [userId, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Alert not found" });
      }

      return res.json({ alert: rows[0] });
    } catch (err) {
      console.error("PUT /api/operator/alerts/:id/acknowledge error", err);
      return res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  }
);

// PUT /api/operator/alerts/:id/forward - Forward alert to miners
router.put(
  "/alerts/:id/forward",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const io = req.app.get("io");
      const updateResult = await pool.query(
        `UPDATE alerts 
       SET forwarded_to_miners = true, forwarded_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
        [id]
      );
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: "Alert not found" });
      }
      const alert = updateResult.rows[0];
      const assignerDb = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [req.user.id]
      );
      const assignedBy = assignerDb.rows[0]?.id || null;
      const priorityMap = {
        critical: "critical",
        high: "high",
        medium: "medium",
        low: "low",
      };
      const priority = priorityMap[alert.severity] || "medium";
      const title = `Respond to alert: ${alert.title}`;
      const description = alert.recommended_action
        ? `Recommended: ${alert.recommended_action}`
        : null;
      const metadata = JSON.stringify({
        alert_id: alert.id,
        sensor_id: alert.sensor_id,
        severity: alert.severity,
      });
      const insertTasks = await pool.query(
        `INSERT INTO tasks (title, description, task_type, priority, status, assigned_to, assigned_by, location_lat, location_lon, location_name, due_date, notes, metadata)
       SELECT $1, $2, $3, $4, 'assigned', u.id, $5, $6, $7, NULL, NULL, NULL, $8::jsonb
       FROM users u
       WHERE u.role = 'miner'
       LIMIT 100`,
        [
          title,
          description,
          "alert_response",
          priority,
          assignedBy,
          alert.location_lat,
          alert.location_lon,
          metadata,
        ]
      );
      if (io) {
        io.emit("miner_alert", {
          id: alert.id,
          severity: alert.severity,
          title: alert.title,
          recommended_action: alert.recommended_action || null,
        });
      }
      return res.json({
        alert,
        tasksCreated: insertTasks.rowCount || 0,
        message: "Alert forwarded to miners",
      });
    } catch (err) {
      console.error("PUT /api/operator/alerts/:id/forward error", err);
      return res.status(500).json({ error: "Failed to forward alert" });
    }
  }
);

// PUT /api/operator/alerts/:id/resolve - Resolve an alert
router.put(
  "/alerts/:id/resolve",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(
        `UPDATE alerts 
       SET status = 'resolved', updated_at = now()
       WHERE id = $1
       RETURNING *`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Alert not found" });
      }

      return res.json({ alert: rows[0] });
    } catch (err) {
      console.error("PUT /api/operator/alerts/:id/resolve error", err);
      return res.status(500).json({ error: "Failed to resolve alert" });
    }
  }
);

// ============= INCIDENTS API =============

// GET /api/operator/incidents - Fetch all incidents
router.get(
  "/incidents",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        incident_type TEXT,
        location_lat DOUBLE PRECISION,
        location_lon DOUBLE PRECISION,
        location_name TEXT,
        severity TEXT,
        status TEXT DEFAULT 'submitted',
        reported_by INTEGER,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMPTZ,
        attachments JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    `);
      const { status, type, limit = 50 } = req.query;
      let query = `
      SELECT i.*, u.full_name as reported_by_name
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      WHERE 1=1
    `;
      const params = [];

      if (status) {
        params.push(status);
        query += ` AND i.status = $${params.length}`;
      }
      if (type) {
        params.push(type);
        query += ` AND i.incident_type = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY i.created_at DESC LIMIT $${params.length}`;

      const { rows } = await pool.query(query, params);
      return res.json({ incidents: rows });
    } catch (err) {
      console.error("GET /api/operator/incidents error", err);
      return res.status(500).json({ error: "Failed to fetch incidents" });
    }
  }
);

// POST /api/operator/incidents - Create a new incident
router.post(
  "/incidents",
  upload.array("files", 10),
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        incident_type,
        location_lat,
        location_lon,
        location_name,
        severity,
        metadata,
      } = req.body;

      if (!title || !description || !incident_type) {
        return res
          .status(400)
          .json({
            error: "title, description, and incident_type are required",
          });
      }
      await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        incident_type TEXT,
        location_lat DOUBLE PRECISION,
        location_lon DOUBLE PRECISION,
        location_name TEXT,
        severity TEXT,
        status TEXT DEFAULT 'submitted',
        reported_by INTEGER,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMPTZ,
        attachments JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    `);

      // Get user ID from database
      const userResult = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [req.user.id]
      );
      const reportedBy = userResult.rows[0]?.id;

      // Process uploaded files
      const attachments = req.files
        ? req.files.map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
          }))
        : [];

      const { rows } = await pool.query(
        `INSERT INTO incidents (title, description, incident_type, location_lat, location_lon, location_name, severity, reported_by, attachments, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
       RETURNING *`,
        [
          title,
          description,
          incident_type,
          location_lat,
          location_lon,
          location_name,
          severity,
          reportedBy,
          JSON.stringify(attachments),
          JSON.stringify(metadata || {}),
        ]
      );
      const incident = rows[0];
      const io = req.app.get("io");
      const priorityMap = {
        critical: "critical",
        high: "high",
        medium: "medium",
        low: "low",
      };
      const priority = priorityMap[severity] || "high";
      const adminTasks = await pool.query(
        `INSERT INTO tasks (title, description, task_type, priority, status, assigned_to, assigned_by, location_lat, location_lon, location_name, due_date, notes, metadata)
       SELECT $1, $2, $3, $4, 'assigned', u.id, $5, $6, $7, $8, NULL, NULL, $9::jsonb
       FROM users u
       WHERE u.role = 'system_admin'`,
        [
          `Review incident: ${title}`,
          description,
          "incident_review",
          priority,
          reportedBy,
          location_lat || null,
          location_lon || null,
          location_name || null,
          JSON.stringify({ incident_id: incident.id }),
        ]
      );
      // Log a retraining event for downstream ML pipeline
      try {
        await pool.query(
          `INSERT INTO iot_sensor_data (sensor_id, payload, measured_at) VALUES ($1, $2::jsonb, now())`,
          [
            "incident_report",
            JSON.stringify({
              incident_id: incident.id,
              incident_type,
              severity,
            }),
          ]
        );
      } catch (e) {
        console.warn("Failed to log incident retraining event", e);
      }
      if (io) {
        io.emit("admin_incident_reported", {
          id: incident.id,
          title: incident.title,
          severity: incident.severity || null,
        });
      }
      return res.json({
        incident,
        adminTasksCreated: adminTasks.rowCount || 0,
      });
    } catch (err) {
      console.error("POST /api/operator/incidents error", err);
      return res.status(500).json({ error: "Failed to create incident" });
    }
  }
);

// PUT /api/operator/incidents/:id - Update incident status
router.put(
  "/incidents/:id",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        incident_type TEXT,
        location_lat DOUBLE PRECISION,
        location_lon DOUBLE PRECISION,
        location_name TEXT,
        severity TEXT,
        status TEXT DEFAULT 'submitted',
        reported_by INTEGER,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMPTZ,
        attachments JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
      const { id } = req.params;
      const { status, description, severity } = req.body;

      const updates = [];
      const params = [];

      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }
      if (description) {
        params.push(description);
        updates.push(`description = $${params.length}`);
      }
      if (severity) {
        params.push(severity);
        updates.push(`severity = $${params.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(id);
      updates.push("updated_at = now()");

      const { rows } = await pool.query(
        `UPDATE incidents SET ${updates.join(", ")} WHERE id = $${
          params.length
        } RETURNING *`,
        params
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Incident not found" });
      }

      return res.json({ incident: rows[0] });
    } catch (err) {
      console.error("PUT /api/operator/incidents/:id error", err);
      return res.status(500).json({ error: "Failed to update incident" });
    }
  }
);

// Acknowledge an incident (system_admin only)
router.put(
  "/incidents/:id/acknowledge",
  ...requireRole(["system_admin"]),
  async (req, res) => {
    try {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        incident_type TEXT,
        location_lat DOUBLE PRECISION,
        location_lon DOUBLE PRECISION,
        location_name TEXT,
        severity TEXT,
        status TEXT DEFAULT 'submitted',
        reported_by INTEGER,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMPTZ,
        attachments JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
      const { id } = req.params;
      const dbUser = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [req.user.id]
      );
      const adminId = dbUser.rows[0]?.id || null;
      const { rows } = await pool.query(
        `UPDATE incidents
       SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING *`,
        [adminId, id]
      );
      if (!rows.length)
        return res.status(404).json({ error: "Incident not found" });
      return res.json({ incident: rows[0] });
    } catch (err) {
      console.error("PUT /api/operator/incidents/:id/acknowledge error", err);
      return res.status(500).json({ error: "Failed to acknowledge incident" });
    }
  }
);

// ============= TASKS API =============

// GET /api/operator/tasks - Fetch all tasks
router.get(
  "/tasks",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { status, priority, assigned_to, limit = 50 } = req.query;
      let query = `
      SELECT t.*, 
             u1.full_name as assigned_to_name,
             u2.full_name as assigned_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.assigned_by = u2.id
      WHERE 1=1
    `;
      const params = [];

      if (status) {
        params.push(status);
        query += ` AND t.status = $${params.length}`;
      }
      if (priority) {
        params.push(priority);
        query += ` AND t.priority = $${params.length}`;
      }
      if (assigned_to) {
        params.push(assigned_to);
        query += ` AND t.assigned_to = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;

      const { rows } = await pool.query(query, params);
      return res.json({ tasks: rows });
    } catch (err) {
      console.error("GET /api/operator/tasks error", err);
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }
);

// POST /api/operator/tasks - Create and assign a task
router.post(
  "/tasks",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        task_type,
        priority,
        assigned_to_clerk_id,
        location_lat,
        location_lon,
        location_name,
        due_date,
        notes,
        metadata,
      } = req.body;

      if (!title || !task_type) {
        return res
          .status(400)
          .json({ error: "title and task_type are required" });
      }

      // Get assigner ID from database
      const assignerResult = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [req.user.id]
      );
      const assignedBy = assignerResult.rows[0]?.id;

      // Get assignee ID if provided
      let assignedTo = null;
      if (assigned_to_clerk_id) {
        const assigneeResult = await pool.query(
          "SELECT id FROM users WHERE clerk_user_id = $1",
          [assigned_to_clerk_id]
        );
        assignedTo = assigneeResult.rows[0]?.id;
      }

      const taskStatus = assignedTo ? "assigned" : "pending";

      const { rows } = await pool.query(
        `INSERT INTO tasks (title, description, task_type, priority, status, assigned_to, assigned_by, location_lat, location_lon, location_name, due_date, notes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING *`,
        [
          title,
          description,
          task_type,
          priority || "medium",
          taskStatus,
          assignedTo,
          assignedBy,
          location_lat,
          location_lon,
          location_name,
          due_date,
          notes,
          JSON.stringify(metadata || {}),
        ]
      );

      return res.json({ task: rows[0] });
    } catch (err) {
      console.error("POST /api/operator/tasks error", err);
      return res.status(500).json({ error: "Failed to create task" });
    }
  }
);

// PUT /api/operator/tasks/:id - Update task
router.put(
  "/tasks/:id",
  ...requireRole(["operator", "system_admin", "miner"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, priority } = req.body;

      const updates = [];
      const params = [];

      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);

        if (status === "completed") {
          updates.push("completed_at = now()");
        }
      }
      if (notes) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }
      if (priority) {
        params.push(priority);
        updates.push(`priority = $${params.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(id);
      updates.push("updated_at = now()");

      const { rows } = await pool.query(
        `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${
          params.length
        } RETURNING *`,
        params
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.json({ task: rows[0] });
    } catch (err) {
      console.error("PUT /api/operator/tasks/:id error", err);
      return res.status(500).json({ error: "Failed to update task" });
    }
  }
);

// ============= SENSOR INSIGHTS API =============

// GET /api/operator/insights/timeseries - Get time series data for sensors
router.get(
  "/insights/timeseries",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { sensor_id, hours = 24, metric } = req.query;

      if (!sensor_id) {
        return res.status(400).json({ error: "sensor_id is required" });
      }

      const { rows } = await pool.query(
        `SELECT 
         id,
         sensor_id,
         payload,
         measured_at,
         lat,
         lon
       FROM iot_sensor_data
       WHERE sensor_id = $1 
         AND measured_at > now() - interval '1 hour' * $2
       ORDER BY measured_at ASC`,
        [sensor_id, hours]
      );
      let series = null;
      if (metric) {
        series = rows.map((r) => ({
          t: r.measured_at,
          v: Number((r.payload || {})[metric]) || null,
        }));
      }
      return res.json({ data: rows, series });
    } catch (err) {
      console.error("GET /api/operator/insights/timeseries error", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch time series data" });
    }
  }
);

// GET /api/operator/insights/correlation - Get correlation data between sensors
router.get(
  "/insights/correlation",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { sensor_ids, hours = 24 } = req.query;

      if (!sensor_ids) {
        return res.status(400).json({ error: "sensor_ids is required" });
      }

      const sensorArray = sensor_ids.split(",");

      const { rows } = await pool.query(
        `SELECT 
         sensor_id,
         payload,
         measured_at
       FROM iot_sensor_data
       WHERE sensor_id = ANY($1::text[])
         AND measured_at > now() - interval '1 hour' * $2
       ORDER BY measured_at ASC`,
        [sensorArray, hours]
      );

      return res.json({ data: rows });
    } catch (err) {
      console.error("GET /api/operator/insights/correlation error", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch correlation data" });
    }
  }
);

// ============= MAP ENDPOINTS =============
router.get(
  "/map/sensors",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (sensor_id)
         sensor_id,
         lat,
         lon,
         measured_at
       FROM iot_sensor_data
       WHERE lat IS NOT NULL AND lon IS NOT NULL
         AND measured_at > now() - interval '1 hour' * $1
       ORDER BY sensor_id, measured_at DESC
       LIMIT 1000`,
        [hours]
      );
      return res.json({ sensors: rows });
    } catch (err) {
      console.error("GET /api/operator/map/sensors error", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch sensor locations" });
    }
  }
);

router.get(
  "/map/alerts",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { hours = 168, severity } = req.query; // default 7 days
      let query = `
      SELECT id, severity, title, sensor_id, recommended_action, location_lat, location_lon, created_at, metadata
      FROM alerts
      WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL
        AND created_at > now() - interval '1 hour' * $1`;
      const params = [hours];
      if (severity) {
        params.push(severity);
        query += ` AND severity = $${params.length}`;
      }
      query += " ORDER BY created_at DESC LIMIT 1000";
      const { rows } = await pool.query(query, params);
      return res.json({ alerts: rows });
    } catch (err) {
      console.error("GET /api/operator/map/alerts error", err);
      return res.status(500).json({ error: "Failed to fetch alert locations" });
    }
  }
);

router.get(
  "/insights/vibration-events",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { sensor_id, hours = 24, threshold = 50 } = req.query;
      const params = [hours, Number(threshold)];
      let where = `measured_at > now() - interval '1 hour' * $1 AND ((payload->>'vibration_hz')::double precision > $2 OR (payload->>'vibration_event')::boolean IS TRUE)`;
      if (sensor_id) {
        params.push(sensor_id);
        where += ` AND sensor_id = $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT id, sensor_id, payload, measured_at FROM iot_sensor_data WHERE ${where} ORDER BY measured_at DESC LIMIT 500`,
        params
      );
      return res.json({ events: rows });
    } catch (err) {
      console.error("GET /api/operator/insights/vibration-events error", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch vibration events" });
    }
  }
);

router.get(
  "/insights/forecast/config",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const configPath = path.resolve(
        __dirname,
        "../../../ai-ml/rockfall-prediction-system/Models/ensemble_config.json"
      );
      const exists = fs.existsSync(configPath);
      if (!exists) return res.json({ available: false });
      const content = fs.readFileSync(configPath, "utf-8");
      const cfg = JSON.parse(content);
      return res.json({ available: true, config: cfg });
    } catch (err) {
      console.error("GET /api/operator/insights/forecast/config error", err);
      return res.status(500).json({ error: "Failed to read forecast config" });
    }
  }
);

// GET /api/operator/insights/summary - Get summary statistics
router.get(
  "/insights/summary",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const [alertsResult, incidentsResult, tasksResult, sensorsResult] =
        await Promise.all([
          pool.query(
            `SELECT severity, status, COUNT(*) as count FROM alerts GROUP BY severity, status`
          ),
          pool.query(
            `SELECT status, COUNT(*) as count FROM incidents GROUP BY status`
          ),
          pool.query(
            `SELECT status, priority, COUNT(*) as count FROM tasks GROUP BY status, priority`
          ),
          pool.query(
            `SELECT COUNT(DISTINCT sensor_id) as count FROM iot_sensor_data WHERE measured_at > now() - interval '24 hours'`
          ),
        ]);

      return res.json({
        alerts: alertsResult.rows,
        incidents: incidentsResult.rows,
        tasks: tasksResult.rows,
        active_sensors: sensorsResult.rows[0]?.count || 0,
      });
    } catch (err) {
      console.error("GET /api/operator/insights/summary error", err);
      return res.status(500).json({ error: "Failed to fetch summary" });
    }
  }
);

// ============= PLANT HUBS API =============
router.get(
  "/plant-hubs",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { mine, limit = 200 } = req.query;
      await pool.query(
        `CREATE TABLE IF NOT EXISTS plant_hubs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL,
        address TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT now()
      )`
      );
      let query =
        "SELECT id, name, lat, lon, address, created_by, created_at FROM plant_hubs";
      const params = [];
      if (String(mine) === "true") {
        const ures = await pool.query(
          "SELECT id FROM users WHERE clerk_user_id = $1",
          [req.user.id]
        );
        const uid = ures.rows[0]?.id || null;
        params.push(uid);
        query += ` WHERE created_by = $${params.length}`;
      }
      params.push(Number(limit) || 200);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const { rows } = await pool.query(query, params);
      return res.json({ hubs: rows });
    } catch (err) {
      console.error("GET /api/operator/plant-hubs error", err);
      return res.status(500).json({ error: "Failed to fetch plant hubs" });
    }
  }
);

router.post(
  "/plant-hubs",
  ...requireRole(["operator", "system_admin"]),
  async (req, res) => {
    try {
      const { name, lat, lon, address } = req.body || {};
      if (!name || typeof lat !== "number" || typeof lon !== "number") {
        return res.status(400).json({ error: "name, lat, lon are required" });
      }
      await pool.query(
        `CREATE TABLE IF NOT EXISTS plant_hubs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL,
        address TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT now()
      )`
      );
      const ures = await pool.query(
        "SELECT id FROM users WHERE clerk_user_id = $1",
        [req.user.id]
      );
      const createdBy = ures.rows[0]?.id || null;
      const { rows } = await pool.query(
        `INSERT INTO plant_hubs(name, lat, lon, address, created_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, lat, lon, address, created_by, created_at`,
        [name, lat, lon, address || null, createdBy]
      );
      return res.json({ hub: rows[0] });
    } catch (err) {
      console.error("POST /api/operator/plant-hubs error", err);
      return res.status(500).json({ error: "Failed to create plant hub" });
    }
  }
);

module.exports = router;
