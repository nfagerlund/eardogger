const db = require('./pg');
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

type TokenScope = 'write_dogears' | 'manage_dogears';
interface Token {
  id: number,
  user_id: number,
  scope: TokenScope,
  created: Date,
  comment: string,
  token?: string,
};
interface User {
  id: number,
  username: string,
  email: string,
  created: Date,
};

module.exports = {
  create,
  list,
  destroy,
  findWithUser,
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
  let { id, created } = result.rows[0].id;
  return {
    id,
    token: tokenCleartext,
    user_id: userID,
    scope,
    created,
    comment,
  };
}

async function list(userId: number): Promise<Array<Token>> {
  let result = await db.query(
    "SELECT id, user_id, scope, created, comment FROM tokens WHERE user_id = $1",
    [userId]
  );
  return result.rows;
}

async function destroy(userID: number, id: number) {
  let result = await db.query(
    "DELETE FROM tokens WHERE id = $1 AND user_id = $2",
    [id, userID]
  );
  if (result.rowCount === 0) {
    throw new Error("Can't delete that");
  }
}

async function findWithUser(tokenCleartext: string): Promise<{token: Token, user: User}> {
  let result = await db.query(
    "SELECT tokens.id AS token_id, users.id AS user_id, tokens.scope, tokens.created AS token_created, tokens.comment, users.username, users.email, users.created AS user_created FROM tokens JOIN users ON tokens.user_id = users.id WHERE tokens.token_hash = $1 LIMIT 1",
    [sha256hash(tokenCleartext)]
  );
  let fields = result.rows[0];
  return {
    token: {
      id: fields.token_id,
      user_id: fields.user_id,
      scope: fields.scope,
      created: fields.token_created,
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
