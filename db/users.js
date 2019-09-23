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

// I don't think I'll ever want to edit by ID?
async function editByName(username, {email, password}) {
  email = email || null; // explicit sql null
  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  return db.query("UPDATE users SET email = COALESCE($2, email), password = COALESCE($3, password) WHERE username = $1 RETURNING id, username, email, created", [username, email, hashedPassword]).then(result => result.rows[0]);
}

async function purgeByName(username) {
  await db.query("DELETE FROM users WHERE username = $1", [username]);
  // schema should just make this cascade to dogears.
}

