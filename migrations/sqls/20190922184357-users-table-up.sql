CREATE TABLE users (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username text UNIQUE NOT NULL CHECK (username SIMILAR TO '[a-zA-Z0-9\-_]+'),
    password text,
    email text,
    created timestamptz DEFAULT current_timestamp
);

INSERT INTO users (username) VALUES ('initial_user');

ALTER TABLE dogears ADD COLUMN user_id integer REFERENCES users (id) ON DELETE CASCADE;


