const db = require('./pg');

const getProtocol = url => url.match(/^(https?:\/\/)?/)[0];

module.exports = {

  // TODO: currently does nothing with userID
  async create(userID, prefix, current, displayName) {
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

  // TODO: same
  async update(userID, current) {
    await db.query("UPDATE dogears " +
        "SET current = $2, updated = current_timestamp WHERE " +
        "user_id = $1 AND $2 LIKE $3 || prefix || '%'",
      [userID, current, getProtocol(current)]
    );
  },

  // TODO: same
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

  async currently(url) {

  },




}
