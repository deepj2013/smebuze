# SMEBUZE — Deploy on Ubuntu 26.04 LTS (smebuze.com)

This is the **one guide** to put SMEBUZE on a VPS at **https://smebuze.com** and **https://api.smebuze.com**.

This box is a **shared server**. You will run other websites and APIs on it later. Every SMEBUZE step is written so it **does not replace, delete, or reconfigure** those other apps.

When SMEBUZE is live:

| Piece | Public URL | Listens on this VPS |
|--------|------------|---------------------|
| Website (Next.js) | `https://smebuze.com` and `https://www.smebuze.com` | `127.0.0.1:3001` |
| API (NestJS) | `https://api.smebuze.com/api/v1` | `127.0.0.1:3000` |
| Health | `https://api.smebuze.com/api/v1/health` | same |
| PostgreSQL | **not public** | `127.0.0.1:5432` (database **smebuze** only) |

The browser talks to **smebuze.com** and **api.smebuze.com**. Nginx (HTTPS) proxies to Node. Postgres stays on localhost.

The last chapter ([Deploy another web app on this same VPS](#part-d--deploy-another-web-app-on-this-same-vps)) is the copy-paste pattern for the next product.

Payment gateway is **not** part of this deploy. Leave `PAYMENT_GATEWAY_ENABLED` unset (or `false`) until you add a provider later. Auto-deploy will not turn it on.

---

## What you need to deploy from this laptop

You do **not** copy the project over SFTP. You push Git; the VPS pulls branch **`production`**.

| On this machine / GitHub | On the Hostinger VPS (once) |
|--------------------------|-----------------------------|
| All app code in git (`main`, then `production`) | Ubuntu, Nginx, Node, PM2, Postgres, UFW — [Part A](#part-a--ubuntu-2604-once-shared-stack) |
| Repo: `https://github.com/deepj2013/smebuze.git` | Clone **`production`** into `/var/www/smebuze` — [Part B](#part-b--smebuze-application-isolated) |
| GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | `/var/www/smebuze/.env` (never in git): JWT, DB, mail, CORS |
| Optional: `VPS_PORT` if SSH is not 22 | `apps/website/.env.local` with `NEXT_PUBLIC_API_URL=https://api.smebuze.com` |
| DNS A records for `smebuze.com`, `www`, `api` | Nginx site files + Certbot — Steps 16–17 |
| | Read-only GitHub **deploy key** so the VPS can `git fetch` |

`.env` on your laptop stays local. Production secrets live only on the VPS.

**First time:** finish Part A + Part B + [Part E (auto-deploy keys)](#part-e--auto-deploy-from-branch-production) so PM2 is already running. **Every later ship:** merge `main` → `production` and push; GitHub Actions SSHs in and runs `scripts/deploy.sh` (migrate, build API + website, reload **only** `smebuze-api` and `smebuze-web`).

---

## Shared-VPS rules (read once)

Do these for **every** product on this machine, including SMEBUZE.

| Isolate | How |
|---------|-----|
| Files | Each app lives in its own folder: `/var/www/smebuze`, `/var/www/other-app`, … Never write into another app’s folder. |
| Linux user | Optional but recommended: OS user `smebuze` owns only `/var/www/smebuze`. |
| Node ports | Each app uses **unique** `127.0.0.1` ports. SMEBUZE uses **3000** (API) and **3001** (website). Next apps start at **3002**, **3003**, … |
| PM2 names | Unique process names: `smebuze-api`, `smebuze-web`. Never `pm2 delete all`. Never `pm2 kill`. |
| Nginx | One file per hostname under `/etc/nginx/sites-available/`. Only `nginx -t` then **reload**. Never overwrite `/etc/nginx/nginx.conf`. Never set `default_server` on SMEBUZE (that would steal traffic from other sites). |
| SSL | Certbot only with **this product’s** hostnames (`-d smebuze.com -d www.smebuze.com -d api.smebuze.com`). Do not add another product’s domain to this certificate. |
| Postgres | One **database** and **role** per product (`smebuze` / `smebuze`). Never `DROP DATABASE` for another app. Never `pg_dropcluster` / reinstall PostgreSQL to “fix” SMEBUZE. |
| Firewall | Open **22, 80, 443** once. Do not `ufw reset` later (that drops rules other apps rely on). Do not publish Node or Postgres ports. |
| Updates | `git pull` only inside `/var/www/smebuze`. Restart only `smebuze-api` and `smebuze-web`. |

Port register (keep this list on the server at `/var/www/PORTS.md` so the next deploy does not collide):

| Ports | Product | Nginx `server_name` | PM2 names |
|-------|---------|---------------------|-----------|
| 3000, 3001 | SMEBUZE | `smebuze.com`, `www.smebuze.com`, `api.smebuze.com` | `smebuze-api`, `smebuze-web` |
| 3002, 3003 | *(next app)* | *(its domains)* | *(its-api, its-web)* |

```bash
sudo tee /var/www/PORTS.md >/dev/null << 'EOF'
# Localhost ports reserved on this VPS (edit when you add an app)
# 3000  smebuze-api
# 3001  smebuze-web
EOF
sudo chmod 644 /var/www/PORTS.md
```

---

## What you need before you start

1. A VPS with a **fresh Ubuntu 26.04 LTS** install (2 GB RAM minimum, 4 GB better). Confirm:

   ```bash
   lsb_release -a
   ```

   You want `Ubuntu` and `26.04`. If you are on 24.04 or 22.04, the same commands still work.

2. Root or sudo SSH access.
3. Domain **smebuze.com** at your DNS host (Cloudflare, GoDaddy, Namecheap, Hostinger, etc.).
4. The Git clone URL for this repository.

Do the steps **in order**. Do not skip DNS — SSL will fail without it.

If this VPS **already** has Nginx, Node, Postgres, or other sites, skip only the “install once” parts that would duplicate software (you will see **Skip if already done**). Never re-run destructive commands.

---

# Part A — Ubuntu 26.04 once (shared stack)

These packages are for the **whole server**. Install them once. Later products reuse them.

---

## Step 1 — Point DNS at the VPS

In **smebuze.com** DNS, add **A records** (use your VPS public IPv4):

| Type | Name | Value | TTL |
|------|------|--------|-----|
| A | `@` | `YOUR.VPS.IP` | 300 or Auto |
| A | `www` | `YOUR.VPS.IP` | 300 or Auto |
| A | `api` | `YOUR.VPS.IP` | 300 or Auto |

That gives:

- `smebuze.com`
- `www.smebuze.com`
- `api.smebuze.com`

From your laptop:

```bash
dig +short smebuze.com
dig +short www.smebuze.com
dig +short api.smebuze.com
```

All three must print **this VPS IP**. If not, wait 5–30 minutes. **Do not run Certbot until this works.**

Cloudflare: either DNS-only (grey cloud) for the first Certbot run, or use Cloudflare origin certificates. Orange-cloud + Certbot HTTP challenge often fails.

---

## Step 2 — SSH into the server

```bash
ssh root@YOUR.VPS.IP
```

(If you use a key: `ssh -i ~/.ssh/your_key root@YOUR.VPS.IP`.)

Set timezone:

```bash
timedatectl set-timezone Asia/Kolkata
hostnamectl set-hostname smebuze-vps
```

---

## Step 3 — Create a deploy user (do not run apps as root)

```bash
adduser smebuze
usermod -aG sudo smebuze
```

Set a strong password when asked. Then:

```bash
su - smebuze
```

All later commands assume you are `smebuze` unless the line starts with `sudo`.

This user is only for SMEBUZE files. When you add another product, create another user (or share `smebuze` only if you accept one person owning all `/var/www/*`).

---

## Step 4 — Update Ubuntu and install shared packages

**Skip if already done** (Nginx/Postgres already running for other sites).

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y \
  git curl wget unzip ca-certificates gnupg \
  build-essential python3 \
  nginx \
  certbot python3-certbot-nginx \
  postgresql postgresql-contrib postgresql-client \
  ufw
```

What each is for:

| Package | Why |
|---------|-----|
| git | clone this repo |
| build-essential / python3 | compile `bcrypt` for Node |
| nginx | HTTPS reverse proxy for **all** sites on this VPS |
| certbot | Let’s Encrypt SSL |
| postgresql | one server, **many databases** |
| ufw | firewall |

Confirm versions:

```bash
nginx -v
psql --version
lsb_release -ds
```

Leave the default Nginx site alone until you know nothing else uses it. SMEBUZE never needs `default_server`.

---

## Step 5 — Install Node.js 20 (LTS)

**Skip if** `node -v` already prints `v20` or newer **and** you intend to share that Node with other apps. SMEBUZE needs Node **>= 18**.

```bash
node -v 2>/dev/null || true
```

If missing or older than 18:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v    # v20.x
npm -v
```

If NodeSource fails on a brand-new Ubuntu 26.04 (repo not updated yet), use Node 22 from the same vendor:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

Install PM2 **once** for the whole server (all products share this process manager):

```bash
sudo npm install -g pm2
pm2 -v
```

---

## Step 6 — Firewall (SSH + HTTP + HTTPS only)

**Skip `ufw --force enable` if UFW is already active** with extra rules for other services. Only **add** the three allows.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
```

If UFW is inactive:

```bash
sudo ufw --force enable
sudo ufw status
```

You want `22`, `80`, `443` allowed. Do **not** open `3000`, `3001`, or `5432`. Nginx talks to Node on localhost.

Also open 80/443 in the **cloud panel** (Hostinger, AWS security group, etc.) if that exists in front of UFW.

---

## Step 7 — PostgreSQL: SMEBUZE role and database only

This does **not** recreate the Postgres cluster. It only adds a user and database named `smebuze`. Other products keep their own databases.

```bash
sudo systemctl enable --now postgresql
sudo ss -lntp | grep 5432
```

You want `127.0.0.1:5432` (or `localhost`). If you see `0.0.0.0:5432`, edit Postgres to listen on localhost only — that change affects the whole server, so only do it if no other app needs remote Postgres.

Create the SMEBUZE database (change the password):

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER smebuze WITH PASSWORD 'CHANGE_ME_STRONG_DB_PASSWORD';
CREATE DATABASE smebuze OWNER smebuze;
GRANT ALL PRIVILEGES ON DATABASE smebuze TO smebuze;
\c smebuze
GRANT ALL ON SCHEMA public TO smebuze;
ALTER SCHEMA public OWNER TO smebuze;
\q
```

If `CREATE USER` says the role already exists, **stop**. Do not drop it. Pick another name (`smebuze_app`) and use that in `.env`, or reuse the existing role only if you created it for this product.

List databases (you should see `smebuze` plus `postgres`, `template1`, and any other apps):

```bash
sudo -u postgres psql -c '\l'
```

Test login:

```bash
psql -h 127.0.0.1 -U smebuze -d smebuze -c 'SELECT 1;'
```

Enter the DB password. You should see `1`.

---

# Part B — SMEBUZE application (isolated)

Nothing below writes to `/var/www` except `/var/www/smebuze`. Nginx gets **two new site files**. PM2 gets **two named processes**.

---

## Step 8 — Clone the project

```bash
sudo mkdir -p /var/www/smebuze
sudo chown smebuze:smebuze /var/www/smebuze
cd /var/www/smebuze
git clone -b production https://github.com/deepj2013/smebuze.git .
```

If the repo is **private**, use SSH and a read-only deploy key (Part E) instead of HTTPS:

```bash
git clone -b production git@github.com:deepj2013/smebuze.git .
```

If the repo is private, use a deploy key or HTTPS token.

Confirm you are not sitting in another product’s tree:

```bash
pwd
ls -la
```

Must be `/var/www/smebuze` with this repo’s `package.json`, `apps/`, `docs/`.

---

## Step 9 — Create the API `.env`

```bash
cd /var/www/smebuze
cp .env.example .env
nano .env
```

Generate secrets (run these, then paste into `.env`):

```bash
openssl rand -base64 48
openssl rand -base64 24
```

Put this in `/var/www/smebuze/.env` (this file is **only** for SMEBUZE):

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
LOG_FORMAT=json

# JWT — never use the example value
JWT_SECRET=PASTE_FIRST_OPENSSL_OUTPUT
JWT_EXPIRES_IN=8h

# Database — this product only
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=smebuze
DB_PASSWORD=CHANGE_ME_STRONG_DB_PASSWORD
DB_NAME=smebuze
DB_LOGGING=false

# Browser origins allowed to call the API (comma-separated, no spaces)
CORS_ORIGIN=https://smebuze.com,https://www.smebuze.com

# Public URL of THIS API (webhooks, invoice logos). No trailing slash.
API_PUBLIC_URL=https://api.smebuze.com

# Password-reset, OTP, welcome and invite emails (Hostinger SMTP)
FRONTEND_URL=https://smebuze.com
APP_URL=https://smebuze.com
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=support@smebuze.com
MAIL_PASS="CHANGE_ME_MAILBOX_PASSWORD"
MAIL_FROM="SMEBUZE <support@smebuze.com>"

# Optional payments
# PAYMENT_GATEWAY_ENABLED=false

# Optional WhatsApp (Ice Crest). Leave blank to keep send as stub.
# WHATSAPP_ACCESS_TOKEN=
# WHATSAPP_PHONE_NUMBER_ID=
# WHATSAPP_VERIFY_TOKEN=ice_crest_webhook_2026
# WHATSAPP_DEFAULT_TENANT_SLUG=ice-crest
# WHATSAPP_APP_SECRET=
```

Quote `MAIL_PASS` if it contains `#` or `$`.

Save: `Ctrl+O`, Enter, `Ctrl+X`.

```bash
chmod 600 /var/www/smebuze/.env
ln -sf /var/www/smebuze/.env /var/www/smebuze/apps/api/.env
```

Nest reads `.env` from `apps/api` (PM2 `cwd`). The symlink does not affect other apps.

---

## Step 10 — Install Node dependencies

From the **SMEBUZE repo root** (npm workspaces):

```bash
cd /var/www/smebuze
npm ci
```

If `npm ci` fails (lockfile mismatch):

```bash
npm install
```

This writes `node_modules` only under `/var/www/smebuze`.

---

## Step 11 — Run database migrations

This runs SQL only against `DB_NAME` in `.env` (`smebuze`). It does not touch other databases.

```bash
cd /var/www/smebuze
set -a
source .env
set +a
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
npm run db:migrate
```

You will see `Running 001_...sql` through the latest files, then `Migrations done.`

Index-already-exists messages are OK on a **re-run**. The first run on an empty database should mostly show `CREATE TABLE`.

---

## Step 12 — Optional: seed a first admin

Only on a **new empty** `smebuze` database. Skip if you already have real users. Seeds do not write to other databases.

```bash
cd /var/www/smebuze
set -a && source .env && set +a
npm run seed:demo
```

Default demo logins (change them after first login):

- Super Admin: `superadmin@smebuzz.com` / `Password123` (leave workspace blank)
- Demo tenant: `admin@demo.com` / `Password123` / workspace `demo`

### Platform admin — list and configure tenants

1. Open `https://smebuze.com/login`.
2. Sign in as Super Admin. **Leave the workspace slug empty.**
3. You land on **Admin → Tenants** (`/admin/tenants`).
4. Search a workspace, click **Configure**, then set plan, features, business type, licence, subscription end date, or pause the workspace (`is_active`).
5. API (same JWT): `GET /api/v1/tenants` and `PATCH /api/v1/tenants/:id`. Only `isSuperAdmin` users can call these.

Tenant users log in **with** their workspace slug. Platform admin never needs a slug.

To seed Ice Crest (after migrate — the database must already exist):

```bash
set -a && source .env && set +a
# Optional: ICE_CREST_ADMIN_EMAIL=info@icecrest.in
npm run seed:ice-crest
```

Ice Crest login: workspace slug `ice-crest`, email `info@icecrest.in`. First-time password is `Password123` (only set when the user is created; re-seed does not overwrite it). They can use **Forgot password** — the OTP is sent **to** `info@icecrest.in` **from** `support@smebuze.com`.

Platform admin can later change that email or click **Send reset mail** on Admin → Tenants → Configure.

Do **not** bake seeds into `docker build`. Images should stay empty of tenant data.

---

## Step 13 — Build the API

```bash
cd /var/www/smebuze
npm run api:build
ls -l apps/api/dist/main.js
```

---

## Step 14 — Website env and build

```bash
nano /var/www/smebuze/apps/website/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.smebuze.com
```

```bash
cd /var/www/smebuze
npm run website:build
```

`NEXT_PUBLIC_API_URL` is baked in at **build** time. Changing `.env.local` without rebuilding does nothing.

---

## Step 15 — Run SMEBUZE with PM2 (do not touch other processes)

The repo includes `ecosystem.config.cjs` with process names **`smebuze-api`** and **`smebuze-web`**. Those names are unique so other PM2 apps stay running.

```bash
cd /var/www/smebuze
pm2 start ecosystem.config.cjs
pm2 save
```

First time only, enable start on boot (this is server-wide and **keeps every saved PM2 app**, not only SMEBUZE):

```bash
pm2 startup
```

Run the `sudo` command it prints, then:

```bash
pm2 save
pm2 status
pm2 logs smebuze-api --lines 40
pm2 logs smebuze-web --lines 20
```

You should see: `SMEBUZE API running on http://127.0.0.1:3000/api/v1`

**Never** run `pm2 delete all`, `pm2 kill`, or `pm2 stop all`. Those stop every product on this VPS.

If you need to recreate only SMEBUZE:

```bash
pm2 delete smebuze-api smebuze-web
cd /var/www/smebuze
pm2 start ecosystem.config.cjs
pm2 save
```

Local health:

```bash
curl -sS http://127.0.0.1:3000/api/v1/health
ss -lntp | grep -E '3000|3001'
```

Expect: `{"status":"ok","database":"connected"}` and listeners on `127.0.0.1`.

If health is not `ok`, check `DB_*` in `/var/www/smebuze/.env` and `pm2 restart smebuze-api`.

---

## Step 16 — Nginx for smebuze.com only

Copy **two new files**. Do not replace existing files in `sites-available` that belong to other products.

```bash
cd /var/www/smebuze
sudo cp docs/nginx-api.smebuze.com.conf /etc/nginx/sites-available/api.smebuze.com
sudo cp docs/nginx-smebuze.com.conf /etc/nginx/sites-available/smebuze.com
sudo ln -sf /etc/nginx/sites-available/api.smebuze.com /etc/nginx/sites-enabled/api.smebuze.com
sudo ln -sf /etc/nginx/sites-available/smebuze.com /etc/nginx/sites-enabled/smebuze.com
```

Test, then **reload** (not restart — reload keeps other sites up):

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` fails, **do not reload**. Fix the SMEBUZE files. Other sites keep serving.

Optional: if Ubuntu’s default site is still enabled and you are sure nothing uses the server IP as a website:

```bash
ls /etc/nginx/sites-enabled/
# sudo rm /etc/nginx/sites-enabled/default
# sudo nginx -t && sudo systemctl reload nginx
```

Do not delete other products’ files in that folder.

Test HTTP (Certbot not required yet):

```bash
curl -sS -H 'Host: api.smebuze.com' http://127.0.0.1/api/v1/health
curl -sS http://api.smebuze.com/api/v1/health
```

If the second fails, DNS, UFW, or the cloud firewall is wrong.

---

## Step 17 — Certbot SSL for smebuze.com names only

Let’s Encrypt for **these three names only**. Do not pass `-d` for another product.

```bash
sudo certbot --nginx -d smebuze.com -d www.smebuze.com -d api.smebuze.com
```

When prompted:

1. Email for renewal notices.
2. Agree to the Let’s Encrypt terms.
3. Choose **redirect HTTP → HTTPS** (option 2).

Certbot edits only the Nginx files that match those `server_name`s, then reloads Nginx.

```bash
curl -sS https://api.smebuze.com/api/v1/health
curl -sSI https://smebuze.com | head -n 8
sudo certbot certificates
```

Health must return `{"status":"ok","database":"connected"}`.

Renewal is automatic. Dry-run (safe for other certs too):

```bash
sudo certbot renew --dry-run
```

If Certbot says “Failed to verify”:

- `dig +short smebuze.com` and `dig +short api.smebuze.com` must be this VPS.
- Port 80 open (`sudo ufw status`).
- Both SMEBUZE Nginx sites enabled **before** Certbot.

If only the API hostname is ready:

```bash
sudo certbot --nginx -d api.smebuze.com
sudo certbot --nginx -d smebuze.com -d www.smebuze.com
```

Open **https://smebuze.com/login**. The browser calls **https://api.smebuze.com/api/v1**.

If login fails with CORS, `CORS_ORIGIN` must include `https://smebuze.com` and `https://www.smebuze.com` exactly, then `pm2 restart smebuze-api`.

---

## Step 18 — Smoke test

From your laptop:

```bash
curl -sS https://api.smebuze.com/api/v1/health

curl -sS -X POST https://api.smebuze.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"Password123","tenantSlug":"demo"}'
```

You should get `access_token` (after demo seed). Then open https://smebuze.com/login.

WhatsApp webhook (when Meta is configured):

`https://api.smebuze.com/api/v1/integrations/whatsapp/webhook`

---

# Part C — Operate SMEBUZE without touching other apps

---

## Step 19 — Every time you ship new SMEBUZE code

**Preferred:** merge `main` into `production` and push (Part E). GitHub Actions SSHs to the VPS and runs `scripts/deploy.sh`.

From this laptop (after `git push origin main`):

```bash
bash scripts/promote-to-production.sh
```

**Manual** on the VPS (same script):

```bash
bash /var/www/smebuze/scripts/deploy.sh
```

The server tracks **`production` only**. Restart **only** `smebuze-api` / `smebuze-web`. Do not restart other PM2 names.

If you added a **new** Nginx file for SMEBUZE (rare):

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 20 — Backups (this database only)

Daily dump of **smebuze**, not other databases:

```bash
mkdir -p /var/www/smebuze/backups
crontab -e
```

Add (use the real DB password):

```
0 2 * * * PGPASSWORD='CHANGE_ME_STRONG_DB_PASSWORD' pg_dump -h 127.0.0.1 -U smebuze -d smebuze -Fc -f /var/www/smebuze/backups/smebuze_$(date +\%Y\%m\%d).dump
```

Restore (stops **only** the SMEBUZE API):

```bash
pm2 stop smebuze-api
pg_restore -h 127.0.0.1 -U smebuze -d smebuze --clean --if-exists /var/www/smebuze/backups/smebuze_YYYYMMDD.dump
pm2 start smebuze-api
```

`--clean` drops objects **inside** database `smebuze` only.

Copy dumps off the server. Do not keep the only backup on this VPS.

---

## Useful commands (scoped)

```bash
pm2 status
pm2 logs smebuze-api
pm2 logs smebuze-web
pm2 restart smebuze-api
pm2 restart smebuze-web
sudo systemctl status nginx
sudo systemctl status postgresql
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
sudo ls /etc/nginx/sites-enabled/
```

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Certbot: “Failed to verify” | DNS A record not this VPS; port 80 closed; Cloudflare orange cloud |
| Health works on server, not from laptop | UFW / cloud firewall must allow 80 and 443 |
| Health `database` not connected | `/var/www/smebuze/.env` `DB_*`; symlink into `apps/api`; `pm2 restart smebuze-api` |
| Website login CORS error | `CORS_ORIGIN` must match `https://smebuze.com` exactly; restart API |
| Website still hits localhost:3000 | Rebuild website after `NEXT_PUBLIC_API_URL`; restart `smebuze-web` |
| 502 Bad Gateway | `pm2 status` — that product’s process down; `curl 127.0.0.1:3000/api/v1/health` |
| 413 on logo upload | `client_max_body_size` in **this** Nginx site file |
| Migrations fail: `psql: command not found` | `sudo apt-get install -y postgresql-client` |
| `bcrypt` build error | `sudo apt-get install -y build-essential python3` then `npm ci` again |
| Other site went down after SMEBUZE deploy | You used `pm2 delete all` or overwrote `nginx.conf`. Restore from backup; this guide never does that. |
| Wrong site on smebuze.com | Another Nginx server has `default_server` or overlapping `server_name`. Check `sudo nginx -T \| grep server_name` |

---

## Alternative: Docker for SMEBUZE API + Postgres only

Prefer **Part B (native Postgres + PM2)** on a shared VPS. Docker Compose below binds host **3000** and Postgres **5432**, which **collides** if another container or native Postgres already uses those ports.

If you still want Docker for SMEBUZE:

1. Change published ports in `docker-compose.production.yml` if 3000/5432 are taken.
2. Point SMEBUZE Nginx `proxy_pass` at the new API port.
3. Do not run native `smebuze-api` on the same port.

```bash
cd /var/www/smebuze
cp .env.example .env
# set JWT_SECRET, DB_PASSWORD, CORS_ORIGIN, API_PUBLIC_URL, MAIL_*
docker compose -f docker-compose.production.yml up -d
```

Inside the API container the process must listen on all interfaces:

`HOST=0.0.0.0` (already set in `docker-compose.production.yml`).

Host migrations (native `psql` against published 5432):

```bash
sudo apt-get install -y postgresql-client
export DB_HOST=127.0.0.1 DB_PORT=5432 DB_USER=postgres DB_PASSWORD=... DB_NAME=smebuze
npm run db:migrate
```

Nginx for `api.smebuze.com` is the same (`proxy_pass http://127.0.0.1:3000` or your remapped port).

---

## Production rules (do not skip)

- `NODE_ENV=production` so TypeORM **does not** auto-sync the schema. Always migrate with `npm run db:migrate`.
- Strong `JWT_SECRET` and `DB_PASSWORD`. Never commit `.env`.
- `CORS_ORIGIN` is **not** `*` in production.
- Node binds `127.0.0.1`; only 80/443 are public.
- After first login, change seed passwords.
- Never `pm2 delete all`. Never drop the Postgres cluster to “reset SMEBUZE”.

---

## SMEBUZE checklist

- [ ] DNS: `smebuze.com`, `www.smebuze.com`, `api.smebuze.com` → this VPS IP
- [ ] Ubuntu 26.04 packages + Node 20+ + PM2 + Nginx + Certbot + PostgreSQL (once per server)
- [ ] Firewall: 22, 80, 443 (do not reset UFW if other apps exist)
- [ ] Database and role `smebuze` only (other DBs untouched)
- [ ] Repo only at `/var/www/smebuze`
- [ ] `/var/www/PORTS.md` lists 3000 / 3001
- [ ] `.env` with JWT, DB, `HOST=127.0.0.1`, `CORS_ORIGIN`, `API_PUBLIC_URL=https://api.smebuze.com`
- [ ] `npm ci` + `npm run db:migrate` + `npm run api:build` + `npm run website:build`
- [ ] PM2 `smebuze-api` and `smebuze-web` only (other PM2 apps still listed)
- [ ] Nginx files `smebuze.com` and `api.smebuze.com` added; `nginx -t` then reload
- [ ] Certbot: `-d smebuze.com -d www.smebuze.com -d api.smebuze.com` only
- [ ] `curl https://api.smebuze.com/api/v1/health` and `https://smebuze.com`
- [ ] Daily `pg_dump` of database `smebuze` only
- [ ] GitHub secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` + VPS deploy key (Part E)
- [ ] Push to `production` deploys; `pm2 status` still shows other apps

---

# Part E — Auto-deploy from branch `production`

Work on **`main`**. When a release should go live, merge `main` into **`production`** and push. GitHub Actions then SSHs to the VPS and runs `scripts/deploy.sh`.

That script:

1. `git fetch` + `git reset --hard origin/production` in `/var/www/smebuze` only
2. `npm ci`, migrations on database **`smebuze` only**
3. Builds the Nest API and Next.js website
4. `pm2 startOrReload` for **`smebuze-api`** and **`smebuze-web` only**
5. Does **not** change Nginx, Certbot, UFW, or other PM2 processes
6. Does **not** run seeds and does **not** enable a payment gateway

Do this **after** Part B so `.env` and PM2 already exist. Add GitHub secrets **before** the first push to `production`, or the Action will fail (you can re-run it from the Actions tab).

### E1 — VPS can pull from GitHub (read-only)

On the VPS as user `smebuze`:

```bash
ssh-keygen -t ed25519 -C "smebuze-vps-github" -f ~/.ssh/smebuze_github -N ""
cat ~/.ssh/smebuze_github.pub
```

GitHub → repo **smebuze** → Settings → Deploy keys → Add key → paste the **public** key → **Allow write access: off**.

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/smebuze_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/smebuze_github
ssh -T git@github.com
```

If the clone was HTTPS, switch it:

```bash
cd /var/www/smebuze
git remote set-url origin git@github.com:deepj2013/smebuze.git
git fetch origin production
git checkout production
git reset --hard origin/production
```

### E2 — GitHub Actions can SSH to the VPS

On the VPS:

```bash
ssh-keygen -t ed25519 -C "github-actions-smebuze" -f ~/.ssh/github_actions_smebuze -N ""
cat ~/.ssh/github_actions_smebuze.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_smebuze
```

The last command prints the **private** key. Copy it once into GitHub.

GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|--------|
| `VPS_HOST` | VPS public IP (or hostname) |
| `VPS_USER` | `smebuze` |
| `VPS_SSH_KEY` | Full private key from `~/.ssh/github_actions_smebuze` (including `BEGIN` / `END` lines) |

Then delete the private key file from the VPS (the public half stays in `authorized_keys`):

```bash
rm -f ~/.ssh/github_actions_smebuze ~/.ssh/github_actions_smebuze.pub
```

Optional lock so this key can **only** run deploy (paste the **public** key line from `authorized_keys` after editing):

```bash
nano ~/.ssh/authorized_keys
```

Put this **in front of** that key on the same line:

```
command="/var/www/smebuze/scripts/deploy.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty
```

If you set `command=`, the GitHub Action still works because it runs that script. Skip this lock until a normal Action run succeeds.

### E3 — How you ship from this laptop

```bash
git checkout main
git add -A
git commit -m "Your message"
git push origin main
bash scripts/promote-to-production.sh
```

Watch: GitHub → Actions → **Deploy production**. On the VPS: `pm2 logs smebuze-api --lines 30`.

`workflow_dispatch` lets you re-run a deploy without a new commit (Actions → Deploy production → Run workflow).

---

# Part D — Deploy another web app on this same VPS

Use this after SMEBUZE is stable. The shared stack (Ubuntu, Nginx, Certbot, Postgres, Node, PM2, UFW) is **already installed**. You only add an isolated product.

Replace placeholders:

| Placeholder | Example |
|-------------|---------|
| `APP` | `invoicer` (short id, no spaces) |
| `DOMAIN` | `otherapp.com` |
| `API_HOST` | `api.otherapp.com` |
| `API_PORT` | `3002` |
| `WEB_PORT` | `3003` |
| `DB_NAME` / `DB_USER` | `invoicer` |

### D1 — Reserve ports

```bash
ss -lntp | grep -E '300[0-9]'
sudo nano /var/www/PORTS.md
```

Add two free localhost ports. Do not reuse 3000 or 3001.

### D2 — DNS

A records for `DOMAIN`, `www.DOMAIN`, and `API_HOST` → **this same VPS IP**. Wait until `dig +short` is correct.

### D3 — Folder and clone

```bash
sudo mkdir -p /var/www/APP
sudo chown "$USER":"$USER" /var/www/APP
cd /var/www/APP
git clone YOUR_OTHER_REPO_URL .
```

Do not clone into `/var/www/smebuze`.

### D4 — Postgres (new database only)

```bash
sudo -u postgres psql
```

```sql
CREATE USER APP WITH PASSWORD 'OTHER_STRONG_PASSWORD';
CREATE DATABASE APP OWNER APP;
GRANT ALL PRIVILEGES ON DATABASE APP TO APP;
\c APP
GRANT ALL ON SCHEMA public TO APP;
ALTER SCHEMA public OWNER TO APP;
\q
```

Do not `DROP DATABASE smebuze`. Do not change the `smebuze` role password unless you also update `/var/www/smebuze/.env` and restart `smebuze-api`.

### D5 — App env, install, migrate, build

Follow **that** product’s README. Typical Node app:

```bash
cd /var/www/APP
cp .env.example .env
nano .env
# PORT=API_PORT
# HOST=127.0.0.1
# DB_NAME=APP
# CORS_ORIGIN=https://DOMAIN,https://www.DOMAIN
# API_PUBLIC_URL=https://API_HOST

npm ci
# run that app's migrations against DB APP only
npm run build
```

Website (if Next.js):

```bash
echo 'NEXT_PUBLIC_API_URL=https://API_HOST' > /var/www/APP/apps/website/.env.local
npm run website:build   # or that repo's script
```

### D6 — PM2 with unique names

Create `/var/www/APP/ecosystem.config.cjs` with names **`APP-api`** and **`APP-web`** (not `smebuze-*`), `cwd` under `/var/www/APP`, ports `API_PORT` / `WEB_PORT`, `HOST` `127.0.0.1`.

```bash
cd /var/www/APP
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

You must still see `smebuze-api` and `smebuze-web` **running**. If they disappeared, you used a destructive PM2 command — start SMEBUZE again from `/var/www/smebuze` with `pm2 start ecosystem.config.cjs` (that file only starts SMEBUZE processes).

### D7 — Nginx site files for the new hostnames only

```bash
sudo nano /etc/nginx/sites-available/DOMAIN
sudo nano /etc/nginx/sites-available/API_HOST
```

Minimal HTTP (Certbot will add SSL):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN www.DOMAIN;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name API_HOST;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Do **not** use `default_server`. Do **not** copy-paste `server_name smebuze.com` into this file.

```bash
sudo ln -sf /etc/nginx/sites-available/DOMAIN /etc/nginx/sites-enabled/DOMAIN
sudo ln -sf /etc/nginx/sites-available/API_HOST /etc/nginx/sites-enabled/API_HOST
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` fails, SMEBUZE and every other site stay on the old config until you fix the new files.

### D8 — SSL for the new names only

```bash
sudo certbot --nginx -d DOMAIN -d www.DOMAIN -d API_HOST
```

Do not add `smebuze.com` to this command (and do not add `DOMAIN` to the SMEBUZE certbot command).

### D9 — Updates for the other app

```bash
cd /var/www/APP
git pull
npm ci
# migrate + build as that project requires
pm2 restart APP-api
pm2 restart APP-web
```

Do not `git pull` inside `/var/www/smebuze` unless you intend to update SMEBUZE.

### D10 — Backup for the other app

Separate cron: `pg_dump … -d APP` into `/var/www/APP/backups/`. Do not restore into `smebuze`.

---

### Same VPS, static site (no Node)

If the next product is only HTML/CSS:

1. Put files in `/var/www/APP/public`.
2. Nginx `root /var/www/APP/public;` and `server_name DOMAIN;` — still a **new** site file.
3. No PM2, no extra Postgres unless you need it.
4. `sudo certbot --nginx -d DOMAIN`.

SMEBUZE keeps using 3000/3001 unchanged.

---

### Same VPS, PHP (WordPress, Laravel)

1. `sudo apt-get install -y php-fpm php-pgsql` (or php-mysql) **without** removing Node/Nginx.
2. New database, new `/var/www/APP`, new Nginx `server` with `fastcgi_pass` to php-fpm.
3. New Certbot `-d` list.
4. Do not change SMEBUZE’s `proxy_pass` or PM2.

---

## What one product must never do to another

| Dangerous | Safe instead |
|-----------|----------------|
| `pm2 delete all` / `pm2 kill` | `pm2 restart smebuze-api` or `pm2 delete smebuze-api smebuze-web` |
| `sudo rm /etc/nginx/nginx.conf` then replace | Add a file under `sites-available` |
| `sudo apt-get remove nginx postgresql` | Leave shared services installed |
| `DROP DATABASE smebuze` while installing app B | `CREATE DATABASE app_b` |
| `ufw reset` | `ufw allow` extra ports if you truly need them |
| Certbot `-d smebuze.com -d otherapp.com` | One certbot command per product |
| Bind Node to `0.0.0.0:3000` | `127.0.0.1` + Nginx |
| Deploy into `/var/www/smebuze` | `/var/www/APP` |
