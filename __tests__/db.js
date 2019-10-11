// setup stuff
const fs = require('fs');
const dbmigrate = require('db-migrate').getInstance(true, {env: 'test'});
const {Pool, Client} = require('pg');
const {readTextFilePromise} = require('../util');

const testDB = {
  connectionString: 'postgres://localhost/eardogger', // TODO??
  ssl: false,
};
const client = new Client(testDB);
const pool = new Pool(testDB);

// swap in the test database for the main db helper
jest.mock('../db/pg');
const db = require('../db/pg'); // crosses fingers
db.query.mockImplementation( (text, params) => pool.query(text, params) );

// stuff I'm actually testing:
const dogears = require('../db/dogears');
const users = require('../db/users');
const tokens = require('../db/tokens');

beforeAll( async () => {
  // run sql to set up localhost postgres database; sql includes teardown of
  // existing tables and objects.
  await client.connect();
  const schema = await readTextFilePromise(__dirname + '/../schema/schema.sql');
  await client.query(schema);
  const migrations = await readTextFilePromise(__dirname + '/../schema/migrations.sql');
  await client.query(migrations);
  await client.end();

  // migrations, in case the schema's out of date
  await dbmigrate.up();
});

describe("Dogears database layer", () => {
//   test("just query something and make sure we have the right db", async () => {
//     const res = await db.query("SELECT * FROM dogears", []);
//     expect(res.rows.length).toBe(0);
//   });
//
  test("Create and list", async () => {
    // Set up a user, no pw/email
    const {id: userID} = await users.create('dogears_create_and_list');

    // No dogears for new user
    await expect(dogears.list(userID)).resolves.toStrictEqual([]);

    // Make sure creating a dogear works.
    await Promise.all([
      // A normal one.
      expect(dogears.create(userID, 'example.com/comic/', 'https://example.com/comic/240', 'Example Comic')).resolves.toMatchObject({prefix: 'example.com/comic/'}),
      // A second one, with no title.
      expect(dogears.create(userID, 'example.com/story/', 'https://example.com/story/2')).resolves.toBeDefined(),
      // A third, with no current.
      expect(dogears.create(userID, 'example.com/extras/')).resolves.toBeDefined(),
      // A malformed one
      expect(dogears.create('example.com/explodes/')).rejects.toThrow(),
    ]);

    // Three dogears now
    await expect(dogears.list(userID)).resolves.toHaveLength(3);
  });

  test("Save and restore", async () => {
    // Set up user
    const {id: userID} = await users.create('dogears_update');

    // Basic usage
    await dogears.create(userID, 'example.com/comic/', 'https://example.com/comic/240', 'Example Comic');
    await Promise.all([
      expect(dogears.currently(userID, 'https://example.com/comic/1'))
        .resolves.toBe('https://example.com/comic/240'),
      expect(dogears.currently(userID, 'example.com/comic/   '))
        .resolves.toBe('https://example.com/comic/240'),
      expect(dogears.currently(userID, 'https://example.com/com'))
        .resolves.toBe(false),
      // Malformed call to currently()
      expect(dogears.currently('https://example.com/comic/1'))
        .rejects.toThrow(/requires/),
    ]);

    // Updating w/ update()
    await expect(dogears.update(userID, '   https://example.com/comic/241'))
      .resolves.toHaveLength(1);
    await expect(dogears.currently(userID, 'example.com/comic/'))
      .resolves.toBe('https://example.com/comic/241');
    await expect(dogears.update(userID, 'https://example.com/com/not-dogeared'))
      .rejects.toThrow();

    // Updating w/ create()'s fallback behavior
    // also stripping protocol from prefix
    await expect(dogears.create(userID, 'http://example.com/comic/', 'https://example.com/comic/242', 'New Name')).resolves.toBeDefined();
    let list = await dogears.list(userID);
    await Promise.all([
      expect(list).toHaveLength(1),
      expect(list[0]).toMatchObject({
        current: 'https://example.com/comic/242',
        display_name: 'New Name',
        prefix: 'example.com/comic/',
      }),
    ]);

  });

  test("Deletion, access control", async () => {
    // Set up users
    const {id: userOne} = await users.create('dogears_delete_one');
    const {id: userTwo} = await users.create('dogears_delete_two');

    const {id: dogearID} = await dogears.create(userOne, 'example.com/comic/', 'https://example.com/comic/1');

    // User two can't destroy
    await expect(dogears.destroy(userTwo, dogearID)).rejects.toThrow();
    // User one can destroy
    await expect(dogears.destroy(userOne, dogearID)).resolves.toBeUndefined();
    await expect(dogears.list(userOne)).resolves.toHaveLength(0);
  });

});

describe("User database layer", () => {
  test("Create and authenticate", async () => {
    // Setup, also create should return a user object
    await expect(users.create('test_create_and_auth', 'aoeuhtns', 'nf@example.com')).resolves.toMatchObject({
      username: 'test_create_and_auth',
      email: 'nf@example.com',
    });
    // Rest of this can go in any order tho.
    await Promise.all([
      // No blank usernames
      expect(users.create('', 'aoeua')).rejects.toThrow(/requires/),
      // But omitting email is ok
      expect(users.create('test_create_and_auth_noemail', 'aoeuhtns')).resolves.toBeDefined(),
      // And blank password just disables login for a user
      expect(users.create('test_create_and_auth_nopw')).resolves.toBeDefined(),
      // No spaces in username
      expect(users.create('space cadet')).rejects.toThrow(),
      // But yes spaces in passwords
      expect(users.create('spacecadet', ' im in space').then(() => {
        return users.authenticate('spacecadet', ' im in space');
      })).resolves.toBe(true),
      // No blanks when validating
      expect(users.authenticate('test_create_and_auth', '')).rejects.toThrow(/requires/),
      // Pw validates
      expect(users.authenticate('test_create_and_auth', 'aoeuhtns')).resolves.toBe(true),
      // Trims space on username
      expect(users.authenticate('  test_create_and_auth ', 'aoeuhtns')).resolves.toBe(true),
      // Doesn't trim space on passwords
      expect(users.authenticate('  test_create_and_auth ', '  aoeuhtns')).resolves.toBe(false),
      // Wrong pw doesn't validate
      expect(users.authenticate('test_create_and_auth', 'snthueoa')).resolves.toBe(false),
      // Nonexistent user indistinguishable from wrong pw, doesn't throw
      expect(users.authenticate('test_create_and_auth_doesnt_exist', 'aoeuhtns')).resolves.toBe(false),
    ]);
  });

  test("Lookup", async () => {
    // Need this before rest
    await users.create('test_lookup', 'aoeusnth', 'nff@example.com');
    const thatUser = await users.getByName('test_lookup');
    expect(thatUser.username).toBe('test_lookup');
    await expect(users.getByID(thatUser.id)).resolves.toHaveProperty('username', 'test_lookup');
  });

  test("Edit password", async () => {
    // Need this before rest
    await users.create('test_edit_pw', 'htnsueoa');
    await expect(users.setPassword('test_edit_pw', 'ueoahtns')).resolves.toBeUndefined();
    // New pw works
    await expect(users.authenticate('test_edit_pw', 'ueoahtns')).resolves.toBe(true);

    await users.setPassword('test_edit_pw', '');
    // Can't log in anymore
    await expect(users.authenticate('test_edit_pw', 'ueoahtns')).resolves.toBe(false);
    // ...and authenticating with empty string or other falsy value just throws.

    await users.setPassword('test_edit_pw');
    // same deal
    await expect(users.authenticate('test_edit_pw', 'ueoahtns')).resolves.toBe(false);
  });

  test("Edit email", async () => {
    await Promise.all([
      users.create('test_edit_email', 'aaaaaaaa', 'has_email@example.com'),
      users.create('test_edit_email2', 'aaaaaaaa'),
    ]);

    await Promise.all([
      expect(users.getByName('test_edit_email')).resolves.toHaveProperty('email', 'has_email@example.com'),
      expect(users.getByName('test_edit_email2')).resolves.toHaveProperty('email', null),
    ]);

    await Promise.all([
      expect(users.setEmail('test_edit_email', '')).resolves.toMatchObject({username: 'test_edit_email', email: null}),
      expect(users.setEmail('test_edit_email2', 'now_has@example.com')).resolves.toHaveProperty('email', 'now_has@example.com'),
    ]);

    // it persisted
    await expect(users.getByName('test_edit_email2')).resolves.toHaveProperty('email', 'now_has@example.com');
  });

});

describe("tokens database layer", () => {
  let myID, notMyID;

  beforeAll( async () => {
    ( {id: myID} = await users.create('tokens_my_user') );
    ( {id: notMyID} = await users.create('tokens_not_my_user') );
  });

  test("get token, authenticate with it", async () => {
    const token = await tokens.create(myID, "get_and_authenticate");
    await expect(tokens.getAuthenticatedUser(token.token)).resolves.toHaveProperty('username', 'tokens_my_user');
  });

  test("get token, never see it again", async () => {
    await tokens.create(myID, "get_and_lose");
    await expect(tokens.list(myID))
  });
});
