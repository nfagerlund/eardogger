To update this from the real databases, you want something like:

```
pg_dump -d $DATABASE_URL --no-owner --no-acl --clean --if-exists --schema-only > schema/schema.sql
pg_dump -d $DATABASE_URL --no-owner --no-acl --data-only --inserts --table migrations > schema/migrations.sql
```

Since both scripts will drop the migrations sequence object, IMPORT THE SCHEMA BEFORE THE MIGRATIONS TABLE.
