require('dotenv').config();
const { clerkClient } = require('@clerk/express');
const pool = require('./pool');

// Shared test logins for local development, one per role, read from TEST_<ROLE>_* in .env.
// "+clerk_test" addresses never receive real email; Clerk accepts 424242 as their verification code.
const TEST_ACCOUNTS = [
  { envPrefix: 'TEST_ADMIN', lastName: 'Admin', role: 'system_admin' },
  { envPrefix: 'TEST_OPERATOR', lastName: 'Operator', role: 'operator' },
  { envPrefix: 'TEST_MINER', lastName: 'Miner', role: 'miner' },
].map(({ envPrefix, lastName, role }) => ({
  envPrefix,
  username: process.env[`${envPrefix}_USERNAME`],
  email: process.env[`${envPrefix}_EMAIL`],
  password: process.env[`${envPrefix}_PASSWORD`],
  firstName: 'Test',
  lastName,
  role,
}));

async function findOrCreateClerkUser(account) {
  const { data } = await clerkClient.users.getUserList({ emailAddress: [account.email] });
  if (data.length > 0) return { user: data[0], created: false };

  const user = await clerkClient.users.createUser({
    emailAddress: [account.email],
    username: account.username,
    password: account.password,
    firstName: account.firstName,
    lastName: account.lastName,
    publicMetadata: { role: account.role },
  });
  return { user, created: true };
}

// Ensure every test account exists in Clerk and has its role in the users table
async function seedTestAccounts() {
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn('Test account seed skipped: CLERK_SECRET_KEY is not set');
    return;
  }

  for (const account of TEST_ACCOUNTS) {
    if (!account.username || !account.email || !account.password) {
      console.warn(`Test account seed skipped ${account.role}: set ${account.envPrefix}_USERNAME, _EMAIL and _PASSWORD`);
      continue;
    }
    const { user, created } = await findOrCreateClerkUser(account);
    await pool.query(
      `INSERT INTO users (clerk_user_id, role, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (clerk_user_id) DO UPDATE
         SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, updated_at = now()`,
      [user.id, account.role, `${account.firstName} ${account.lastName}`]
    );
    console.log(`✓ Test account ${account.username} / ${account.email} (${account.role})${created ? ' created in Clerk' : ''}`);
  }
}

if (require.main === module) {
  seedTestAccounts()
    .catch((err) => {
      console.error('Test account seed failed:', err.errors?.[0]?.longMessage || err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { seedTestAccounts, TEST_ACCOUNTS };
