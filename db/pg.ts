import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Returns a promise that resolves to a pg.Result, which has .rows, .fields, and .rowCount.
// https://node-postgres.com/api/result
function query(text: string, params: Array<any>) {
  return pool.query(text, params);
}

export {
  query,
  pool,
};
