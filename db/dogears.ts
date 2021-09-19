import { query} from './pg';
import { buildMeta } from './helpers';
import type { Meta } from './helpers';
import { URL } from 'url';
import { defaultPageSize } from '../util';

const protocolAndWww = /^((https?:\/\/)?((www|m)\.)*)?/;
function getProtocolAndWww(url: string) {
  let matches = url.match(protocolAndWww);
  if (matches) {
    return matches[0] || '';
  } else {
    return '';
  }
}

// Custom error type
class NoMatchError extends Error {
  constructor(...params: string[]) {
    super(...params);
  }
}

interface Dogear {
  id: number,
  user_id: number,
  prefix: string,
  current: string,
  display_name: string | null,
  updated: Date,
}

// Returns created dogear
type FDogearCreate = (
  userID: number,
  prefix: string,
  current?: string | null,
  displayName?: string | null,
) => Promise<Dogear>;
let create: FDogearCreate = async function(
  userID: number,
  prefix: string,
  current: string | null = null,
  displayName: string | null = null,
): Promise<Dogear> {
  if (prefix == '') {
    throw new TypeError("Create dogear requires at least a URL prefix");
  }
  prefix = prefix.replace(protocolAndWww, '').trim();
  current = (current || prefix).trim();
  displayName = displayName || null; // real null, not undefined.
  if (displayName) {
    displayName = displayName.trim();
  }

  const result = await query("INSERT INTO dogears (user_id, prefix, current, display_name) VALUES ($1, $2, $3, $4) " +
      "ON CONFLICT (user_id, prefix) DO UPDATE SET " +
      "current = $3, updated = current_timestamp, display_name = $4 WHERE " +
      "EXCLUDED.user_id = $1 AND EXCLUDED.prefix = $2 " +
      "RETURNING id, user_id, prefix, current, display_name, updated",
    [
      userID,
      prefix,
      current,
      displayName,
    ]
  );
  return result.rows[0];
}

// Returns array of updated dogears
type FDogearUpdate = (userID: number, current: string) => Promise<Array<Dogear>>;
let update: FDogearUpdate = async function(userID: number, current: string): Promise<Array<Dogear>> {
  current = current.trim();
  try {
    new URL(current);
  } catch(e) {
    throw new TypeError("Update dogear requires a valid URL");
  }
  const result = await query("UPDATE dogears " +
      "SET current = $2, updated = current_timestamp WHERE " +
      "user_id = $1 AND $2 LIKE $3 || prefix || '%' " +
      "RETURNING id, user_id, prefix, current, display_name, updated",
    [userID, current, getProtocolAndWww(current)]
  );
  if (result.rowCount === 0) {
    throw new NoMatchError("No dogears match that URL");
  }
  return result.rows;
}

type FDogearList = (userID: number, page?: number, size?: number) => Promise<{data: Array<Dogear>, meta: Meta}>;
let list: FDogearList = async function(userID: number, page: number = 1, size: number = defaultPageSize): Promise<{data: Array<Dogear>, meta: Meta}> {
  if (page <= 0 || size <= 0) {
    throw new Error("Neither page nor page size can be <= 0.");
  }
  let offset = (page - 1) * size;
  let result = await query(
    "SELECT id, user_id, prefix, current, display_name, updated FROM dogears WHERE user_id = $1 ORDER BY updated DESC LIMIT $2 OFFSET $3",
    [userID, size, offset]
  );
  let countResult = await query(
    "SELECT COUNT(*) AS count FROM dogears WHERE user_id = $1",
    [userID]
  );
  let count = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    meta: buildMeta(count, page, size),
  };
}

type FDogearDestroy = (userID: number, id: number) => Promise<void>;
let destroy: FDogearDestroy = async function(userID: number, id: number): Promise<void> {
  const result = await query(
    "DELETE FROM dogears WHERE id = $2 AND user_id = $1",
    [userID, id]
  );
  if (result.rowCount === 0) {
    throw new Error("Can't delete that");
  }
}

// Returns bare url or false
type FDogearCurrently = (userID: number, urlOrPrefix: string) => Promise<string | false>;
let currently: FDogearCurrently = async function(userID: number, urlOrPrefix: string): Promise<string | false> {
  urlOrPrefix = urlOrPrefix.trim();
  const result = await query(
    "SELECT current FROM dogears WHERE user_id = $1 AND $2 LIKE $3 || prefix || '%' ORDER BY LENGTH(prefix) DESC",
    [userID, urlOrPrefix, getProtocolAndWww(urlOrPrefix)]
  );
  if (result.rows[0]) {
    return result.rows[0].current;
  } else {
    return false;
  }
}

export {
  create,
  update,
  list,
  destroy,
  currently,
  NoMatchError,
}

export type {
  Dogear,
  FDogearCreate,
  FDogearUpdate,
  FDogearList,
  FDogearDestroy,
  FDogearCurrently,
};
