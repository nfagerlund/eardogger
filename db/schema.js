const db = require('./pg_sync');
db.query('CREATE TABLE IF NOT EXISTS Dogears (prefix TEXT PRIMARY KEY NOT NULL, current TEXT)', [], function(err, res) {console.log(res)});
