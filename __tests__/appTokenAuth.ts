import { describe, expect, test, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import * as mocks from '../db/mocks';

// First, mock the session persistence middleware, which is the only thing that
// hits the database directly instead of using my DB layer.
function fakeSession() {
  return function(req: Request, res: Response, next: NextFunction) {
    // For token auth, we want no session info.
    next();
  }
}
jest.mock('../session');
import initializeSession from '../session';
// @ts-ignore
initializeSession.mockImplementation(fakeSession);

// Then mock the entire DB layer
jest.mock('../db/dogears', () => {
  return {
    __esModule: true,
    ...mocks.dogears,
  };
});
jest.mock('../db/users', () => {
  return {
    __esModule: true,
    ...mocks.users,
  };
});
jest.mock('../db/tokens', () => {
  return {
    __esModule: true,
    ...mocks.tokens,
  };
});

// Okay, finally we can do some tests.
import app from '../app';

// For magic token strings, cf. db/mocks -> tokenCleartexts
// N.B.: These tests are only about authorization, so really we're only looking
// at the status codes; the formats of the responses are tested elsewhere, in
// api_dogears.

describe("UI pages", () => {
  test("account page 401s, tokens can't access logged-in UI", async () => {
    let response = await request(app).get('/account')
      .set('Authorization', 'Bearer tokenNickManage');
    expect(response.statusCode).toBe(401);
  });
});

describe("manage_dogears scope", () => {
  test("can list dogears", async () => {
    let response = await request(app).get('/api/v1/list')
      .set('Authorization', 'Bearer tokenNickManage');
    expect(response.statusCode).toBe(200);
    let data = response.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length > 0).toBe(true); // cf. mocks
  });

  test("different users get different lists", async () => {
    let response = await request(app).get('/api/v1/list')
      .set('Authorization', 'Bearer tokenWrongManage');
    expect(response.statusCode).toBe(200);
    let data = response.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0); // cf. mocks
  });

  test("can create dogears", async () => {
    let response = await request(app).post('/api/v1/create')
      .set('Authorization', 'Bearer tokenNickManage')
      .send({
        prefix: 'example.com/comic/',
        current: 'https://example.com/comic/24',
        display_name: 'Example Comic',
      });
    expect(response.statusCode).toBe(201);
  });

  test("can update dogears", async () => {
    let response = await request(app).post('/api/v1/update')
      .set('Authorization', 'Bearer tokenNickManage')
      .send({
        current: 'https://example.com/comic/25',
      });
    expect(response.statusCode).toBe(200);
  });

  test("can delete dogears", async () => {
    let response = await request(app).delete('/api/v1/dogear/1')
      .set('Authorization', 'Bearer tokenNickManage');
    expect(response.statusCode).toBe(204);
  });
});

describe("write_dogears scope", () => {
  test("CANNOT list dogears", async () => {
    let response = await request(app).get('/api/v1/list')
      .set('Authorization', 'Bearer tokenNickWrite');
    expect(response.statusCode).toBe(403);
    expect(response.body).toStrictEqual({});
      // We don't *actually* rely on this, I think `.body` is doing some
      // automatic translation to JSON and treating a nothing as an empty
      // object, and it's possible this'll blow up when the client API changes
      // down the line, but basically what I'm trying to test here is that you
      // DON'T get the expected list format.
  });

  test("can create dogears", async () => {
    let response = await request(app).post('/api/v1/create')
      .set('Authorization', 'Bearer tokenNickWrite')
      .send({
        prefix: 'example.com/comic/',
        current: 'https://example.com/comic/24',
        display_name: 'Example Comic',
      });
    expect(response.statusCode).toBe(201);
  });

  test("can update dogears", async () => {
    let response = await request(app).post('/api/v1/update')
      .set('Authorization', 'Bearer tokenNickWrite')
      .send({
        current: 'https://example.com/comic/25',
      });
    expect(response.statusCode).toBe(200);
  });

  test("CANNOT delete dogears", async () => {
    let response = await request(app).delete('/api/v1/dogear/1')
      .set('Authorization', 'Bearer tokenNickWrite');
    expect(response.statusCode).toBe(403);
  });
});

describe("invalid token", () => {
  test("CANNOT list dogears", async () => {
    let response = await request(app).get('/api/v1/list')
      .set('Authorization', 'Bearer invalidToken');
    expect(response.statusCode).toBe(401);
    expect(response.body).toStrictEqual({}); // cf. above under write_dogears
  });

  test("CANNOT create dogears", async () => {
    let response = await request(app).post('/api/v1/create')
      .set('Authorization', 'Bearer invalidToken')
      .send({
        prefix: 'example.com/comic/',
        current: 'https://example.com/comic/24',
        display_name: 'Example Comic',
      });
      expect(response.statusCode).toBe(401);
  });

  test("CANNOT update dogears", async () => {
    let response = await request(app).post('/api/v1/update')
      .set('Authorization', 'Bearer invalidToken')
      .send({
        current: 'https://example.com/comic/25',
      });
    expect(response.statusCode).toBe(401);
  });

  test("CANNOT delete dogears", async () => {
    let response = await request(app).delete('/api/v1/dogear/1')
      .set('Authorization', 'Bearer invalidToken');
    expect(response.statusCode).toBe(401);
  });
});
