import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
const pgSession = connectPgSimple(session);
import * as db from './db/pg';
import { RequestHandler } from 'express';

export default function initializeSession(): RequestHandler {
  if (!process.env.SESSION_SECRET) {
    throw new Error("The SESSION_SECRET environment variable wasn't set, and I absolutely demand it. Plz fix your env.");
  }

  let secure = true;
  if (process.env.EARDOGGER_INSECURE) {
    console.log("Heads up: Setting session cookies to insecure mode due to EARDOGGER_INSECURE environment variable.");
    secure = false;
  }

  // session handling
  let sessionOptions: session.SessionOptions = {
    name: 'eardogger.sessid',
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30 * 2, // two months, in milliseconds.
      sameSite: 'none',
      secure: secure,
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
    // PART TWO: (see app.ts for part one)
    sessionOptions.proxy = true;
  }

  return session(sessionOptions);
}
