UPDATE dogears SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE dogears ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE dogears ADD CONSTRAINT dogears_prefix_user_id_unique UNIQUE (user_id, prefix);
