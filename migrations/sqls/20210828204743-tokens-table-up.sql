CREATE TYPE token_scope AS ENUM ('write_dogears', 'manage_dogears');

CREATE TABLE tokens (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id integer REFERENCES users (id) ON DELETE CASCADE,
  token_hash text,
  scope token_scope,
  created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  comment text
);
