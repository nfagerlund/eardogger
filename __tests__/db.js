// setup stuff
const fs = require('fs');
const dbmigrate = require('db-migrate').getInstance(true, {env: 'test'});
const {Pool, Client} = require('pg');

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

const readTextFilePromise = file => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

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
  test("Dogears models", async () => {
    // I basically have to cram all of these into one test, because I'm mutating
    // a real database here (because that's the only way to actually check my
    // sql), and so I'll basically go to hell if I try to run these in parallel.
    // Luckily you can do a bunch of expects within one test. So that'll have to
    // do. Ugh, it really should be separate tests tho, with descriptions...

    // TODO TEMP: gotta make sure a user exists before I can insert anything.
    await db.query("INSERT INTO users (username) VALUES ('test_user')");

    // Also, I'm doing a couple different ways of balancing all the async terms, sorry.
    // first, just make sure we're not talking to prod and the dogears table is empty.
    expect(await dogears.list(1)).toStrictEqual([]);

    // Next just make sure creating a dogear works.
    await expect(dogears.create(1, 'example.com/comic/', 'https://example.com/comic/240', 'Example Comic')).resolves.toBeUndefined();
    // I tried a bunch of things, and that IS the expected result from an async
    // function that doesn't throw but also doesn't return anything.

    // TODO:
    // - once there's an ID field, return the ID from that create call, using "RETURNING"
    // - make another create test with a duplicate prefix, and confirm that it returns the same ID.
    // - normalize trailing slashes in the prefix, and guarantee behavior with another duplicate create test.

    // TODO:
    // - make update return ID too.
    // - Test that updating a URL returns the right dogear from the previously created ones.
    // - add error handling to update, test against a nonexistent prefix.

    // Next, make sure the dogear actually got created.
    const listWithOne = await dogears.list(1);
    expect(listWithOne).toHaveLength(1);
    expect(listWithOne[0]).toHaveProperty('current', 'https://example.com/comic/240');

    // Hopefully create will throw an error if I just fuck it up completely
    await expect(dogears.create(1)).rejects.toThrow();

    // Prove that I re-enabled the upsert:
    await expect(dogears.create(1, 'example.com/comic/', 'https://example.com/comic/250', 'Example Comic')).resolves.toBeUndefined();
    const stillOnlyOne = await dogears.list(1);
    expect(stillOnlyOne).toHaveLength(1); // because upsert
    expect(stillOnlyOne[0]).toHaveProperty('current', 'https://example.com/comic/250');
  });


});

describe("User database layer", () => {
  test("Create and authenticate", async () => {
    // Need this before anything else
    await expect(users.create('test_create_and_auth', 'aoeuhtns', 'nf@example.com')).resolves.toBeUndefined();
    // Rest of this can go in any order tho.
    await Promise.all([
      // No blanks when creating
      expect(users.create('', 'aoeua')).rejects.toThrow(/requires/),
      // But omitting email is ok
      expect(users.create('test_create_and_auth_noemail', 'aoeuhtns')).resolves.toBeUndefined(),
      // No blanks when validating
      expect(users.authenticate('test_create_and_auth', '')).rejects.toThrow(/requires/),
      // Pw validates
      expect(users.authenticate('test_create_and_auth', 'aoeuhtns')).resolves.toBe(true),
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
