import * as db from './pg';
import bcrypt from 'bcryptjs';

interface User {
  id: number,
  username: string,
  email: string | null,
  created: Date,
};

type FUserCreate = (username: string, password?: string | null, email?: string | null) => Promise<User>;
let create: FUserCreate = async function(username: string, password: string | null = null, email: string | null = null): Promise<User> {
  username = username.trim();
  if (username === '') {
    throw new TypeError("Create user requires username");
  }
  if (await getByName(username)) { // might be inefficient, but
    throw new Error("Username already exists");
  }
  email = email || null; // replace empty string with null (for explicit sql null)
  if (email) {
    email = email.trim();
  }
  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  let result = await db.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, created", [username, hashedPassword, email]);
  let { id, created } = result.rows[0];
  return { id, username, email, created };
}

type FUserAuthenticate = (username: string, password: string) => Promise<boolean>;
let authenticate: FUserAuthenticate = async function(username: string, password: string): Promise<boolean> {
  username = username.trim();
  let result = await db.query("SELECT password FROM users WHERE username = $1", [username]);
  try {
    let hashedPassword = result.rows[0].password;
    if (hashedPassword) {
      return bcrypt.compare(password, hashedPassword);
    } else {
      return false;
    }
  } catch(err) { // user doesn't exist, probably. Give falsy value so Passport will 401 instead of 500.
    return false;
  }
}

type FUserGetByName = (username: string) => Promise<User | undefined>;
let getByName: FUserGetByName = async function(username: string): Promise<User | undefined> {
  username = username.trim();
  const result = await db.query("SELECT id, username, email, created FROM users WHERE username = $1", [username]);
  return result.rows[0];
}

type FUserGetByID = (id: number) => Promise<User | undefined>;
let getByID: FUserGetByID = async function(id: number): Promise<User | undefined> {
  let result = await db.query("SELECT id, username, email, created FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

// application logic is in charge of validating, this is raw
type FUserSetPassword = (username: string, password: string | null) => Promise<void>;
let setPassword: FUserSetPassword = async function(username: string, password: string | null): Promise<void> {
  username = username.trim();
  let hashedPassword = null; // explicit sql null
  if (password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  await db.query("UPDATE users SET password = $2 WHERE username = $1", [username, hashedPassword]);
}

// returns user
type FUserSetEmail = (username: string, email: string | null) => Promise<User | undefined>;
let setEmail: FUserSetEmail = async function(username: string, email: string | null): Promise<User | undefined> {
  username = username.trim();
  email = email || null; // '' => explicit sql null
  if (email) {
    email = email.trim();
  }
  let result = await db.query("UPDATE users SET email = $2 WHERE username = $1 RETURNING id, username, email, created", [username, email]);
  return result.rows[0];
}

// schema should just make this cascade to dogears.
type FUserPurgeByName = (username: string) => Promise<void>;
let purgeByName: FUserPurgeByName = async function(username: string): Promise<void> {
  username = username.trim();
  await db.query("DELETE FROM users WHERE username = $1", [username]);
}

export {
  create,
  authenticate,
  getByName,
  getByID,
  setPassword,
  setEmail,
  purgeByName,
};

export type {
  User,
  FUserCreate,
  FUserAuthenticate,
  FUserGetByName,
  FUserGetByID,
  FUserSetPassword,
  FUserSetEmail,
  FUserPurgeByName,
}
