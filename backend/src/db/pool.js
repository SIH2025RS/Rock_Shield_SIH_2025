const { Pool } = require('pg');
const config = require('../config/config');

let poolConfig;
if (config.db.connectionString) {
  poolConfig = { connectionString: config.db.connectionString, ssl: config.db.ssl };
} else {
  poolConfig = {
    host: config.db.host || 'localhost',
    port: config.db.port || 5432,
    user: config.db.user || 'postgres',
    password: config.db.password || '',
    database: config.db.database || 'rock_shield',
    ssl: config.db.ssl,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
  process.exit(1);
});

module.exports = pool;
