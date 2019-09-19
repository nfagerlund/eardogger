To update this from the real databases, you want something like:

```
pg_dump -d $DATABASE_URL --no-owner --no-acl --table migrations > schema/migrations.sql
pg_dump -d $DATABASE_URL --no-owner --no-acl --exclude-table migrations --schema-only > schema/schema.sql
```
