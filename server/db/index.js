const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prevent uncaught exceptions from idle client errors crashing the process
pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err.message);
});

module.exports = pool;
