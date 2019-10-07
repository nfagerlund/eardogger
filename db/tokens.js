const db = require('./pg');
const crypto = require('crypto');

module.exports = {
  create,
  destroy,
  getAuthenticatedUser,
  list,
};

// ok, bytes me
async function generateToken() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      resolve(buffer.toString('hex'));
    });
  });
}

// Returns the token object INCLUDING the token text. Only time that can happen.
async function create(userID, description) {
  if (typeof userID != 'number') {
    throw new TypeError("Create token requires numeric userID");
  }
  description = description || null;
  const token = await generateToken();
  const result = await db.query(
    "INSERT INTO tokens (user_id, token, description) VALUES ($1, $2, $3) RETURNING id, user_id, token, description, created",
    [userID, token, description]
  );
  return result.rows[0];
}

async function destroy(userID, id) {
  if (typeof userID !== 'number' || typeof id !== 'number') {
    throw new TypeError("Destroy token requires numeric userID and id");
  }
  const result = await db.query("DELETE FROM tokens WHERE user_id = $1 AND id = $2", [userID, id]);
  if (result.rowCount === 0) {
    throw new Error("Can't delete that");
  }
}

// Returns false or the user object associated with a token, with an extra tokenAuth: true property.
async function getAuthenticatedUser(token) {
  if (!token) {
    throw new TypeError("Get authenticated user from token requires token");
  }
  const result = await db.query("SELECT users.id AS id, users.username AS username, users.email AS email, users.created AS created FROM tokens INNER JOIN users ON tokens.user_id = users.id WHERE tokens.token = $1", [token]);
  const user = result.rows[0];
  if (!user) {
    return false;
  }
  user.tokenAuth = true;
  return user;
}

// Returns array of token objects, minus the token text.
async function list(userID) {
  if (typeof userID != 'number') {
    throw new TypeError("List tokens requires numeric userID");
  }
  const result = await db.query("SELECT id, user_id, description, created FROM tokens WHERE user_id = $1", [userID]);
  return result.rows;
}

