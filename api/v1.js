// v1 API mini-app.
const express = require('express');

const router = express.Router({mergeParams: true});
  // TODO: Once I move to token auth, I might want to set this to false? IDK.

module.exports = router;

// Application object DB helpers
const dogears = require('../db/dogears');
// const users = require('../db/users');

// 401 unless logged in middleware
router.use(function(req, res, next) {
  if (!req.user) {
    res.sendStatus(401);
  } else {
    next();
  }
});

// Parse json request bodies
router.use(express.json());

// API: create
router.post('/create', function(req, res){
  const {prefix, current, display_name} = req.body;
  dogears.create(req.user.id, prefix, current, display_name).then(dogear => {
    res.status(201).json(dogear);
  }).catch(err => {
    res.status(400).json({error: err.toString()});
  });
});

// API: update
router.post('/update', function(req, res){
  const {current} = req.body;
  dogears.update(req.user.id, current).then(dogears => {
    res.status(200).json(dogears);
  }).catch(err => {
    res.sendStatus(404);
  });
});

// API: list
router.get('/list', function(req, res){
  dogears.list(req.user.id).then(dogears => {
    res.status(200).json(dogears);
  }).catch(err => {
    res.status(400).json({error: err.toString()});
  });
});

// API: delete
router.delete('/dogear/:id', function(req, res){
  const id = req.params.id;
  dogears.destroy(req.user.id, id).then(() => {
    res.sendStatus(204);
  }).catch(err => {
    res.sendStatus(404);
  });
});
