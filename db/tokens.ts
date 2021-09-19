import { query } from './pg';
import { buildMeta } from './helpers';
import type { Meta } from './helpers';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { User } from './users';
import { defaultPageSize } from '../util';

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

function sha256hash(tokenCleartext: string) {
  return crypto.createHash('sha256').update(tokenCleartext).digest('hex');
}

// Create and store a token; must return the cleartext of the token, as it's
// the only thing that'll ever have it.
type FTokenCreate = (userID: number, scope: TokenScope, comment: string) => Promise<Token>;
let create: FTokenCreate = async function(userID: number, scope: TokenScope, comment: string): Promise<Token> {
  let tokenCleartext = `eardoggerv1.${uuidv4()}`;
  let tokenHash = sha256hash(tokenCleartext);
  let result = await query(
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
type FTokenList = (userId: number, page?: number, size?: number) => Promise<{data: Array<Token>, meta: Meta}>;
let list: FTokenList = async function(userId: number, page: number = 1, size: number = defaultPageSize):
  Promise<{
    data: Array<Token>,
    meta: Meta,
  }>
{
  if (page <= 0 || size <= 0) {
    throw new Error("Neither page nor page size can be <= 0.");
  }
  let offset = (page - 1) * size;
  let result = await query(
    "SELECT id, user_id, scope, created, last_used, comment FROM tokens WHERE user_id = $1 ORDER BY last_used, id DESC LIMIT $2 OFFSET $3",
    [userId, size, offset]
  );
  let countResult = await query("SELECT COUNT(*) AS count FROM tokens WHERE user_id = $1", [userId]);
  // Not sure why COUNT() comes back as a string, but hey:
  let count = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    meta: buildMeta(count, page, size),
  };
}

type FTokenDestroy = (userID: number, id: number) => Promise<void>;
let destroy: FTokenDestroy = async function(userID: number, id: number): Promise<void> {
  let result = await query(
    "DELETE FROM tokens WHERE id = $1 AND user_id = $2",
    [id, userID]
  );
  if (result.rowCount === 0) {
    throw new Error("Can't delete that API token. Something must have gone extra wrong.");
  }
}

type FTokenFindWithUser = (tokenCleartext: string) => Promise<{token: Token, user: User} | null>;
let findWithUser: FTokenFindWithUser = async function(tokenCleartext: string): Promise<{token: Token, user: User} | null> {
  let result = await query(
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
  await query(
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

// Why `let name: T = async function()...` and exports at the bottom, instead of
// hoisted function statements? Because there's no way to annotate the overall
// type of a function statement, AFAICT, so I need the var assignment. LE SIGH.
export {
  create,
  list,
  destroy,
  findWithUser,
};

export type {
  TokenScope,
  Token,
  FTokenCreate,
  FTokenList,
  FTokenDestroy,
  FTokenFindWithUser,
};
