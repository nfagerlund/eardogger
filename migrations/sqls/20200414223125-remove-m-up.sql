/* Ensure at least one "canonical" (no m. / www. gunk) prefix exists for each set of overlapping prefixes. */
WITH targets AS (
    SELECT DISTINCT ON ( regexp_replace(prefix, '^((m|www)\.)+', '') )
        id
    FROM dogears WHERE
        prefix ~ '^((m|www)\.)+'
        AND
        NOT EXISTS (
            SELECT id FROM dogears AS other WHERE regexp_replace(dogears.prefix, '^((m|www)\.)+', '') = other.prefix
        )
)
UPDATE dogears
    SET prefix = regexp_replace(prefix, '^((m|www)\.)+', '')
    WHERE id IN (SELECT id FROM targets);

/* Then, update the canonical bookmark with the newest value from among it and its duplicates. This WITH clause only gives one row per set, limited to (plain, newest duplicate). */
WITH duplicates AS (
    SELECT DISTINCT ON (plain)
        plain.id AS plain,
        dupe.id AS dupe,
        plain.prefix AS plain_prefix,
        dupe.prefix AS dupe_prefix,
        plain.current AS plain_current,
        dupe.current AS dupe_current,
        plain.updated AS plain_updated,
        dupe.updated AS dupe_updated
    FROM dogears AS plain INNER JOIN dogears AS dupe ON
        ( plain.user_id = dupe.user_id ) AND
        ( dupe.prefix ~ '^((m|www)\.)+' ) AND
        ( regexp_replace(dupe.prefix, '^((m|www)\.)+', '') = plain.prefix )
    ORDER BY plain, dupe_updated DESC
)
UPDATE dogears
    SET (current, updated) = (SELECT dupe_current, dupe_updated FROM duplicates WHERE dogears.id = duplicates.plain)
    WHERE dogears.id IN (SELECT plain FROM duplicates WHERE dupe_updated > plain_updated);

/* Then, delete all non-canonical bookmarks: */
DELETE FROM dogears WHERE prefix ~ '^((m|www)\.)+';
