// create and configure express app, which might get set to listen or might not

import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const app = express();

export default app;

import cookieParser from 'cookie-parser';
import session from 'express-session';
const pgSession = require('connect-pg-simple')(session);
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import type { IVerifyOptions as LocalVerifyOptions } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import expressHandlebars from 'express-handlebars';
import { bookmarkletText, resolveFromProjectRoot } from './util';
// Main DB helper (session store needs this)
import * as db from './db/pg';
// Application object DB helpers
import * as dogears from './db/dogears';
import * as users from './db/users';
import * as tokens from './db/tokens';

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // might require same secret as session cookie? also, do I need this once I have session running?

// http://expressjs.com/en/starter/static-files.html
// putting this before session middleware saves some db load.
app.use(express.static(resolveFromProjectRoot('public')));
app.use(express.json());

// configure hbs view engine:
const hbsViews = expressHandlebars.create({
  extname: '.hbs',
  // defaults for layoutsDir and partialsDir
  defaultLayout: 'main', // that's the default but I hate magic and wonder
});

app.engine('hbs', hbsViews.engine); // register for extension
app.set('view engine', 'hbs'); // the default for no-extension views

if (!process.env.SESSION_SECRET) {
  throw new Error("The SESSION_SECRET environment variable wasn't set, and I absolutely demand it. Plz fix your env.");
}

// session handling
let sessionOptions: session.SessionOptions = {
  name: 'eardogger.sessid',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30 * 2, // two months, in milliseconds.
    sameSite: 'none',
    secure: true,
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
};

if (process.env.USE_PROXY) {
  // Setting secure cookies takes some finagling if the client's talking HTTPS
  // to a proxy but it's talking HTTP to us. And we want to set secure cookies
  // because browsers are gonna stop allowing POSTS from foreign sites
  // otherwise, and that's kind of a Thing we do with the bookmarklets.
  app.set('trust proxy', 1);
  sessionOptions.proxy = true;
}
app.use(session(sessionOptions));

// OK, let's passport.js.
passport.use(new LocalStrategy(
  (
    username: string,
    password: string,
    done: (error: any, user?: any, options?: LocalVerifyOptions) => void
  ) => {
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
passport.deserializeUser( (id: number, done) => {
  users.getByID(id).then(userObj => {
    if (userObj) {
      // Set authInfo so we can tell this is a real login session
      done(null, userObj);
    } else {
      done(null, false);
    }
  }).catch(err => {
    done(err);
  });
});
// Then there's token auth. Token authentication only applies to API routes! So
// we'll call passport.authenticate a second time using the bearer strategy if
// we're trying to access an API route.
passport.use(new BearerStrategy(
  (tokenCleartext, done) => {
    tokens.findWithUser(tokenCleartext).then(result => {
      if (result) {
        let { token, user } = result;
        // Third argument to done() is available later at req.authInfo, and
        // we'll need the token scope for authenticating API actions
        done(null, user, { isToken: true, scope: token.scope });
      } else {
        done(null, false);
      }
    }).catch(err => {
      done(err);
    });
  }
));

// ok, and then finally,
app.use(passport.initialize());
app.use(passport.session());
// and then down later, the /login endpoint actually calls the authentication thing.

// Make sure user object is available in templates
app.use(function(req, res, next){
  if (req.user) {
    res.locals.user = req.user;
  }
  next();
});

// Wrapper for bearer token authentication, so we don't even try it unless you
// provided a token in the headers:
let bearerAuthMiddleware = passport.authenticate('bearer', { session: false });
function maybeBearerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.get('Authorization')) {
    // then we have a token
    bearerAuthMiddleware(req, res, next);
  } else {
    next();
  }
}

// API routes live in their own little thing.
import v1api from './api/v1';
app.use('/api/v1', maybeBearerAuthMiddleware, v1api);

// AUTHENTICATION WITH PASSPORT, finally.
// About .authenticate('local')... 'local' is a magic string. I never specified
// it anywhere above, it's just tied to the local authentication strategy, which
// I DID pass in as an object. I don't love that interface, but each strategy
// plugin states its magic string in its docs, so, ok.
app.post('/login', passport.authenticate('local', {
//   successReturnToOrRedirect: '/', // uses req.session.returnTo if present. Undocumented.
  failureRedirect: '/', // it's the login page
}), function(req, res){
  // On success, redirect to wherever you were going. (If authentication failed,
  // passport redirects immediately and this second middleware is never called.)
  if (req.session.returnTo) {
    res.redirect(req.session.returnTo);
  } else {
    res.redirect('/');
  }
});

// Wow, logout is easy.
app.post('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// How about signup.
app.post('/signup', function(req, res, next){
  if (req.user) {
    res.status(403).send("Can't sign up when you're logged in");
  } else {
    const { new_username, new_password, new_password_again, email } = req.body;
    if (new_password !== new_password_again) {
      res.status(400).send("New passwords didn't match");
    } else {
      users.create(new_username, new_password, email).then(user => {
        req.login(user, function(err){
          if (err) {
            return next(err);
          } else {
            return res.redirect('/');
          }
        });
      }).catch(err => {
        res.status(400).send(err.toString());
      })
    }
  }
});

// And password change.
app.post('/changepassword', function(req, res){
  if (!req.user) {
    res.status(401).send("Can't change password if you're logged out");
    return;
  }

  let { username } = req.user;
  let { password, new_password, new_password_again } = req.body;

  if (new_password.length === 0) {
    res.status(400).send("New password was empty")
    return;
  }
  if (new_password !== new_password_again) {
    res.status(400).send("New passwords didn't match");
    return;
  }

  users.authenticate(username, password).then(authenticated => {
    if (!authenticated) {
      res.status(403).send("Current password was wrong");
      return;
    }

    users.setPassword(username, new_password).then(() => {
      res.redirect('/');
    }).catch(err => {
      res.status(500).send(err.toString());
    });
  })

});

// Account page
app.get('/account', function(req, res){
  if (req.user) {
    res.render('account', {title: 'Manage account'});
  } else {
    res.status(401).send("Can't manage account if you're logged out");
  }
});

// Status endpoint
app.get('/status', function(req, res) {
  res.sendStatus(204);
});

function templateDogears(dogearsList: Array<dogears.Dogear>) {
  return dogearsList.map(mark => ({
    id: mark.id,
    current: mark.current,
    linkText: mark.display_name || mark.prefix,
    updatedString: (new Date(mark.updated)).toLocaleDateString(),
  }));
}

// Homepage!
app.get('/', function(req, res, next) {
  if (req.user) {
    let { id, username } = req.user;
    dogears.list(id).then((dogearsList) => {
      res.render('index', {
        title: `${username}'s Dogears`,
        dogears: templateDogears(dogearsList),
      });
    }).catch(err => { return next(err); });
  } else {
    res.render('login', {title: 'Log in'});
  }
});

// Dogears list as an HTML fragment (just LIs without a surrounding UL)
app.get('/fragments/dogears', function(req, res, next) {
  if (req.user) {
    dogears.list(req.user.id).then(dogearsList => {
      res.render('fragments/dogears', {
        layout: false,
        dogears: templateDogears(dogearsList),
      });
    }).catch(err => { return next(err); });
  } else {
    res.sendStatus(404);
  }
});

// Install info page
let cachedBookmarklets: Array<Promise<string>>;
app.get('/install', function(req, res){
  if (typeof cachedBookmarklets === 'undefined') {
    cachedBookmarklets = [
      bookmarkletText('mark'),
      bookmarkletText('where'),
      bookmarkletText('markWithToken', 'eardoggerv1.f33994b8-f7fd-40b5-ab74-81f48fcc3185'),
    ]
  }
  Promise.all(cachedBookmarklets).then( ([mark, where, markWithToken]) => {
    res.render('install', {title: 'Install', mark, where, markWithToken});
  });
});

// Faq
app.get('/faq', function(req, res){
  res.render('faq', {title: 'How to'});
});

// UI version of updating a dogear; redirects instead of returning json
app.get('/mark/:url', function(req, res){
  if (req.user) {
    dogears.update(req.user.id, req.params.url).then(updatedDogears => {
      res.render('marked', {title: 'Saved your place', url: req.params.url, updatedDogears});
    }).catch(err => {
      if (err instanceof dogears.NoMatchError) {
        res.render('create', {title: 'Dogear this?', url: req.params.url});
      } else {
        res.render('error', {title: 'Tried but failed', error: err.toString()});
      }
    })
  } else {
    req.session.returnTo = req.originalUrl;
    res.render('login', {title: 'Log in'});
  }
});

// UI version of creating a dogear; should probably only be posted to from /mark/:url.
app.post('/mark', function(req, res){
  if (req.user) {
    const {prefix, current, display_name} = req.body;
    dogears.create(req.user.id, prefix, current, display_name).then(dogear => {
      res.render('marked', {title: 'Saved your place', url: current, updatedDogears: [dogear]});
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

// Immediately redirect, if there's a dogear to go to.
app.get('/resume/:url', function(req, res){
  if (req.user) {
    dogears.currently(req.user.id, req.params.url).then(current => {
      if (current) {
        res.redirect(current);
      } else {
        // currently() returns false if no dogear matched. Could probably stand
        // to make that more consistent w/ update().
        res.render('create', {title: 'Dogear this?', url: req.params.url});
      }
    }).catch(err => {
      res.render('error', {title: 'Tried but failed', error: err.toString()});
    })
  } else {
    req.session.returnTo = req.originalUrl;
    res.render('login', {title: 'Log in'});
  }
});
