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
jest.mock('../db/dogears', () => {
  let { create, list, update, currently, destroy } = mocks.dogears;
  return {
    __esModule: true,
    create,
    list,
    update,
    currently,
    destroy,
  };
});

// Next, fake up an app and mount the API mini-app in it.
import express from 'express';
const app = express();

// Fake up an authenticated user:
app.use(function(req: Request, _res: Response, next: NextFunction) {
  req.user = {
    id: 1,
    username: 'fake',
    created: new Date('2019-09-20T03:58:19.571Z'),
    email: null,
  };
  next();
});

// Uhhhh... bombs away, I guess
import v1api from '../api/v1';
app.use('/api/v1', v1api);

// Supertest
import request from 'supertest';

describe("List dogears", () => {
  let testUrl = '/api/v1/list';

  test("CORS: Nope", async () => {
    let response = await request(app).options(testUrl).set('Origin', 'example.com');
    expect(response.statusCode).toBe(200); // Not 100% sure why, must be default.
    expect(response.header).not.toHaveProperty('access-control-allow-methods');
  });

  test("returns JSON array of Dogears on success", async () => {
    let response = await request(app).get(testUrl);
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('application/json');
    let body = response.body;
    // Response is a JSON array...
    expect(Array.isArray(body)).toBe(true);
    // ...with length > 0...
    expect(body.length > 0).toBe(true);
    // ...containing Dogear objects, or at least something that looks like them.
    expect(body[0]).toMatchObject(dogearMatcher);
  });

  // No real notable error condition I know to test, at least within the API's
  // concerns (rather than authentication concerns).
});

describe("Create dogears", () => {
  let testUrl = '/api/v1/create';

  test("CORS: Nope", async () => {
    let response = await request(app).options(testUrl).set('Origin', 'example.com');
    expect(response.statusCode).toBe(200); // Not 100% sure why, must be default.
    expect(response.header).not.toHaveProperty('access-control-allow-methods');
  });

  test("Returns JSON array of dogears on success", async () => {
    let response = await request(app).post(testUrl).send({
      prefix: 'example.com/comic/',
      current: 'https://example.com/comic/24',
      display_name: 'Example Comic',
    });
    expect(response.statusCode).toBe(201);
    expect(response.type).toBe('application/json');
    expect(response.body).toMatchObject(dogearMatcher);

  });

  test("Returns 400 and JSON on malformed request", async () => {
    let response = await request(app).post(testUrl).send({
      // prefix: absent
      display_name: 'Busted',
    });
    expect(response.statusCode).toBe(400);
    expect(response.type).toBe('application/json');
    expect(response.body).toHaveProperty('error');
  });
});

describe("Update dogears", () => {
  let testUrl = '/api/v1/update';

  test("CORS: OPTIONS says you can POST", async () => {
    let response = await request(app).options(testUrl).set('Origin', 'example.com');
    expect(response.statusCode).toBe(200);
    expect(response.header['access-control-allow-origin']).toBe('example.com');
    expect(response.header['access-control-allow-methods']).toBe('POST');
  });

  test("Returns JSON array of dogears on success", async () => {
    let response = await request(app).post(testUrl).send({
      // DB mocks don't actually bother matching a real dogear, they just send
      // back something the right shape.
      current: 'https://example.com/comic/24',
    });
    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('application/json');
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toMatchObject(dogearMatcher);
  });

  test("CORS: 404 on mucking around outside yr origin", async () => {
    let response = await request(app).post(testUrl)
      .set('Origin', 'example.net')
      .send({ current: 'https://example.com/some_bullshit/3' });
    expect(response.statusCode).toBe(404);
    // no json content-type on this one, 404 is too simple.
  });
});

describe("Delete dogears", () => {
  let testUrl = '/api/v1/dogear/1';

  test("CORS: Nope", async () => {
    let response = await request(app).options(testUrl).set('Origin', 'example.com');
    expect(response.statusCode).toBe(200); // Not 100% sure why, must be default.
    expect(response.header).not.toHaveProperty('access-control-allow-methods');
  });

  test("Returns empty 204 on success", async () => {
    let response = await request(app).delete(testUrl);
    expect(response.statusCode).toBe(204);
  });

  test("Returns 404 on nonsense", async () => {
    let response = await request(app).delete('/api/v1/dogear/oneee')
    expect(response.statusCode).toBe(404);
  });
});
