// create and configure express app, which might get set to listen or might not

import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const app = express();

export default app;

import cookieParser from 'cookie-parser';
import initializeSession from './session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import type { IVerifyOptions as LocalVerifyOptions } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import expressHandlebars from 'express-handlebars';
import { bookmarkletText, resolveFromProjectRoot, normalizeIntParam, defaultPageSize } from './util';
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
  helpers: {
    gt: function(lhs: number, rhs: number) {
      return lhs > rhs;
    },
  },
});

app.engine('hbs', hbsViews.engine); // register for extension
app.set('view engine', 'hbs'); // the default for no-extension views


if (process.env.USE_PROXY) {
  // Setting secure cookies takes some finagling if the client's talking HTTPS
  // to a proxy but it's talking HTTP to us. And we want to set secure cookies
  // because browsers are gonna stop allowing POSTS from foreign sites
  // otherwise, and that's kind of a Thing we do with the bookmarklets.
  // PART ONE: (see session.ts for part two)
  app.set('trust proxy', 1);
}

// Session handling
app.use(initializeSession());

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
// Query params: page, size
app.get('/account', function(req, res, next){
  if (req.user) {
    let page = normalizeIntParam(req.query.page, 1);
    let size = normalizeIntParam(req.query.size, defaultPageSize);
    tokens.list(req.user.id, page, size).then(tokensResponse => {
      let tokensList = templateTokens(tokensResponse.data);
      let pagination = tokensResponse.meta.pagination;
      res.render('account', {
        title: 'Manage account',
        tokens: tokensList,
        pagination,
        pageSize: req.query.size, // raw, not normalized
      });
    }).catch(err => { return next(err); });
  } else {
    res.status(401).send("Can't manage account if you're logged out");
  }
});

let tokenScopeText = {
  write_dogears: 'Can mark your spot.',
  manage_dogears: 'Can view, update, and delete dogears.',
};

function templateTokens(tokensList: Array<tokens.Token>) {
  return tokensList.map(token => ({
    id: token.id,
    scope: tokenScopeText[token.scope],
    created: token.created.toLocaleDateString(),
    comment: token.comment,
    token: token.token,
    last_used: token.last_used ? token.last_used.toLocaleDateString() : null,
  }));
}

// Tokens fragment. Not supporting any non-default page size, and not really
// expecting anyone to ever have > 50 tokens anyway, but still let's do it right.
// Query params: page, size
app.get('/fragments/tokens', function(req, res, next) {
  if (req.user) {
    let page = normalizeIntParam(req.query.page, 1);
    let size = normalizeIntParam(req.query.size, defaultPageSize);
    tokens.list(req.user.id, page, size).then(tokensResponse => {
      let tokensList = templateTokens(tokensResponse.data);
      let pagination = tokensResponse.meta.pagination;
      res.render('fragments/tokens', {
        layout: false,
        tokens: tokensList,
        pagination,
        pageSize: req.query.size, // raw, not normalized
      });
    }).catch(err => { return next(err); });
  } else {
    res.sendStatus(404);
  }
});

// Implementation for token delete button. Not doing this in API because of
// permissions complexity.
app.delete('/tokens/:id', function(req, res) {
  if (req.user) {
    let id = parseInt(req.params.id);
    tokens.destroy(req.user.id, id).then(() => {
      res.sendStatus(204);
    }).catch(err => {
      res.status(400).send(err);
    });
  } else {
    res.sendStatus(401);
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
// Query params: page, size
app.get('/', function(req, res, next) {
  if (req.user) {
    let page = normalizeIntParam(req.query.page, 1);
    let size = normalizeIntParam(req.query.size, defaultPageSize);
    let { id, username } = req.user;
    dogears.list(id, page, size).then(result => {
      res.render('index', {
        title: `${username}'s Dogears`,
        dogears: templateDogears(result.data),
        pagination: result.meta.pagination,
        pageSize: req.query.size, // raw, not normalized
      });
    }).catch(err => { return next(err); });
  } else {
    res.render('login', {title: 'Welcome to Eardogger'});
  }
});

// Dogears list as an HTML fragment
// Query params: page, size
app.get('/fragments/dogears', function(req, res, next) {
  if (req.user) {
    let page = normalizeIntParam(req.query.page, 1);
    let size = normalizeIntParam(req.query.size, defaultPageSize);
    dogears.list(req.user.id, page, size).then(result => {
      res.render('fragments/dogears', {
        layout: false,
        dogears: templateDogears(result.data),
        pagination: result.meta.pagination,
        pageSize: req.query.size, // raw, not normalized
      });
    }).catch(err => { return next(err); });
  } else {
    res.sendStatus(404);
  }
});

// Install info page
let cachedWhereBookmarklet = bookmarkletText('where');
app.get('/install', function(req, res){
  cachedWhereBookmarklet.then(where => {
    res.render('install', {title: 'Install', where});
  });
});

// Personal bookmarklet fragment
app.post('/fragments/personalmark', function(req, res, next) {
  if (req.user) {
    let now = new Date();
    let comment = `Personal bookmarklet created ${now.toLocaleDateString()}`;
    tokens.create(req.user.id, 'write_dogears', comment).then(token => {
      if (!token.token) {
        // Something went WAY wrong, and we just can't render this.
        res.sendStatus(500);
      } else {
        bookmarkletText('markWithToken', token.token).then(bookmarklet => {
          res.status(201);
          res.render('fragments/personalmark', {
            layout: false,
            markWithToken: bookmarklet,
          });
        }).catch(err => { return next(err); });
      }
    }).catch(err => { return next(err); });
  } else {
    res.sendStatus(404);
  }
});

// Faq
app.get('/faq', function(req, res){
  res.render('faq', {title: 'About Eardogger'});
});

// UI version of updating a dogear; redirects instead of returning json
app.get('/mark/:url', function(req, res){
  if (req.user) {
    dogears.update(req.user.id, req.params.url).then(updatedDogears => {
      res.render('marked', {
        title: 'Saved your place',
        url: req.params.url,
        updatedDogears,
        slowMode: true,
      });
    }).catch(err => {
      if (err instanceof dogears.NoMatchError) {
        res.render('create', {title: 'Dogear this?', url: req.params.url});
      } else {
        res.render('error', {title: 'Tried but failed', error: err.toString()});
      }
    })
  } else {
    req.session.returnTo = req.originalUrl;
    res.render('login', {title: 'Welcome to Eardogger'});
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
