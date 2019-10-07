const db = require('./pg');
const bcrypt = require('bcryptjs');

module.exports = {
  create,
  authenticate,
  getByName,
  getByID,
//   getByEmail,
  setPassword,
  setEmail,
  purgeByName,
};

// returns user
async function create(username, password, email) {
  if (!username || typeof username !== 'string') {
    throw new TypeError("Create user requires username");
  }
  username = username.trim();
  if (await getByName(username)) { // might be inefficient, but
    throw new Error("Username already exists");
  }
  email = email || null; // explicit sql null
  if (email) {
    email = email.trim();
  }
  let hashedPassword = null;
  if (password && typeof password === 'string') {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  const result = await db.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email, created", [username, hashedPassword, email]);
  return result.rows[0];
}

// Only returns true or false, you still need to get the user. Possibly a misstep.
async function authenticate(username, password) {
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    throw new TypeError("Authenticate user requires username and password");
  }
  username = username.trim();
  const result = await db.query("SELECT password FROM users WHERE username = $1", [username]);
  try {
    const hashedPassword = result.rows[0].password;
    if (hashedPassword) {
      return bcrypt.compare(password, hashedPassword);
    } else {
      return false;
    }
  } catch(err) { // user doesn't exist, probably
    return false;
  }
}

async function getByName(username) {
  if (typeof username === 'string') {
    username = username.trim();
    const result = await db.query("SELECT id, username, email, created FROM users WHERE username = $1", [username]);
    return result.rows[0];
  } else {
    throw new TypeError("Get user by name requires username");
  }
}

async function getByID(id) {
  if (typeof id === 'number') {
    return db.query("SELECT id, username, email, created FROM users WHERE id = $1", [id]).then(result => result.rows[0]);
  } else {
    throw new TypeError("Get user by ID requires numeric ID");
  }
}

// returns (possibly empty) array, probably won't use this except for manual admin
// async function getByEmail(email) {
//   return db.query("SELECT id, username, email, created FROM users WHERE email = $1", [email]).then(result => result.rows);
// }

// application logic is in charge of validating, this is raw
async function setPassword(username, password) {
  if (!username || typeof username !== 'string') {
    throw new TypeError("setPassword requires username"); // but blanking pw is ok
  }
  username = username.trim();
  let hashedPassword = null; // explicit sql null
  if (password && typeof password === 'string') {
    hashedPassword = await bcrypt.hash(password, 12);
  }
  await db.query("UPDATE users SET password = $2 WHERE username = $1", [username, hashedPassword]);
}

// returns user
async function setEmail(username, email) {
  if (!username || typeof username !== 'string') {
    throw new TypeError("setEmail requires username"); // but blanking pw is ok
  }
  username = username.trim();
  email = email || null; // explicit sql null
  if (email && typeof email === 'string') {
    email = email.trim();
  }
  return db.query("UPDATE users SET email = $2 WHERE username = $1 RETURNING id, username, email, created", [username, email]).then(result => result.rows[0]);
}

// schema should just make this cascade to dogears.
async function purgeByName(username) {
  if (!username || typeof username !== 'string') {
    throw new TypeError("purgeByName requires username"); // but blanking pw is ok
  }
  username = username.trim();
  await db.query("DELETE FROM users WHERE username = $1", [username]);
}

