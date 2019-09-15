// glitch data dir, not in repo.
const dbFile = '../.data/sqlite.db';
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

module.exports = {
  // Returns nothing, you gotta do everything in the callback.
  // Params can be array or object, depending on placeholders
  // Callback signature is (err, rows) => {}
  query: (text, params, callback) => {
    db.serialize( () => {
      db.all(text, params, callback);
    });
  }
}
