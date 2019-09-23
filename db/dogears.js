const db = require('./pg');

const getProtocol = url => url.match(/^(https?:\/\/)?/)[0];

module.exports = {

  async create(userID, prefix, current, displayName) {
    if (typeof userID != 'number') {
      throw new Error("Create dogear requires numeric userID");
    }
    if (!prefix) {
      throw new Error("Create dogear requires at least a URL prefix");
    }
    prefix = prefix.replace(/^https?:\/\//, '');
    current = current || prefix;
    displayName = displayName || null; // real null, not undefined.

    await db.query("INSERT INTO dogears (user_id, prefix, current, display_name) VALUES ($1, $2, $3, $4) " +
        "ON CONFLICT (user_id, prefix) DO UPDATE " +
        "SET current = $3, updated = current_timestamp WHERE " +
        "EXCLUDED.user_id = $1 AND $3 LIKE $5 || EXCLUDED.prefix || '%'",
      [
        userID,
        prefix,
        current,
        displayName,
        getProtocol(current),
      ]
    );
  },

  async update(userID, current) {
    if (typeof userID != 'number') {
      throw new Error("Update dogear requires numeric userID");
    }
    if (!prefix) {
      throw new Error("Update dogear requires a URL");
    }
    await db.query("UPDATE dogears " +
        "SET current = $2, updated = current_timestamp WHERE " +
        "user_id = $1 AND $2 LIKE $3 || prefix || '%'",
      [userID, current, getProtocol(current)]
    );
  },

  async list(userID) {
    let result = await db.query(
      'SELECT id, prefix, current, display_name, updated FROM dogears WHERE user_id = $1 ORDER BY updated DESC',
      [userID]
    );
    return result.rows;
  },

  async delete(id) {

  },

  async edit(id, editFields) {

  },

  // Returns bare url or false
  async currently(userID, urlOrPrefix) {
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
  },




}
