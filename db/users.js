const db = require('./pg');
const bcrypt = require('bcryptjs');

module.exports = {
  create,
  authenticate,
  getByName,
  getByID,
  getByEmail,
  editByName,
  purgeByName,
};

async function create(username, password, email) {
  if (!username || !password) {
    throw new Error("Create user requires username and password");
  }
  if (await getByName(username)) { // might be inefficient, but
    throw new Error("Username already exists");
  }
  email = email || null; // explicit sql null
  const hashedPassword = await bcrypt.hash(password, 12);
  await db.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3)", [username, hashedPassword, email]);
}

async function authenticate(username, password) {
  if (!username || !password) {
    throw new Error("Authenticate user requires username and password");
  }
  const result = await db.query("SELECT password FROM users WHERE username = $1", [username]);
  try {
    const hashedPassword = result.rows[0].password;
    return bcrypt.compare(password, hashedPassword);
  } catch(err) { // user doesn't exist, probably
    return false;
  }
}

async function getByName(username) {
  const result = await db.query("SELECT id, username, email, created FROM users WHERE username = $1", [username]);
  return result.rows[0];
}

async function getByID(id) {
  return db.query("SELECT id, username, email, created FROM users WHERE id = $1", [id]).then(result => result.rows[0]);
}

// returns (possibly empty) array, probably won't use this except for manual admin
async function getByEmail(email) {
  return db.query("SELECT id, username, email, created FROM users WHERE email = $1", [email]).then(result => result.rows);
}

// application logic is in charge of validating, this is raw
async function setPassword(username, password) {
  if (!username) {
    throw new Error("setPassword requires username"); // but blanking pw is ok
  }
  let hashedPassword = null; // explicit sql null
  if (password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  await db.query("UPDATE users SET password = $2 WHERE username = $1", [username, hashedPassword]);
}

// returns user
async function setEmail(username, email) {
  email = email || null; // explicit sql null
  return db.query("UPDATE users SET email = $2 WHERE username = $1 RETURNING id, username, email, created", [username, email]).then(result => result.rows[0]);
}

// schema should just make this cascade to dogears.
async function purgeByName(username) {
  await db.query("DELETE FROM users WHERE username = $1", [username]);
}

