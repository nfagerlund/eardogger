// First off, mock the dogears database layer.
jest.mock('../db/dogears');
const dogears = require('../db/dogears');
// db.query.mockImplementation( (text, params) => pool.query(text, params) );
dogears.create.mockImplementationOnce( async () => {
  return {
    id: 1,
    user_id: 1,
    prefix: 'example.com/comic/',
    current: 'https://example.com/comic/24',
    display_name: 'Example Comic',
    updated: '2019-09-24T03:58:19.571Z',
  };
}).mockImplementation( async () => {
  throw new Error("This is the error text");
});
dogears.list.mockImplementation( async () => {
  return [{
    id: 1,
    user_id: 1,
    prefix: 'example.com/comic/',
    current: 'https://example.com/comic/24',
    display_name: 'Example Comic',
    updated: '2019-09-24T03:58:19.571Z',
  }];
})

// Next, fake up an app and mount the API mini-app in it.
const express = require('express');
const app = express();

// Fake up an authenticated user:
app.use(function(req, res, next){
  req.user = {id: 1};
  next();
});

// Uhhhh... bombs away, I guess
const v1api = require('../api/v1');
app.use('/api/v1', v1api);

// Supertest
const request = require('supertest');

describe.only("Test a couple endpoints", () => {
  test("List returns JSON on success", async () => {
    const response = await request(app).get('/api/v1/list');
    return Promise.all([
      expect(response.statusCode).toBe(200),
      expect(response.body).toEqual([{
        id: 1,
        user_id: 1,
        prefix: 'example.com/comic/',
        current: 'https://example.com/comic/24',
        display_name: 'Example Comic',
        updated: '2019-09-24T03:58:19.571Z',
      }]),
    ]);
  });
  test("Create returns JSON on success, 400 on error", async () => {
    const response = await request(app).post('/api/v1/create').send({
      prefix: 'example.com/comic/',
      current: 'https://example.com/comic/24',
      display_name: 'Example Comic'
    });
    await Promise.all([
      expect(response.statusCode).toBe(201),
      expect(response.body).toEqual({
        id: 1,
        user_id: 1,
        prefix: 'example.com/comic/',
        current: 'https://example.com/comic/24',
        display_name: 'Example Comic',
        updated: '2019-09-24T03:58:19.571Z',
      }),
    ]);
    const fail = await request(app).post('/api/v1/create').send({
      display_name: 'Busted'
    });
    await Promise.all([
      expect(fail.statusCode).toBe(400),
      expect(fail.body).toHaveProperty('error'),
    ]);

  });
});
