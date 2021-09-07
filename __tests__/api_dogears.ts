import { describe, expect, test, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import * as mocks from '../db/mocks';

// Oh hey, jest's matchers kind of have their own runtime type system. Guess
// we'll use that. expect.any takes a constructor function, and the primitive
// types all have those wrapper constructors/classes. This is a subset bc
// there's no built-in matcher for "<type> or null" and I don't feel like
// writing one, so display_name is out.
let dogearMatcher = {
  id: expect.any(Number),
  user_id: expect.any(Number),
  prefix: expect.any(String),
  current: expect.any(String),
  // display_name: expect.anyOrNull(String),
  updated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/), // not any(Date) bc it's dumb json
};

// First off, mock the dogears database layer.
jest.mock('../db/dogears');
const dogears = require('../db/dogears');
dogears.create.mockImplementation(mocks.dogears.create);
dogears.list.mockImplementation(mocks.dogears.list);
dogears.update.mockImplementation(mocks.dogears.update);
dogears.currently.mockImplementation(mocks.dogears.currently);
dogears.destroy.mockImplementation(mocks.dogears.destroy);

// Next, fake up an app and mount the API mini-app in it.
const express = require('express');
const app = express();

// Fake up an authenticated user:
app.use(function(req: Request, _res: Response, next: NextFunction){
  req.user = {
    id: 1,
    username: 'fake',
    created: new Date('2019-09-20T03:58:19.571Z'),
    email: null,
  };
  next();
});

// Uhhhh... bombs away, I guess
const v1api = require('../api/v1');
app.use('/api/v1', v1api);

// Supertest
const request = require('supertest');

describe.only("Test a couple endpoints", () => {
  test("List returns JSON on success", async () => {
    let response = await request(app).get('/api/v1/list');
    expect(response.statusCode).toBe(200);
    let body = response.body;
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject(dogearMatcher);
  });
  test("Create returns JSON on success, 400 on error", async () => {
    let response = await request(app).post('/api/v1/create').send({
      prefix: 'example.com/comic/',
      current: 'https://example.com/comic/24',
      display_name: 'Example Comic',
    });
    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject(dogearMatcher);
    let fail = await request(app).post('/api/v1/create').send({
      display_name: 'Busted',
    });
    expect(fail.statusCode).toBe(400);
    expect(fail.body).toHaveProperty('error');

  });
});
