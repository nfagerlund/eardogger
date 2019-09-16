ALTER TABLE dogears ADD COLUMN current_noprotocol DEFAULT regexp_replace(current, '^https?://', '');
