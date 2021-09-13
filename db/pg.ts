import { Pool } from 'pg';

interface Meta {
  pagination: {
    current_page: number,
    prev_page: number | null,
    next_page: number | null,
    total_pages: number,
    total_count: number,
  },
};

export type { Meta };

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

// Helper for building pagination info
function buildMeta(count: number, page: number, size: number): Meta {
  let totalPages = Math.ceil(count/size);
  let prevPage = page <= 1 ? null : Math.min(page - 1, totalPages);
  let nextPage = page >= totalPages ? null : page + 1;
  return {
    pagination: {
      current_page: page,
      prev_page: prevPage,
      next_page: nextPage,
      total_pages: totalPages,
      total_count: count,
    },
  };
}

export {
  query,
  pool,
  buildMeta,
};
