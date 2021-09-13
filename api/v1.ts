// v1 API mini-app.
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as dogears from '../db/dogears';
import { TokenScope } from '../db/tokens';
import { normalizeIntParam } from '../util';

const router = express.Router({mergeParams: true});
  // TODO: Once I move to token auth, I might want to set this to false? IDK.

export default router;

// 401 unless authenticated middleware
router.use(function(req: Request, res: Response, next: NextFunction) {
  if (!req.user && req.method !== 'OPTIONS') {
    res.sendStatus(401);
  } else {
    next();
  }
});

// Parse json request bodies
router.use(express.json());

// CORS is good, actually. But only enable it per-endpoint.
// Use this middleware *before* token auth.
// s/o to http://johnzhang.io/options-request-in-express
// (via https://support.glitch.com/t/how-do-i-do-a-cors-on-my-api/7497/8)
const localOrigin = new RegExp(
    '^https?://' +
    (process.env.SITE_HOSTNAME || 'eardogger.com')
);
function allowCorsWithCredentials(commaSeparatedMethods: string) {
  return function(req: Request, res: Response, next: NextFunction) {
    // Is this coming from the server you originally logged into? If not, it's CORS.
    if ( req.headers.origin && !req.headers.origin.match(localOrigin) ) {
      req.isCors = true;
      res.header("Access-Control-Allow-Origin", req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', commaSeparatedMethods);
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    }
    // Bail early for OPTIONS requests
    if ('OPTIONS' === req.method) {
      res.sendStatus(200);
    }
    else {
      // move on
      next();
    }
  };
}

// Implementation for token scope restrictions. Returns a middleware.
// Known scopes so far: write_dogears, manage_dogears.
function allowTokenScopes(scopes: Array<TokenScope>) {
  return function(req: Request, res: Response, next: NextFunction) {
    if (req.authInfo && req.authInfo.isToken) {
      // Then it's a token and we need to check scope.
      if (req.authInfo.scope && scopes.includes(req.authInfo.scope)) {
        next();
      } else {
        // NOPE
        res.sendStatus(403);
      }
    } else {
      // It's a session, let it thru
      next();
    }
  }
}
let writeOrManageDogears = allowTokenScopes(['write_dogears', 'manage_dogears']);
let manageDogears = allowTokenScopes(['manage_dogears']);

// API: create
router.use('/create', writeOrManageDogears);
router.post('/create', function(req, res){
  const {prefix, current, display_name} = req.body;
  if (!req.user) {
    throw new Error("Tried to create dogear without authenticated user");
  }
  dogears.create(req.user.id, prefix, current, display_name).then(dogear => {
    res.status(201).json(dogear);
  }).catch(err => {
    res.status(400).json({error: err.toString()});
  });
});

// API: update
router.use('/update', allowCorsWithCredentials('POST'), writeOrManageDogears);
router.post('/update', function(req, res){
  const {current} = req.body;
  if (req.isCors) {
    // Only let sites modify dogears on their own origin.
    if (current.indexOf(req.headers.origin) !== 0) {
      res.sendStatus(404);
      return;
    }
  }
  if (!req.user) {
    throw new Error("Tried to update dogear without authenticated user");
  }
  dogears.update(req.user.id, current).then(dogears => {
    res.status(200).json(dogears);
  }).catch(err => {
    res.sendStatus(404);
  });
});

// API: list
router.use('/list', manageDogears);
router.get('/list', function(req, res){
  if (!req.user) {
    throw new Error("Tried to list dogears without authenticated user");
  }
  dogears.list(
    req.user.id,
    normalizeIntParam(req.query.page),
    normalizeIntParam(req.query.size),
  ).then(dogears => {
    res.status(200).json(dogears);
  }).catch(err => {
    res.status(400).json({error: err.toString()});
  });
});

// API: delete
router.use('/dogear', manageDogears);
router.delete('/dogear/:id', function(req, res){
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.sendStatus(404);
    return;
  }
  if (!req.user) {
    throw new Error("Tried to delete dogear without authenticated user");
  }
  dogears.destroy(req.user.id, id).then(() => {
    res.sendStatus(204);
  }).catch(err => {
    res.sendStatus(404);
  });
});
