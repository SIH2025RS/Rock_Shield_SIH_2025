const express = require('express');
const pool = require('../db/pool');
const { verifyClerkToken, clerkClient } = require('../middleware/auth');

const router = express.Router();

// POST /api/users/sync - ensure a row exists for this Clerk user; optionally set role
router.post('/sync', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.userId;
    const defaultRole = 'miner'; // security: server chooses default role

    // Upsert DB row with default role if user doesn't exist
    await pool.query(
      `INSERT INTO users (clerk_user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (clerk_user_id) DO NOTHING`,
      [userId, defaultRole]
    );

    // Get the user's current role from database
    const dbResult = await pool.query(
      'SELECT role FROM users WHERE clerk_user_id = $1 LIMIT 1',
      [userId]
    );
    const dbRole = dbResult.rows[0]?.role;

    return res.json({ success: true, role: dbRole });
  } catch (err) {
    console.error('POST /api/users/sync error', err);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
});

// GET /api/users/me - alias of /api/me
router.get('/me', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.userId;
    const [dbUserResult, clerkUser] = await Promise.all([
      pool.query('SELECT id, clerk_user_id, role, full_name, phone, created_at, updated_at FROM users WHERE clerk_user_id = $1 LIMIT 1', [userId]),
      clerkClient.users.getUser(userId),
    ]);

    const dbUser = dbUserResult.rows[0] || null;
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');

    return res.json({
      id: dbUser?.id || null,
      role: dbUser?.role || null,
      fullName,
      email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
      profileImage: clerkUser.imageUrl || null,
      phone: dbUser?.phone || null,
      clerkUserId: userId,
    });
  } catch (err) {
    console.error('GET /api/users/me error', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
