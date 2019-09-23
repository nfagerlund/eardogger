// v1 API mini-app.
const express = require('express');

const router = express.Router({mergeParams: true});

module.exports = router;

// Application object DB helpers
const dogears = require('../db/dogears');
const users = require('../db/users');

// API: update
// Hmm, this probably breaks if there are multiple matching prefixes. Or, just blitzes one of them.
// so, uhhhh for the prototype just don't do that.
// btw I tried using sqlite's ORDER BY + LIMIT feature for update, but the version
// linked into the nodejs module does not actually support that and just syntax errors. BOO.
app.post('/update', function(req, res){
  if (req.user) {
    dogears.update(req.user.id, req.body.current).then( () => {
      res.sendStatus(200);
    }).catch(err => {
      console.log(err);
      res.sendStatus(404);
    });
  } else {
    // Move this into a middleware once I have real sessions working
    res.status(401);
    // debug:
    res.send(JSON.stringify(req.cookies));
  }
});

// API: create
app.post('/create', function(req, res){
  if (req.user) {
    dogears.create(req.user.id, req.body.prefix, req.body.current, req.body.display_name).then( () => {
      res.sendStatus(201);
    }).catch(err => {
      console.log(err)
      res.sendStatus(400);
    });
  } else {
    res.sendStatus(401);
  }
});

// API: list
app.get('/list', function(req, res){
  if (req.user) {
    dogears.list(req.user.id).then(data => {
      res.send(JSON.stringify(data));
    }).catch(err => {
      console.log(err)
      res.sendStatus(400);
    });
  } else {
    res.sendStatus(401);
  }
});
