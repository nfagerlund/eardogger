import { describe, expect, test, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import type { Response as SuperResponse } from 'supertest';
import { JSDOM } from 'jsdom';
import * as mocks from '../db/mocks';

// First, mock the session persistence middleware, which is the only thing that
// hits the database directly instead of using my DB layer.
function fakeSession() {
  return function(req: Request, res: Response, next: NextFunction) {
    // For logged-out, we want no session info... but need a session object to
    // prevent 500s.
    // @ts-ignore sorry, but
    req.session = {};
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

describe("static assets", () => {
  test("frontend JS is available", async () => {
    let response = await request(app).get('/client.js');
    expect(response.statusCode).toBe(200);
  });

  test("CSS is available", async () => {
    let response = await request(app).get('/style.css');
    expect(response.statusCode).toBe(200);
  });
});

describe("status/ping endpoint", () => {
  test("always an empty 204", async () => {
    let response = await request(app).get('/status');
    expect(response.statusCode).toBe(204);
  });
});

describe("account page", () => {
  test("it 401s", async () => {
    let response = await request(app).get('/account');
    expect(response.statusCode).toBe(401);
  });
});

function makeDoc(text: string) {
  return (new JSDOM(text)).window.document;
}

function expectLoginPage(response: SuperResponse) {
  expect(response.statusCode).toBe(200);
  let doc = makeDoc(response.text);
  expect(doc.getElementById('signupform')).toBeTruthy();
  // Oof, need an ID on that login form
  expect(doc.querySelector('form[action="/login"]')).toBeTruthy();
  expect(doc.getElementById('dogears')).toBeFalsy(); // index.hbs
  expect(doc.getElementById('update-dogear')).toBeFalsy(); // index.hbs
  expect(doc.getElementById('mark-success')).toBeFalsy(); // marked.hbs
  expect(doc.getElementById('create-dogear')).toBeFalsy(); // create.hbs
}

describe("pages that are actually the login page", () => {
  test("index page", async () => {
    let response = await request(app).get('/');
    expectLoginPage(response);
  });

  test("/mark/:url", async () => {
    let response = await request(app).get('/mark/https%3A%2F%2Fexample.com%2Fcomic%2F25');
    expectLoginPage(response);
  });

  test("/resume/:url", async () => {
    let response = await request(app).get('/resume/https%3A%2F%2Fexample.com%2Fcomic%2F25');
    expectLoginPage(response);
  });
});

describe("faq page", () => {
  test("it renders", async () => {
    let response = await request(app).get('/faq');
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/^How to/);
    expect(doc.getElementById('what-is')).toBeTruthy();
    expect(doc.getElementById('faq')).toBeTruthy();
  });
});

describe("install page", () => {
  test("it renders", async () => {
    let response = await request(app).get('/install');
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/^Install/);
    expect(doc.getElementById('install')).toBeTruthy();
  });
});

describe("/fragments/dogears", () => {
  test("it 404s", async () => {
    let response = await request(app).get('/fragments/dogears');
    expect(response.statusCode).toBe(404);
  });
});

describe("POST /signup (new account)", () => {
  test("Creates user and redirects to index on success", async () => {
    let response = await request(app).post('/signup')
      .type('form')
      .send({
        new_username: 'new_challenger_joins',
        new_password: 'password456',
        new_password_again: 'password456',
        email: '', // I think that's how form data omits email
      });
    expect(response.statusCode).toBe(302);
    expect(response.header['location']).toEqual('/');
  });

  test("Sends dumb 400 error on password mismatch", async () => {
    let response = await request(app).post('/signup')
      .type('form')
      .send({
        new_username: 'new_challenger_joins',
        new_password: 'password456',
        new_password_again: 'password789',
        email: '',
      });
    expect(response.statusCode).toBe(400);
  });
});

describe("POST /changepassword", () => {
  test("401 unauthenticated if you're logged out", async () => {
    let response = await request(app).post('/changepassword')
      .type('form')
      .send({
        password: 'password123',
        new_password: 'password456',
        new_password_again: 'password456',
      });
    expect(response.statusCode).toBe(401);
  });
});

// missing a test for POST /mark (redirects to index), but I'm not too concerned
// about that one.
