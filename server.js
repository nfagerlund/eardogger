// server.js
// where your node app starts

// init project
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(express.json());

// corrrrrsssssssss
// s/o to http://johnzhang.io/options-request-in-express
// (via https://support.glitch.com/t/how-do-i-do-a-cors-on-my-api/7497/8)
app.use(function(req, res, next){
  // works w/ cookies:
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  // doesn't work w/ cookies:
  // res.header("Access-Control-Allow-Origin", '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  //intercepts OPTIONS method
  if ('OPTIONS' === req.method) {
    //respond with 200
    res.send(200);
  }
  else {
  //move on
    next();
  }
});

// Use sqlite for db
const db = require('./db/pg_sync');

// bad, replace later:

// function getDogear(url) {
//   let ok = true;
//   let result = false;
//   db.serialize(function(){
//     db.get(
//       'SELECT current FROM Dogears WHERE ' +
//         '$url LIKE "http://"  || prefix || "%" OR ' +
//         '$url LIKE "https://" || prefix || "%" ' +
//         'ORDER BY length(prefix) DESC',
//       {$url: url}, function(err, row){
//       result = row.current;
//     });
//   });
//   return result;
// }

// API: update
// Hmm, this probably breaks if there are multiple matching prefixes. Or, just blitzes one of them.
// so, uhhhh for the prototype just don't do that.
// btw I tried using sqlite's ORDER BY + LIMIT feature for update, but the version
// linked into the nodejs module does not actually support that and just syntax errors. BOO.
app.post('/update', function(req, res){
  // TODO: that's fake auth
  if (req.cookies['test-session'] === 'aoeuhtns') {
    db.query(
      "UPDATE Dogears " +
        "SET current = $1 WHERE " +
        "$1 LIKE 'http://'  || prefix || '%' OR " +
        "$1 LIKE 'https://' || prefix || '%' ",
      [req.body.current],
      function(err){
        if (err) {
          console.log(err);
          res.sendStatus(404);
        } else {
          res.sendStatus(200);
        }
      }
    );
  } else {
    // Move this into a middleware once I have real sessions working
    res.status(401);
    // debug:
    res.send(JSON.stringify(req.cookies));
  }
});

// API: create
app.post('/create', function(req, res){
  let prefix = req.body.prefix.replace(/^https?:\/\//, '');
  let current = req.body.current || req.body.prefix;
  // Hmm, no error handling, I guess...
  db.query("INSERT INTO Dogears (prefix, current) VALUES ($1, $2) ON CONFLICT (prefix) DO UPDATE " +
      "SET current = $2 WHERE " +
      "$2 LIKE 'http://'  || EXCLUDED.prefix || '%' OR " +
      "$2 LIKE 'https://' || EXCLUDED.prefix || '%' ",
    [prefix, current],
    (err, rows)=>{
      if (err) {
        console.log(err)
      }
    }
  );

  res.sendStatus(201);
});

// API: list
app.get('/list', function(req, res){
  db.query(
    'SELECT current FROM Dogears ORDER BY prefix ASC',
    [],
    (err, rows) => {
      res.send(JSON.stringify(rows));
    }
  );
});

// GL: http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
