/* If the current URL's hostname starts with "m.<some garbage>", make sure the prefix does too. */

UPDATE dogears SET
    prefix =
        ( regexp_matches(current, '^https?://(m\.((m|www)\.)*)') )[1]
        || prefix
    WHERE
        ( NOT starts_with(prefix, 'm.') )
        AND
        current ~ '^https?://m\.';
