const express = require('express');
const pool = require('../db/pool');
const { verifyClerkToken, clerkClient } = require('../middleware/auth');

const router = express.Router();

// GET /api/me - return combined Clerk and DB profile
router.get('/', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.userId;

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
    console.error('GET /api/me error', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/me/profile - update app-specific profile fields
router.put('/profile', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.auth.sub || req.auth.userId;
    const { fullName, phone } = req.body || {};

    await pool.query(
      `INSERT INTO users (clerk_user_id, role, full_name, phone)
       VALUES ($1, COALESCE((SELECT role FROM users WHERE clerk_user_id = $1), 'miner'), $2, $3)
       ON CONFLICT (clerk_user_id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, updated_at = now()`,
      [userId, fullName || null, phone || null]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/me/profile error', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
