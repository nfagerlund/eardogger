const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

module.exports = {
  query: (text, params, callback) => {
    pool.query(text, params, (err, res) => {
      console.log(res);
      try {
        callback(err, res.rows)
      } catch (e) {
        callback(err, null)
      }
    });
  }
};
