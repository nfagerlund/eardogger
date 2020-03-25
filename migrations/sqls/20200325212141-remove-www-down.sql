/* If the current URL has a "www.", make sure the prefix does as well. */

UPDATE dogears SET prefix = 'www.' || prefix
    WHERE
        ( NOT starts_with(prefix, 'www.') )
        AND (
            starts_with(current, 'http://www.')
            OR
            starts_with(current, 'https://www.')
        );
