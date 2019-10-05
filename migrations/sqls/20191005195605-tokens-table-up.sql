CREATE TABLE tokens (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer REFERENCES users (id) NOT NULL,
    token text UNIQUE NOT NULL,
    description text,
    created timestamptz DEFAULT CURRENT_TIMESTAMP
);
