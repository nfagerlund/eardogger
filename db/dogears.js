const db = require('./pg');

const getProtocol = url => url.match(/^https?:\/\//)[0];

module.exports = {

  // TODO: currently does nothing with userID
  async create(userID, prefix, current, displayName) {
    prefix = prefix.replace(/^https?:\/\//, '');
    current = current || prefix;
    displayName = displayName || null; // real null, not undefined.

    await db.query("INSERT INTO dogears (prefix, current, display_name) VALUES ($1, $2, $3) " +
        "ON CONFLICT (prefix) DO UPDATE " +
        "SET current = $2, updated = current_timestamp WHERE " +
        "$2 LIKE $4 || EXCLUDED.prefix || '%'",
      [prefix, current, displayName, getProtocol(current)]
    );
  },

  // TODO: same
  async update(userID, current) {
    await db.query("UPDATE dogears " +
        "SET current = $1, updated = current_timestamp WHERE " +
        "$1 LIKE $2 || prefix || '%'",
      [current, getProtocol(current)]
    );
  },

  // TODO: same
  async list(userID) {
    let result = await db.query(
      'SELECT prefix, current, display_name, updated FROM dogears ORDER BY updated DESC',
      []
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
