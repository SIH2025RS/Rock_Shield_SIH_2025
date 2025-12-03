const { clerkMiddleware, getAuth, clerkClient } = require('@clerk/express');
const { verifyToken } = require('@clerk/backend');
const pool = require('../db/pool');

// Attach req.auth to all requests when a token is provided
const withAuth = clerkMiddleware();

// Require a valid authenticated session
const requireAuth = (req, res, next) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.auth = auth;
  next();
};

// Allowed roles in the system
const ROLES = ['system_admin', 'operator', 'miner'];

// Verify a Clerk JWT created from a JWT template (e.g., template: 'backend')
async function verifyClerkToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    req.auth = decoded;
    next();
  } catch (err) {
    console.error('verifyClerkToken error', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware factory to enforce role(s)
function requireRole(allowed) {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  // Validate configured roles early
  for (const r of allowedRoles) {
    if (!ROLES.includes(r)) {
      throw new Error(`Unknown role: ${r}. Allowed roles: ${ROLES.join(', ')}`);
    }
  }

  return [
    verifyClerkToken,
    async (req, res, next) => {
      try {
        const userId = req.auth?.sub || req.auth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Fetch role from database instead of Clerk metadata
        const dbResult = await pool.query(
          'SELECT role FROM users WHERE clerk_user_id = $1 LIMIT 1',
          [userId]
        );
        const role = dbResult.rows[0]?.role;

        if (!role || !ROLES.includes(role)) {
          return res.status(403).json({ error: 'Access denied: no role assigned' });
        }

        if (!allowedRoles.includes(role)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Get email from Clerk for the user object
        const user = await clerkClient.users.getUser(userId);
        req.user = { id: userId, role, email: user.emailAddresses?.[0]?.emailAddress || null };
        next();
      } catch (err) {
        console.error('requireRole error', err);
        res.status(401).json({ error: 'Invalid or expired token' });
      }
    },
  ];
}

module.exports = {
  withAuth,
  requireAuth,
  verifyClerkToken,
  requireRole,
  clerkClient,
  ROLES,
};
