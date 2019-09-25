// create and configure express app, which might get set to listen or might not

const express = require('express');

const app = express();

module.exports = app;

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressHandlebars = require('express-handlebars');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); // might require same secret as session cookie? also, do I need this once I have session running?

// Main DB helper (session store needs this)
const db = require('./db/pg');

// Application object DB helpers
const dogears = require('./db/dogears');
const users = require('./db/users');

// http://expressjs.com/en/starter/static-files.html
// putting this before session middleware saves some db load.
app.use(express.static('public'));
app.use(express.json());

// configure hbs view engine:
const hbsViews = expressHandlebars.create({
  extname: '.hbs',
  // defaults for layoutsDir and partialsDir
  defaultLayout: 'main', // that's the default but I hate magic and wonder

});
app.engine('hbs', hbsViews.engine); // register for extension
app.set('view engine', 'hbs'); // the default for no-extension views


// session handling
const sessionPersist = session({
  name: 'eardogger.sessid',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30 * 2, // two months, in milliseconds.
    sameSite: false,
    httpOnly: false,
  },
  store: new pgSession({
    pool: db.pool,
    pruneSessionInterval: 60 * 60, // an hour, in seconds.
  }),
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  rolling: true,
  resave: false,
  unset: 'destroy',
});

app.use(sessionPersist);

// OK, let's passport.js.
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Authenticate password and return user object
    users.authenticate(username, password).then(success => {
      if (success) {
        users.getByName(username).then(userObj => {
          done(null, userObj);
        })
      } else {
        done(null, false);
      }
    }).catch(err => {
      done(err);
    });
  }
));
// then there's session persistence helpers...
// pluck an identifier out of the user object so we can stash it in the session:
passport.serializeUser( (user, done) => {
  done(null, user.id);
});
// use an identifier from a session to find and return a user:
passport.deserializeUser( (id, done) => {
  users.getByID(id).then(userObj => {
    if (userObj) {
      done(null, userObj);
    } else {
      done(null, false);
    }
  }).catch(err => {
    done(err);
  });
});

// ok, and then finally,
app.use(passport.initialize());
app.use(passport.session());
// and then down later, the /login endpoint actually calls the authentication thing.


// API routes live in their own little thing.
const v1api = require('./api/v1');
app.use('/api/v1', v1api);

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
  successReturnToOrRedirect: '/', // uses req.session.returnTo if present
  failureRedirect: '/', // should be /login but I don't have that yet
}) );


// GL: http://expressjs.com/en/starter/basic-routing.html
// Hey, do I have to call passport.authenticate on every route I want to protect?
// it looks like not, but I guess we'll find out.
app.get('/', function(req, res) {
  if (req.user) {
    res.render('index', {title: `${req.user.username}'s Dogears`});
  } else {
    res.render('login', {title: 'Log in'});
  }
});

app.get('/mark/:url', function(req, res){
  if (req.user) {
    dogears.update(req.user.id, req.params.url).then(updatedDogears => {
      res.render('marked', {title: 'Marked your place', url: req.params.url, updatedDogears});
    }).catch(err => {
      if (err instanceof dogears.NoMatchError) {
        res.render('create', {title: 'Make a new dogear', url: req.params.url});
      } else {
        res.render('error', {title: 'Tried but failed', error: err.toString()});
      }
    })
  } else {
    req.session.returnTo = req.originalUrl;
    res.render('login', {title: 'Log in'});
  }
});

app.post('/mark', function(req, res){
  if (req.user) {
    const {prefix, current, display_name} = req.body;
    dogears.create(req.user.id, prefix, current, display_name).then(dogear => {
      res.render('marked', {title: 'Marked your place', url: current, updatedDogears: [dogear]});
    }).catch(err => {
      res.render('error', {title: 'Tried but failed', error: err.toString()});
    })
  } else {
    // There's not really anywhere to return to, since this is a post
    // endpoint... really, you just shouldn't ever find yourself in this
    // situation. The only thing posting to /mark is /mark/:url on a miss.
    res.redirect('/');
  }
});

app.get('/resume/:url', function(req, res){
  if (req.user) {
    dogears.currently(req.user.id, req.params.url).then(current => {
      res.redirect(current);
    }).catch(err => {
      res.render('error', {title: 'Tried but failed', error: err.toString()});
    })
  } else {
    req.session.returnTo = req.originalUrl;
    res.render('login', {title: 'Log in'});
  }
});