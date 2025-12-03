const express = require('express');
const pool = require('../db/pool');
const { requireRole, ROLES, clerkClient } = require('../middleware/auth');

const router = express.Router();

router.get('/users', ...requireRole('system_admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, clerk_user_id, role, full_name, phone, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 100'
    );

    const enriched = [];
    for (const u of rows) {
      try {
        const cu = await clerkClient.users.getUser(u.clerk_user_id);
        enriched.push({
          id: u.id,
          clerkUserId: u.clerk_user_id,
          role: u.role,
          fullName: u.full_name || [cu.firstName, cu.lastName].filter(Boolean).join(' '),
          email: cu.emailAddresses?.[0]?.emailAddress || null,
          phone: u.phone || null,
          profileImage: cu.imageUrl || null,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        });
      } catch (e) {
        enriched.push({
          id: u.id,
          clerkUserId: u.clerk_user_id,
          role: u.role,
          fullName: u.full_name || null,
          email: null,
          phone: u.phone || null,
          profileImage: null,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
          error: 'Clerk user fetch failed',
        });
      }
    }

    return res.json({ users: enriched });
  } catch (err) {
    console.error('GET /api/admin/users error', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/update-role', ...requireRole('system_admin'), async (req, res) => {
  try {
    const { clerkUserId, role } = req.body || {};
    if (!clerkUserId || !role) return res.status(400).json({ error: 'clerkUserId and role are required' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: `Invalid role. Allowed: ${ROLES.join(', ')}` });

    await clerkClient.users.updateUser(clerkUserId, { publicMetadata: { role } });

    await pool.query(
      `INSERT INTO users (clerk_user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (clerk_user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now()`,
      [clerkUserId, role]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('POST /api/admin/update-role error', err);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;
