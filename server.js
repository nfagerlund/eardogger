// server.js
// where your node app starts

// init project
const express = require('express');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); // might require same secret as session cookie? also, do I need this once I have session running?

// Use postgres with callbacks for db
const db = require('./db/pg_sync');

// http://expressjs.com/en/starter/static-files.html
// putting this before session middleware saves some db load.
app.use(express.static('public'));
app.use(express.json());

// session handling - kind of nervous about how much stuff I'm needing to enable at once here
const flakySession = session({
  cookie: {
    expires: new Date('2099-01-05'),
    sameSite: false,
    httpOnly: false,
  },
  secret: "replace this with something good and probably get it from environment",
  saveUninitialized: false,
});

app.use(flakySession);

// OK, let's passport.js.
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Here comes the logic that checks whether the creds are any good,
    // probably by checking the database:
    if (username === 'nick' && password === 'aoeuhtns') {
      done(null, {username: 'nick', id: 1, otherStuff: 'whatever'});
      // ...but guess what, you're always Nick, so suck on that.
      // I guess wherever you go, there you are.
    } else {
      done(null, false);
      // ...unless u done fukked up.
    }
  }
));
// then there's session persistence helpers...
// pluck an identifier out of the user object so we can stash it in the session:
passport.serializeUser( (user, done) => {
  done(null, user.id);
});
// use an identifier from a session to find and return a user:
passport.deserializeUser( (id, done) => {
  if (id === 1) {
    done(null, {username: 'nick', id: 1, otherStuff: 'whatever'});
  } else {
    done("you got it wrong, your best friend is *Carlos.* // Carlos: 'I don't trust u.'")
  }
});

// ok, and then finally,
app.use(passport.initialize());
app.use(passport.session());
// and then down later, the /login endpoint actually calls the authentication thing.

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
    console.log('got an options preflight request for cors');
    //respond with 200
    res.send(200);
  }
  else {
    //move on
    next();
  }
});

// AUTHENTICATION WITH PASSPORT, finally. ok, so it's using the multiple callbacks signature,
// which just does them in sequence, but they can call next('route') to skip the rest
// of the sequence, or just return immediately. Which Passport actually does; if
// authentication fails, it just 401s. But now that I read more, the authenticate function
// can also take an object with redirect properties as its second argument.... maybe
// that's the move instead. Hmm.
// Man, that authenticate('local') bit really gets my goat. 'local' is a magic
// string, I never specified it anywhere above, it's just tied to the local
// authentication strategy, which I DID pass in as an object. Each strategy
// plugin states its magic string in its docs, but good gravy. I hate this.
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/', // should be /login but I don't have that yet
}) );

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
  if ( req.isAuthenticated && req.isAuthenticated() ) {
    db.query(
      "UPDATE dogears " +
        "SET current = $1, current_protocol = $2, updated = current_timestamp WHERE " +
        "$1 LIKE $2 || prefix || '%'",
      [req.body.current, req.body.current.match(/^https?:\/\//)[0]],
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
  if ( req.isAuthenticated && req.isAuthenticated() ) {
    let prefix = req.body.prefix.replace(/^https?:\/\//, '');
    let current = req.body.current || req.body.prefix;
    let display_name = req.body.display_name || null; // want real null, not undefined -> empty string

    db.query("INSERT INTO dogears (prefix, current, current_protocol, display_name) VALUES ($1, $2, $3, $4) " +
        "ON CONFLICT (prefix) DO UPDATE " +
        "SET current = $2, current_protocol = $3 WHERE " +
        "$2 LIKE $3 || EXCLUDED.prefix || '%'",
      [prefix, current, current.match(/^https?:\/\//)[0], display_name],
      (err, rows)=>{
        if (err) {
          console.log(err)
        }
      }
    );

    res.sendStatus(201);
  } else {
    res.sendStatus(401);
  }
});

// API: list
app.get('/list', function(req, res){
  if ( req.isAuthenticated && req.isAuthenticated() ) {
    db.query(
      'SELECT prefix, current, display_name, updated FROM dogears ORDER BY updated DESC',
      [],
      (err, rows) => {
        res.send(JSON.stringify(rows));
      }
    );
  } else {
    res.sendStatus(401);
  }
});

// GL: http://expressjs.com/en/starter/basic-routing.html
// Hey, do I have to call passport.authenticate on every route I want to protect?
// it looks like not, but I guess we'll find out.
app.get('/', function(request, response) {
  if (request.user) {
    response.sendFile(__dirname + '/views/index.html');
  } else {
    response.sendFile(__dirname + '/views/login.html');
  }
});

// listen for requests
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
