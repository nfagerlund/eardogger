const db = require('./pg');
const bcrypt = require('bcryptjs');

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
}

interface User {
  id: number,
  username: string,
  email: string | null,
  created: Date,
};

// returns user.
async function create(username: string, password: string | null = null, email: string | null = null): Promise<User> {
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

async function authenticate(username: string, password: string): Promise<boolean> {
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

async function getByName(username: string): Promise<User> {
  username = username.trim();
  const result = await db.query("SELECT id, username, email, created FROM users WHERE username = $1", [username]);
  return result.rows[0];
}

async function getByID(id: number): Promise<User> {
  let result = await db.query("SELECT id, username, email, created FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

// returns (possibly empty) array, probably won't use this except for manual admin
// async function getByEmail(email) {
//   return db.query("SELECT id, username, email, created FROM users WHERE email = $1", [email]).then(result => result.rows);
// }

// application logic is in charge of validating, this is raw
async function setPassword(username: string, password: string | null): Promise<void> {
  username = username.trim();
  let hashedPassword = null; // explicit sql null
  if (password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  await db.query("UPDATE users SET password = $2 WHERE username = $1", [username, hashedPassword]);
}

// returns user
async function setEmail(username: string, email: string | null): Promise<User> {
  username = username.trim();
  email = email || null; // '' => explicit sql null
  if (email) {
    email = email.trim();
  }
  let result = await db.query("UPDATE users SET email = $2 WHERE username = $1 RETURNING id, username, email, created", [username, email]);
  return result.rows[0];
}

// schema should just make this cascade to dogears.
async function purgeByName(username: string): Promise<void> {
  username = username.trim();
  await db.query("DELETE FROM users WHERE username = $1", [username]);
}
