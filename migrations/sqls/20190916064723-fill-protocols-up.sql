UPDATE dogears SET current_protocol = (regexp_match(current, '^https?'))[1] WHERE current_protocol IS NULL;
