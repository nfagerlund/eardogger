To update this from the real databases, you want something like:

```
pg_dump -d $DATABASE_URL --no-owner --no-acl --clean --exclude-table migrations --schema-only > schema/schema.sql
pg_dump -d $DATABASE_URL --no-owner --no-acl --clean --table migrations > schema/migrations.sql
```

Since both scripts will drop the migrations sequence object, IMPORT THE SCHEMA BEFORE THE MIGRATIONS TABLE.
