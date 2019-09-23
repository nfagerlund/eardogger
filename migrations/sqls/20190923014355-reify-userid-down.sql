ALTER TABLE dogears DROP CONSTRAINT dogears_prefix_user_id_unique;
ALTER TABLE dogears ALTER COLUMN user_id DROP NOT NULL;
