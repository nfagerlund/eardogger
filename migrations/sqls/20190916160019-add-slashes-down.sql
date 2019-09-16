UPDATE dogears SET current_protocol = (regexp_match(current_protocol, '^https?'))[1] WHERE current_protocol LIKE '%://';
