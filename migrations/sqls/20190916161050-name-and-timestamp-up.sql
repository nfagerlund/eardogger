ALTER TABLE dogears ADD COLUMN display_name text, ADD COLUMN updated timestamptz DEFAULT current_timestamp;
