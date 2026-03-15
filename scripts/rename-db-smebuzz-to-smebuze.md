# Rename database smebuzz → smebuze (fix pgAdmin "must be owner" error)

PostgreSQL only allows the **database owner** (or a superuser) to rename a database. In pgAdmin you see owner **postgres**, so you must run the rename as **postgres**.

You have two databases: **smebuzz** (your data) and **smebuze** (new one we created). To make **smebuzz** become **smebuze**:

---

## Option 1: In pgAdmin (as owner)

1. **Connect as postgres**
   - In pgAdmin, disconnect from the current server.
   - Right‑click the server → **Properties** → **Connection**.
   - Set **Username** to `postgres` and use the postgres password.
   - Save and reconnect.

2. **Close all connections to both databases**
   - Stop the API if it’s running (`Ctrl+C` in the terminal where `npm run api:dev` is running).
   - In pgAdmin, close any Query Tool tabs that use `smebuzz` or `smebuze`.
   - Otherwise you may get "database is being accessed by other users" when dropping.

3. **Rename via SQL**
   - Open **Tools → Query Tool** (connected to any DB, e.g. `postgres`).
   - Run (in order):

```sql
-- 1. Drop the empty/new smebuze so the name is free
DROP DATABASE IF EXISTS smebuze;

-- 2. Rename smebuzz to smebuze (you must be owner of smebuzz = postgres)
ALTER DATABASE smebuzz RENAME TO smebuze;
```

4. **Refresh** the Databases list in pgAdmin; you should see only **smebuze**.

---

## Option 2: From terminal (as postgres user)

**Stop the API first** (so nothing is connected to `smebuze`), then:

```bash
# Drop the new smebuze, then rename smebuzz to smebuze
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS smebuze;"
psql -U postgres -d postgres -c "ALTER DATABASE smebuzz RENAME TO smebuze;"
```

If you get "database smebuze is being accessed by other users", close pgAdmin tabs or any app using it, then run the commands again. If psql asks for a password, use the postgres user’s password.

---

## After rename

- Your API should use **smebuze** (default), so no `.env` change needed.
- In pgAdmin, connect with any user that has access to **smebuze**; you don’t need to be owner just to browse or query.
