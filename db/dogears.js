const db = require('./pg');

const getProtocol = url => url.match(/^(https?:\/\/)?/)[0];

module.exports = {
  create,
  update,
  list,
  destroy,
//   edit,
  currently,
}


// Returns created dogear
async function create(userID, prefix, current, displayName) {
  if (typeof userID != 'number') {
    throw new Error("Create dogear requires numeric userID");
  }
  if (!prefix) {
    throw new Error("Create dogear requires at least a URL prefix");
  }
  prefix = prefix.replace(/^https?:\/\//, '');
  current = current || prefix;
  displayName = displayName || null; // real null, not undefined.

  const result = await db.query("INSERT INTO dogears (user_id, prefix, current, display_name) VALUES ($1, $2, $3, $4) " +
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
async function update(userID, current) {
  if (typeof userID != 'number') {
    throw new Error("Update dogear requires numeric userID");
  }
  if (!current) {
    throw new Error("Update dogear requires a URL");
  }
  const result = await db.query("UPDATE dogears " +
      "SET current = $2, updated = current_timestamp WHERE " +
      "user_id = $1 AND $2 LIKE $3 || prefix || '%' " +
      "RETURNING id, user_id, prefix, current, display_name, updated",
    [userID, current, getProtocol(current)]
  );
  if (result.rowCount === 0) {
    throw new Error("No dogears match that URL");
  }
  return result.rows;
}

async function list(userID) {
  const result = await db.query(
    "SELECT id, user_id, prefix, current, display_name, updated FROM dogears WHERE user_id = $1 ORDER BY updated DESC",
    [userID]
  );
  return result.rows;
}

async function destroy(userID, id) {
  const result = await db.query(
    "DELETE FROM dogears WHERE id = $2 AND user_id = $1",
    [userID, id]
  );
  if (result.rowCount === 0) {
    throw new Error("Can't delete that");
  }
}

async function edit(id, editFields) {

}

// Returns bare url or false
async function currently(userID, urlOrPrefix) {
  if (!userID || !urlOrPrefix) {
    throw new Error("Finding a dogear requires a userID");
  }
  const result = await db.query(
    "SELECT current FROM dogears WHERE user_id = $1 AND $2 LIKE $3 || prefix || '%' ORDER BY LENGTH(prefix) DESC",
    [userID, urlOrPrefix, getProtocol(urlOrPrefix)]
  );
  if (result.rows[0]) {
    return result.rows[0].current;
  } else {
    return false;
  }
}
