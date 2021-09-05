const db = require('./pg');
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { User } from './users';

type TokenScope = 'write_dogears' | 'manage_dogears';

interface Token {
  id: number,
  user_id: number,
  scope: TokenScope,
  created: Date,
  last_used: Date | null,
  comment: string,
  token?: string,
};

interface Meta {
  pagination: {
    current_page: number,
    prev_page: number | null,
    next_page: number | null,
    total_pages: number,
    total_count: number,
  },
};

export {
  create,
  list,
  destroy,
  findWithUser,
};

export type {
  TokenScope,
  Token,
  Meta,
};

function sha256hash(tokenCleartext: string) {
  return crypto.createHash('sha256').update(tokenCleartext).digest('hex');
}

// Create and store a token; must return the cleartext of the token, as it's
// the only thing that'll ever have it.
async function create(userID: number, scope: TokenScope, comment: string): Promise<Token> {
  let tokenCleartext = `eardoggerv1.${uuidv4()}`;
  let tokenHash = sha256hash(tokenCleartext);
  let result = await db.query(
    "INSERT INTO tokens (user_id, token_hash, scope, comment) VALUES ($1, $2, $3, $4) RETURNING id, created",
    [userID, tokenHash, scope, comment]
  );
  let { id, created } = result.rows[0];
  return {
    id,
    token: tokenCleartext,
    user_id: userID,
    scope,
    created,
    last_used: null,
    comment,
  };
}

// Return paginated list of tokens for a user
async function list(userId: number, page: number = 1, size: number = 50):
  Promise<{
    data: Array<Token>,
    meta: Meta,
  }>
{
  if (page < 0 || size < 0) {
    throw new Error("Can't use negative page or page size.");
  }
  let offset = (page - 1) * size;
  let result = await db.query(
    "SELECT id, user_id, scope, created, comment FROM tokens WHERE user_id = $1 ORDER BY last_used, id DESC LIMIT $2 OFFSET $3",
    [userId, size, offset]
  );
  let countResult = await db.query("SELECT COUNT(*) AS count FROM tokens WHERE user_id = $1", [userId]);
  // Not sure why COUNT() comes back as a string, but hey:
  let count = parseInt(countResult.rows[0].count);
  let totalPages = Math.ceil(count/size);
  let prevPage = page <= 1 ? null : Math.min(page - 1, totalPages);
  let nextPage = page >= totalPages ? null : page + 1;
  return {
    data: result.rows,
    meta: {
      pagination: {
        current_page: page,
        prev_page: prevPage,
        next_page: nextPage,
        total_pages: totalPages,
        total_count: count,
      },
    },
  };
}

async function destroy(userID: number, id: number) {
  let result = await db.query(
    "DELETE FROM tokens WHERE id = $1 AND user_id = $2",
    [id, userID]
  );
  if (result.rowCount === 0) {
    throw new Error("Can't delete that API token. Something must have gone extra wrong.");
  }
}

async function findWithUser(tokenCleartext: string): Promise<{token: Token, user: User} | null> {
  let result = await db.query(
    "SELECT tokens.id AS token_id, users.id AS user_id, tokens.scope, tokens.created AS token_created, tokens.last_used, tokens.comment, users.username, users.email, users.created AS user_created FROM tokens JOIN users ON tokens.user_id = users.id WHERE tokens.token_hash = $1 LIMIT 1",
    [sha256hash(tokenCleartext)]
  );
  if (result.rowCount === 0) {
    // For authorization, we want to distinguish normal 401s from major blowups,
    // so don't throw.
    return null;
  }
  let fields = result.rows[0];
  // Update last_used (tho we're returning the old value.)
  await db.query(
      "UPDATE tokens SET last_used = CURRENT_TIMESTAMP WHERE id = $1",
      [fields.token_id]
  );
  return {
    token: {
      id: fields.token_id,
      user_id: fields.user_id,
      scope: fields.scope,
      created: fields.token_created,
      last_used: fields.last_used,
      comment: fields.comment,
    },
    user: {
      id: fields.user_id,
      username: fields.username,
      email: fields.email,
      created: fields.user_created,
    },
  };
}
