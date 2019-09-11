// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(express.json());

// init sqlite db
var fs = require('fs');
var dbFile = './.data/sqlite.db';
var exists = fs.existsSync(dbFile);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dbFile);

// GL: if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  if (!exists) {
    db.run('CREATE TABLE Dreams (dream TEXT)');
    console.log('New table Dreams created!');
    
    // insert default dreams
    db.serialize(function() {
      db.run('INSERT INTO Dreams (dream) VALUES ("Find and count some sheep"), ("Climb a really tall mountain"), ("Wash the dishes")');
    });
  }
  else {
    console.log('Database "Dreams" ready to go!');
    db.each('SELECT * from Dreams', function(err, row) {
      if ( row ) {
        console.log('record:', row);
      }
    });
  }
});

// NF: init dogears table
db.serialize(function(){
  db.run('CREATE TABLE IF NOT EXISTS Dogears (prefix TEXT PRIMARY KEY NOT NULL, current TEXT)');
});

function createDogear(prefix, current) {
  if (!current) {
    current = prefix;
  }
  db.serialize(function(){
    db.run('INSERT OR REPLACE INTO Dogears (prefix, current) VALUES (?, ?)', [prefix, current]);
  });
}

// Hmm, this probably breaks if there are multiple matching prefixes. Or, just blitzes one of them.
function updateDogear(current) {
  let ok = true;
  db.serialize(function(){
    db.run(
      'UPDATE Dogears ' + 
        'SET current = $current WHERE ' +
        '$current LIKE "http://"  || prefix || "%" OR ' +
        '$current LIKE "https://" || prefix || "%" ' +
        'ORDER BY length(prefix) DESC ' +
        'LIMIT 1', 
      {$current: current}, 
      function(err){
        if (err) {
          ok = false;
        }
      }
    );
  });
  return ok;
}

function getDogear(url) {
  let ok = true;
  let result = false;
  db.serialize(function(){
    db.get(
      'SELECT current FROM Dogears WHERE ' +
        '$url LIKE "http://"  || prefix || "%" OR ' +
        '$url LIKE "https://" || prefix || "%" ' +
        'ORDER BY length(prefix) DESC', 
      {$url: url}, function(err, row){
      result = row.current;
    });
  });
  return result;
}

// updateDogear('https://example.com/comic/20');

app.post('/update')

// GL: http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// endpoint to get all the dreams in the database
// currently this is the only endpoint, ie. adding dreams won't update the database
// read the sqlite3 module docs and try to add your own! https://www.npmjs.com/package/sqlite3
app.get('/getDreams', function(request, response) {
  db.all('SELECT * from Dreams', function(err, rows) {
    response.send(JSON.stringify(rows));
  });
});

app.post('/writeDream', function(request, response) {
  db.serialize(function() {
    db.run('INSERT INTO Dreams (dream) VALUES (?)', request.body.dream);
  });
  response.sendStatus(201);
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
