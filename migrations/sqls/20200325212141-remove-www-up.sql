/* For dupes, update the non-www bookmark IF the www version was updated more recently. */
WITH duplicates AS (
    SELECT
        plain.id AS plain,
        www.id AS www,
        plain.prefix AS plain_prefix,
        www.prefix AS www_prefix,
        plain.current AS plain_current,
        www.current AS www_current,
        plain.updated AS plain_updated,
        www.updated AS www_updated
    FROM dogears AS plain INNER JOIN dogears AS www ON plain.user_id = www.user_id AND 'www.' || plain.prefix = www.prefix
)
UPDATE dogears
    SET (current, updated) = (SELECT www_current, www_updated FROM duplicates WHERE dogears.id = duplicates.plain)
    WHERE dogears.id IN (SELECT plain FROM duplicates WHERE www_updated > plain_updated);

/* Then, delete all www bookmarks that have a non-www duplicate: */
WITH duplicates AS (
    SELECT
        plain.id AS plain,
        www.id AS www,
        plain.prefix AS plain_prefix,
        www.prefix AS www_prefix,
        plain.current AS plain_current,
        www.current AS www_current,
        plain.updated AS plain_updated,
        www.updated AS www_updated
    FROM dogears AS plain INNER JOIN dogears AS www ON plain.user_id = www.user_id AND 'www.' || plain.prefix = www.prefix
)
DELETE FROM dogears WHERE dogears.id IN (SELECT www FROM duplicates);

/* Finally, keep any unique www bookmarks, but trim the leading "www." from their prefix: */
UPDATE dogears
    SET prefix = substring(prefix, 5) WHERE starts_with(prefix, 'www.');
