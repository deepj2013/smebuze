# SMEBUZE — Deployment checklist

Use this as a one-page checklist to deploy the API and web app (e.g. to a VPS or cloud).

---

## 1. API (NestJS)

### Build

```bash
cd /path/to/SMEBUZE
npm ci
npm run api:build
```

### Environment

Create `.env` (or set env vars) with:

- `PORT` — API port (default 3000)
- `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL connection
- `JWT_SECRET` — Strong secret for signing JWTs
- `CORS_ORIGIN` — Allowed origin(s) for the web app (e.g. `https://app.smebuzz.com` or `*` for dev)

### Database

- PostgreSQL 14+ running.
- Create database: `createdb smebuzz` (or your DB name).
- Run migrations: `npm run db:migrate`
- (Optional) Seed demo: `npm run seed:demo`

### Run

- **Process manager:** Use PM2, systemd, or your platform’s process manager to run `node apps/api/dist/main.js` (or `npm run api:start` if defined).
- **Docker:** `docker-compose up -d` to start API + Postgres as defined in the repo.

---

## 2. Web app (Next.js)

### Build

```bash
npm run website:build
```

Set **`NEXT_PUBLIC_API_URL`** to your API base URL (e.g. `https://api.smebuzz.com`) before building, so the client uses the correct API.

### Run

- **Static/Node:** `npm run website:start` (or `npx next start`) in the `apps/website` directory.
- **Platform:** Deploy to Vercel, Netlify, or any Node host; set `NEXT_PUBLIC_API_URL` in the project environment.

### CORS

- Ensure the API’s `CORS_ORIGIN` includes the web app’s origin (e.g. `https://app.smebuzz.com`).

---

## 3. Quick checklist

- [ ] PostgreSQL created and migrations run
- [ ] API `.env` (or env vars) set: DB, `JWT_SECRET`, `CORS_ORIGIN`
- [ ] API build and running (PM2 / systemd / Docker)
- [ ] Web app built with `NEXT_PUBLIC_API_URL` pointing to API
- [ ] Web app running (Node or hosted on Vercel/Netlify)
- [ ] Login and main flows tested (tenant slug, dashboard, create vendor/invoice)

---

## 4. Backup and restore

- **Backup:** Schedule regular PostgreSQL backups, e.g.:
  ```bash
  pg_dump -h localhost -U postgres -Fc smebuzz > smebuzz_$(date +%Y%m%d).dump
  ```
- **Backup scheduler option:** Use cron or a managed backup service.
  - **Cron example (daily at 2 AM):** Add to crontab: `0 2 * * * /path/to/backup-smebuzz.sh`
  - **backup-smebuzz.sh:** `#!/bin/bash`; set `PGHOST`, `PGUSER`, `PGDATABASE`; run `pg_dump -Fc ...`; optionally upload to S3/GCS or copy to another server.
  - **Managed:** Use your cloud provider’s automated backups (e.g. RDS, Cloud SQL) or a tool like pgBackRest.
- **Restore steps:**
  1. Stop the API (and any writers to the DB).
  2. Restore: `pg_restore -h localhost -U postgres -d smebuzz --clean --if-exists smebuzz_YYYYMMDD.dump` (or `psql ... < smebuzz.sql` for plain SQL dump).
  3. Run any pending migrations if the backup is from an older version: `npm run db:migrate`.
  4. Restart the API and verify.
- Retain backups per policy (e.g. 90 days); store off-server or in object storage.

---

## 5. On-premise / single-tenant

For a single-tenant (on-prem) deployment:

- Use one database and one tenant record; set `tenants.slug` and point users to that slug at login.
- **Docker bundle:** Use the repo’s Docker setup (e.g. `docker-compose`) with env template (copy `.env.example` to `.env` and set `DB_*`, `JWT_SECRET`, `CORS_ORIGIN`).
- **License:** Optionally validate a license key file or env var against `tenants.license_key` for on-prem builds.
- Run migrations with `npm run db:migrate` (or your migration runner) before starting the API.

---

## 6. Optional

- **HTTPS:** Put the API and web app behind a reverse proxy (e.g. Nginx, Caddy) with SSL.
- **Redis:** Add to docker-compose or env if you introduce caching/sessions later.
- **Secrets:** In production, provide `JWT_SECRET` and DB URL from env or a vault; avoid default secrets.
- **Monitoring:** Health endpoint at `/api/v1/health`; add logging and alerting as needed.
- **Structured logging:** Set `LOG_FORMAT=json` in production for JSON log lines; set `LOG_LEVEL` (e.g. `debug`, `info`, `warn`, `error`) to control verbosity.
- **Error tracking:** Integrate Sentry (or similar): add `@sentry/node`, call `Sentry.init({ dsn: process.env.SENTRY_DSN })` in `main.ts`, and capture unhandled errors. Set `SENTRY_DSN` in production for the API; use Sentry’s React SDK in the web app for frontend errors.

---

*For local run and demo credentials, see `START.md`.*
