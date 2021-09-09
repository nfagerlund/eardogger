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
    let user = parseInt(req.get('X-Test-User-Override') || '');
    if (isNaN(user)) {
      user = 1;
    }
    // @ts-ignore sorry, but
    req.session = { passport: { user } }; // cf. user mock data
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

function makeDoc(text: string) {
  return (new JSDOM(text)).window.document;
}

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

describe("/account", () => {
  test("it renders", async () => {
    let response = await request(app).get('/account');
    expect(response.statusCode).toBe(200);
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/^Manage account/);
    expect(doc.getElementById('changepasswordform')).toBeTruthy();
  });
});

describe("index page", () => {
  test("it renders", async () => {
    let response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/Dogears —/);
    expect(doc.getElementById('dogears')).toBeTruthy();
    expect(doc.getElementById('update-dogear')).toBeTruthy();
    expect(doc.querySelectorAll('#dogears > li').length > 0).toBe(true);
    // structure of a dogear LI:
    expect(doc.querySelector('#dogears > li > a')).toBeTruthy();
    expect(doc.querySelector('#dogears > li > .current')).toBeTruthy();
    expect(doc.querySelector('#dogears > li > .date')).toBeTruthy();
    expect(doc.querySelector('#dogears > li > .delete-dogear')).toBeTruthy();
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
  test("it renders", async () => {
    let response = await request(app).get('/fragments/dogears');
    expect(response.statusCode).toBe(200);
    let doc = JSDOM.fragment(response.text);
    expect(doc.getElementById('dogears')).toBeFalsy(); // we only get the innerHTML of the UL
    expect(doc.getElementById('update-dogear')).toBeFalsy(); // not an index page
    expect(doc.querySelectorAll('li').length > 0).toBe(true);
    // structure of a dogear LI:
    expect(doc.querySelector('li > a')).toBeTruthy();
    expect(doc.querySelector('li > .current')).toBeTruthy();
    expect(doc.querySelector('li > .date')).toBeTruthy();
    expect(doc.querySelector('li > .delete-dogear')).toBeTruthy();
  });
});

describe("/mark/:url", () => {
  test("it renders the 'marked' view if update succeeds", async () => {
    let response = await request(app).get('/mark/https%3A%2F%2Fexample.com%2Fcomic%2F25');
    expect(response.statusCode).toBe(200);
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/^Saved your place/);
    expect(doc.getElementById('mark-success')).toBeTruthy();
  });

  test("it renders the 'create' view if update fails", async () => {
    // Need to override the logged-in user to get a whiff back from the update stub:
    let response = await request(app).get('/mark/https%3A%2F%2Fexample.com%2Fcomic%2F25')
      .set('X-Test-User-Override', '2');
    expect(response.statusCode).toBe(200);
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/^Dogear this/);
    expect(doc.getElementById('create-dogear')).toBeTruthy();
  });
});

describe("POST /mark", () => {
  test("it renders the 'marked' view after creating a new dogear", async () => {
    let response = await request(app).post('/mark')
      .type('form')
      .send({
        prefix: 'https://example.com/newcomic/',
        current: 'https://example.com/newcomic/2',
        display_name: 'New comic',
      });
    expect(response.statusCode).toBe(200);
    let doc = makeDoc(response.text);
    expect(doc.title).toMatch(/^Saved your place/);
    expect(doc.getElementById('mark-success')).toBeTruthy();
  });
});

describe("/resume/:url", () => {
  test("it redirects off-site", async () => {
    let response = await request(app).get('/resume/https%3A%2F%2Fexample.com%2Fcomic%2F25');
    expect(response.statusCode).toBe(302);
    expect(response.header['location']).toMatch(/^https?:/);
  });

  // Missing a test for going to the "create" view if it whiffs, but I'm less
  // concerned about that. (Would need to update mocks.)
});

describe("POST /signup (new account)", () => {
  test("403 forbidden if you're logged in", async () => {
    let response = await request(app).post('/signup')
      .type('form')
      .send({
        new_username: 'new_challenger_joins',
        new_password: 'password456',
        new_password_again: 'password456',
        email: '',
      });
    expect(response.statusCode).toBe(403);
  });
});

describe("POST /changepassword", () => {
  test("Changes password and redirects to / on success", async () => {
    let response = await request(app).post('/changepassword')
      .type('form')
      .send({
        password: 'password123',
        new_password: 'password456',
        new_password_again: 'password456',
      });
    expect(response.statusCode).toBe(302);
    expect(response.header['location']).toEqual('/');
  });

  test("403 on bad current password", async () => {
    let response = await request(app).post('/changepassword')
      .type('form')
      .send({
        password: 'password789',
        new_password: 'password456',
        new_password_again: 'password456',
      });
    expect(response.statusCode).toBe(403);
  });

  test("400 on missing new password", async () => {
    let response = await request(app).post('/changepassword')
      .type('form')
      .send({
        password: 'password123',
        new_password: '',
        new_password_again: '',
      });
    expect(response.statusCode).toBe(400);
  });

  test("400 on mismatched new passwords", async () => {
    let response = await request(app).post('/changepassword')
      .type('form')
      .send({
        password: 'password123',
        new_password: 'password456',
        new_password_again: 'password789',
      });
    expect(response.statusCode).toBe(400);
  });
});
