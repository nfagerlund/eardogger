const db = require(./pg);

const getProtocol = url => url.match(/^https?:\/\//)[0];

module.exports = {

  // TODO: currently does nothing with userID
  // UNKNOWN: I think this promise will reject if there's an error bc of await, but need to check. I'm not returning anything per se.
  async create(userID, prefix, current, displayName) {
    prefix = prefix.replace(/^https?:\/\//, '');
    current = current || prefix;
    displayName = displayName || null; // real null, not undefined.

    await db.query("INSERT INTO dogears (prefix, current, current_protocol, display_name) VALUES ($1, $2, $3, $4) " +
        "ON CONFLICT (prefix) DO UPDATE " +
        "SET current = $2, current_protocol = $3, updated = current_timestamp WHERE " +
        "$2 LIKE $3 || EXCLUDED.prefix || '%'",
      [prefix, current, getProtocol(current), displayName]
    );
  },

  // TODO: same
  async update(userID, current) {
    await db.query("UPDATE dogears " +
        "SET current = $1, current_protocol = $2, updated = current_timestamp WHERE " +
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
