# SMEBUZE Deployment on Hostinger VPS (Server With Existing Apps)

Step‑by‑step guide to deploy **SMEBUZE** on a Hostinger VPS that **already has Docker and other apps running** (e.g. a MERN stack with MongoDB).

Goals:
- **Do not break existing apps** (reuse Docker, avoid port clashes, don’t re‑install things blindly).
- Run:
  - **PostgreSQL** in Docker
  - **Node API** (NestJS) in Docker
  - **Next.js frontend** on host via PM2 (or optional Docker)
  - **Subdomain**: `smebuzz.ameerait.com` with SSL (Certbot)
  - **First-time seed**: Star ICE demo tenant only

---

## 1. Prerequisites (safe checks – do not break existing apps)

- Ubuntu 22.04 (or similar). SSH access.
- You already have **Docker** and maybe other containers (MongoDB, etc.).
- Domain `ameerait.com` (or similar) for `smebuzz.ameerait.com`.

### 1.1 DNS

- Add an **A record**: `smebuzz.ameerait.com` → your VPS public IP.

### 1.2 Check/install tools (only if missing)

Each block **checks first**, then installs only if needed:

```bash
# Docker (skip install if already present)
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "Docker installed. Log out and back in for docker group to apply."
else
  echo "Docker already installed – skipping."
fi

# Docker Compose v2 (plugin)
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
else
  echo "Docker Compose v2 already installed – skipping."
fi

# Node 20+ (for migrations/seed and PM2)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node is already installed – skipping."
fi

# Nginx
if ! dpkg -s nginx >/dev/null 2>&1; then
  sudo apt-get install -y nginx
else
  echo "Nginx already installed – skipping."
fi

# Certbot (for SSL)
if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get install -y certbot python3-certbot-nginx
else
  echo "Certbot already installed – skipping."
fi
```

### 1.3 Verify ports are free for SMEBUZE

SMEBUZE uses:
- **PostgreSQL**: `127.0.0.1:5432` (local only)
- **API**: `3000`
- **Frontend**: `3001`

Check if any existing process is using these ports:

```bash
sudo lsof -i:3000 -i:3001 -i:5432 || echo "No process on 3000/3001/5432"
```

- If your existing app uses 3000 or 3001, we’ll adjust SMEBUZE ports in `docker-compose.production.yml` / PM2 and Nginx.
- If you already run Postgres on 5432, either keep it (and point SMEBUZE to it) or change SMEBUZE Postgres port in `docker-compose.production.yml` and DB env.

---

## 2. Directory and Repo on VPS

Use a dedicated directory so it doesn’t conflict with your existing app.

```bash
# Example: deploy in /var/www/smebuze (or /home/youruser/smebuze)
sudo mkdir -p /var/www/smebuze
sudo chown $USER:$USER /var/www/smebuze
cd /var/www/smebuze
```

Clone the repo (or upload files):

```bash
git clone <your-smebuzz-repo-url> .
# Or: upload via rsync/scp from your machine
```

---

## 3. Environment Files

### 3.1 API (Docker)

Create `/var/www/smebuze/.env` in the **project root** (used by Docker Compose). You can copy from the example:

```bash
cp .env.example .env
nano .env
```

Then set:

```env
# .env (project root – used by docker-compose)
JWT_SECRET=your-very-long-random-secret-change-this
DB_PASSWORD=your-secure-postgres-password
```

Use a strong `JWT_SECRET` and `DB_PASSWORD` (e.g. `openssl rand -base64 32`).

### 3.2 Frontend (for build and PM2)

Create `apps/website/.env.local` (or copy from `apps/website/.env.example`):

```env
# apps/website/.env.local
NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com
```

After SSL is in place, the frontend will call the API at `https://smebuzz.ameerait.com` (Nginx will proxy `/api` to the API container).

---

## 4. Docker: Database + API

We run only **PostgreSQL** and **API** in Docker. Postgres is bound to `127.0.0.1` so only the host (and API container) can connect.

From project root:

```bash
cd /var/www/smebuze
docker compose -f docker-compose.production.yml up -d
```

Wait for Postgres to be healthy, then check:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs api
```

---

## 5. Run Migrations (first time)

Migrations run on the **host** using the same DB credentials as Docker. Install deps and run:

```bash
cd /var/www/smebuze
npm install
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your-secure-postgres-password
export DB_NAME=smebuze
npm run db:migrate
```

If `db:migrate` expects `psql` in PATH and it’s missing:

```bash
sudo apt-get install -y postgresql-client
```

---

## 6. Seed Star ICE (first time only)

Run the Star ICE tenant seed once, with the same env as above:

```bash
cd /var/www/smebuze
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your-secure-postgres-password
export DB_NAME=smebuze
node scripts/seed-tenant-star-ice.js
```

You should see success and login instructions:

- **Tenant slug:** `star-ice`
- **Users:** `admin@starice.sb`, `sales@starice.sb`, `delivery@starice.sb`, `viewer@starice.sb`
- **Password:** `Password123`

---

## 7. Frontend: Build and Run

Build and run the Next.js app on the host (so it can share the server with your other project). Use PM2 so it restarts on reboot.

```bash
cd /var/www/smebuze
npm install
cd apps/website
npm run build
sudo npm install -g pm2
pm2 start npm --name "smebuzz-web" -- start
pm2 save
pm2 startup
```

The site will listen on port **3001** by default (`next start -p 3001`). We’ll put Nginx in front of it.

---

## 8. Nginx: Reverse Proxy (before SSL)

Create a server block for `smebuzz.ameerait.com`. You can copy the reference config from the repo:

```bash
sudo cp /var/www/smebuze/docs/nginx-smebuzz.ameerait.com.conf /etc/nginx/sites-available/smebuzz.ameerait.com
```

Or create it manually:

```bash
sudo nano /etc/nginx/sites-available/smebuzz.ameerait.com
```

Paste (replace `smebuzz.ameerait.com` if you use another name):

```nginx
server {
    listen 80;
    server_name smebuzz.ameerait.com;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
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

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/smebuzz.ameerait.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Ensure ports **80** and **443** are open in the VPS firewall.

---

## 9. SSL with Certbot (subdomain)

Get a certificate for `smebuzz.ameerait.com`:

```bash
sudo certbot --nginx -d smebuzz.ameerait.com
```

Follow prompts (email, agree to terms). Certbot will adjust the Nginx config for HTTPS and redirect HTTP to HTTPS.

Renewal (optional, usually automatic):

```bash
sudo certbot renew --dry-run
```

---

## 10. After SSL: Fix API URL (no mixed content)

Your frontend is built with `NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com`. All API calls go to the same origin, so no mixed content. If you had built with `http://` before, rebuild and restart:

```bash
cd /var/www/smebuze/apps/website
# Ensure .env.local has NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com
npm run build
pm2 restart smebuzz-web
```

---

## 11. Summary Checklist

| Step | What |
|------|------|
| 1 | DNS A record: `smebuzz.ameerait.com` → VPS IP |
| 2 | Install Docker, Node, Nginx, Certbot on VPS |
| 3 | Clone repo to e.g. `/var/www/smebuze` |
| 4 | Create `.env` (JWT_SECRET, DB_PASSWORD) and `apps/website/.env.local` (NEXT_PUBLIC_API_URL) |
| 5 | `docker compose -f docker-compose.production.yml up -d` |
| 6 | Run migrations: `npm run db:migrate` with DB_* env |
| 7 | Seed once: `node scripts/seed-tenant-star-ice.js` |
| 8 | Build and run frontend: `cd apps/website && npm run build && pm2 start npm --name smebuzz-web -- start` |
| 9 | Nginx config for `smebuzz.ameerait.com` (proxy /api → 3000, / → 3001) |
| 10 | `sudo certbot --nginx -d smebuzz.ameerait.com` |

**Login:** https://smebuzz.ameerait.com → tenant `star-ice`, user `admin@starice.sb`, password `Password123`.

---

## 12. Optional: Run Frontend in Docker

If you prefer the frontend in Docker instead of PM2:

```bash
cd /var/www/smebuze
docker build --build-arg NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com -t smebuzz-web -f apps/website/Dockerfile apps/website
docker run -d --name smebuzz-web -p 3001:3001 --restart unless-stopped smebuzz-web
```

Then Nginx already proxies `/` to `127.0.0.1:3001`. No need to change the Nginx config.

---

## 13. Ports Used (avoid clash with existing MERN)

| Service   | Port (host) | Notes                    |
|----------|-------------|--------------------------|
| PostgreSQL | 127.0.0.1:5432 | Local only              |
| API      | 3000        | Nginx proxies /api here  |
| Frontend | 3001        | Nginx proxies / here     |

If your MERN app uses 3000 or 3001, change the API or website port in docker-compose and in the Nginx config.

---

## 14. Troubleshooting

- **502 Bad Gateway:** Ensure API and frontend are running: `docker compose -f docker-compose.production.yml ps` and `pm2 list`.
- **DB connection refused (migrations/seed):** Ensure `DB_HOST=127.0.0.1` and Postgres container is up; check password matches `.env` and `docker-compose.production.yml`.
- **CORS / API not found:** Frontend must use `NEXT_PUBLIC_API_URL=https://smebuzz.ameerait.com` (same origin). Rebuild after changing.
- **Certbot:** Ensure `server_name smebuzz.ameerait.com` and port 80 is open and Nginx is running before running certbot.
