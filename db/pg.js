const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

module.exports = {
  // Returns a promise
  query: (text, params) => pool.query(text, params),
  pool: pool,
};
