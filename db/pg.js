const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  // Returns a promise that resolves to a pg.Result, which has .rows, .fields, and .rowCount.
  // https://node-postgres.com/api/result
  query: (text, params) => pool.query(text, params),
  pool: pool,
};
