const {Client} = require('pg');
const {readTextFilePromise} = require('../util');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV !== 'test'
});


async function dropAllAndCreateSchema() {

}

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

