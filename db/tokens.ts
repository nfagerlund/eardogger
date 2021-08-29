const db = require('./pg');
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

type TokenScope = 'write_dogears' | 'manage_dogears';
interface Token {
  id: number,
  user_id: number,
  scope: TokenScope,
  comment: string,
  token?: string,
};

module.exports = {
  create,
};

// Create and store a token; must return the cleartext of the token, as it's
// the only thing that'll ever have it.
async function create(userID: number, scope: TokenScope, comment: string): Promise<Token> {
  let tokenCleartext = `eardoggerv1.${uuidv4()}`;
  let tokenHash = crypto.createHash('sha256').update(tokenCleartext).digest('hex');
  let result = await db.query(
    "INSERT INTO tokens (user_id, token_hash, scope, comment) VALUES ($1, $2, $3, $4) RETURNING id",
    [userID, tokenHash, scope, comment]
  );
  let id = result.rows[0].id;
  return {
    id,
    token: tokenCleartext,
    user_id: userID,
    scope,
    comment,
  };
}
