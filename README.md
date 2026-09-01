# SMEBUZE

Multi-tenant GST ERP for MSMEs (India). NestJS API + Next.js app. Live domain: **https://smebuze.com** (API: **https://api.smebuze.com**).

## Branches

| Branch | What it is | When to use |
|--------|------------|-------------|
| **`main`** | Development. Day-to-day commits. | Build features here. Push `main` anytime. **Does not** deploy the VPS. |
| **`production`** | What Hostinger runs. | Merge `main` into `production` and push when the live site should update. GitHub Actions SSHs to the VPS and reloads PM2. |

```bash
# daily work
git checkout main
git add -A && git commit -m "Your message"
git push origin main

# ship to smebuze.com
bash scripts/promote-to-production.sh
```

`scripts/promote-to-production.sh` merges `main` → `production` and pushes. Never commit secrets. Never put `.env` in git.

Payment gateway is **off** until you add a provider (`PAYMENT_GATEWAY_ENABLED` unset).

## START.md — run on your machine

**[START.md](START.md)** is the local runbook: first-time database, how to start API + website, and demo logins.

Summary:

1. `cp .env.example .env` and set `JWT_SECRET` / `DB_*`
2. PostgreSQL running, database `smebuze`
3. `npm run db:migrate` then optional `npm run seed:demo`
4. `npm run api:dev` → http://localhost:3000/api/v1
5. `npm run website:dev` → http://localhost:3001 (login at `/login`)

## Repo layout

| Path | Role |
|------|------|
| `apps/api` | NestJS API (`/api/v1`) — auth, tenants, CRM, sales, purchase, inventory, accounting, Ice Crest, POS |
| `apps/website` | Next.js marketing site + logged-in app |
| `packages/db-migrations` | SQL migrations (`npm run db:migrate`) |
| `ecosystem.config.cjs` | PM2: `smebuze-api` (127.0.0.1:3000), `smebuze-web` (127.0.0.1:3001) |
| `scripts/deploy.sh` | VPS deploy (production branch only) |
| `deploy/nginx/` | Nginx site files for smebuze.com and api.smebuze.com |

`.cursor/` and `docs/` stay on your computer only. They are gitignored and not pushed.

## Production (Hostinger VPS)

First time only (shared VPS — do not `pm2 delete all` or overwrite other Nginx sites):

1. DNS A records: `smebuze.com`, `www.smebuze.com`, `api.smebuze.com` → VPS IP
2. Ubuntu: Node 20+, PM2, Nginx, Certbot, PostgreSQL, UFW 22/80/443
3. Postgres user + database `smebuze` (do not drop other databases)
4. Clone **production** into `/var/www/smebuze`
5. Create `/var/www/smebuze/.env` from `.env.example` (production URLs, `HOST=127.0.0.1`, Hostinger SMTP). `chmod 600`
6. `apps/website/.env.local`: `NEXT_PUBLIC_API_URL=https://api.smebuze.com`
7. `npm ci`, `npm run db:migrate`, `npm run api:build`, `npm run website:build`
8. `pm2 start ecosystem.config.cjs` && `pm2 save`
9. Copy `deploy/nginx/*.conf` into `/etc/nginx/sites-available/`, enable, `nginx -t`, reload
10. `sudo certbot --nginx -d smebuze.com -d www.smebuze.com -d api.smebuze.com`
11. GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. VPS needs a read-only GitHub deploy key to `git fetch`.

Later updates: push **`production`**. Action runs `scripts/deploy.sh` (migrate, build, reload **only** `smebuze-api` and `smebuze-web`).

## API (local)

- `POST /api/v1/auth/signup` — new organisation
- `POST /api/v1/auth/login` — body `email`, `password`, optional `tenantSlug`
- `POST /api/v1/auth/verify-otp` / `resend-otp` — email verification
- `POST /api/v1/auth/forgot-password` — OTP + reset link
- Tenant-scoped CRM, sales, purchase, inventory, accounting, reports — JWT required

Demo password after `npm run seed:demo`: `Password123`. Super admin `superadmin@smebuzz.com` (empty workspace). Tenant admin `admin@demo.com` / slug `demo`.

## Docker (optional)

```bash
docker compose up -d
```

API http://localhost:3000 — Postgres on 5432. Prefer [START.md](START.md) for local UI work.
