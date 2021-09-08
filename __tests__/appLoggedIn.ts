import { describe, expect, test, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import * as mocks from '../db/mocks';

// First, mock the session persistence middleware, which is the only thing that
// hits the database directly instead of using my DB layer.
function fakeSession() {
  return function(req: Request, res: Response, next: NextFunction) {
    // @ts-ignore sorry, but
    req.session = { passport: { user: 1 } }; // cf. user mock data
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

describe("account page", () => {
  test("it 200s", async () => {
    let response = await request(app).get('/account');
    expect(response.statusCode).toBe(200);
  });
});
