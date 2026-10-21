# Auto-deploy (branch `production`)

Push to **`production`** → GitHub Actions SSHs to the VPS → `scripts/deploy.sh` runs **only the parts that changed**.

| What you changed | What the VPS runs |
|------------------|-------------------|
| `apps/website/**` | `website:build` + restart `smebuze-web` |
| `apps/api/**` | `api:build` + restart `smebuze-api` |
| `packages/db-migrations/**` | `db:migrate` + restart `smebuze-api` |
| `package.json` / `package-lock.json` | `npm ci` (then rebuild whatever else changed) |
| Frontend + API + migrations | all of the above |
| `deploy/nginx/**` | copy site files, `nginx -t`, reload nginx |
| README / other docs-only | skip builds; health check |

### Database safety (live tenants)

- Migrations are **additive only** (`CREATE … IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`). No `DROP TABLE` / bulk deletes.
- New columns that live tenants do not use stay **NULL** (e.g. `tenants.referred_by_partner_id`, `users.platform_role`).
- Applied files are tracked in `_schema_migrations` so re-deploys skip what already ran.
- TypeORM `synchronize` is **off** unless `TYPEORM_SYNC=true` (never set that on production).
- Demo seeds (`scripts/seed-on-vps.sh`) only touch `demo` / `demo-*` / `pos-*` and platform demo logins — **not** your 3 live customer tenants. Existing passwords are not overwritten unless `SEED_RESET_PASSWORDS=1`.

Does **not** touch other PM2 apps or other databases.

Logs (on the VPS):

- GitHub → **Actions** → **Deploy production** (live stdout)
- `/var/www/smebuze/logs/deploy.log` (all runs)
- `/var/www/smebuze/logs/deploy-YYYYMMDD-HHMMSS.log` (one file per run)

---

## One-time setup (after the first manual install)

### 1. GitHub secrets

Repo → **Settings** → **Environments** → **smebuze** → **Environment secrets**:

| Secret | Value |
|--------|--------|
| `VPS_HOST` | VPS IP |
| `VPS_USER` | `root` or `smebuze` (the user you SSH as) |
| `VPS_SSH_KEY` | **Private** key that can SSH as that user (see below) |

The deploy job uses GitHub environment **`smebuze`**. Secrets on that environment are used; leave **Required reviewers** off so deploys are not stuck waiting.

Create the key on your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-smebuze" -f ~/.ssh/smebuze_github_actions -N ""
ssh-copy-id -i ~/.ssh/smebuze_github_actions.pub USER@VPS_IP
ssh -i ~/.ssh/smebuze_github_actions USER@VPS_IP
```

Paste `cat ~/.ssh/smebuze_github_actions` into `VPS_SSH_KEY` (BEGIN/END lines included).

### 2. VPS can `git fetch` from GitHub

On the VPS:

```bash
ssh-keygen -t ed25519 -C "smebuze-vps-github" -f ~/.ssh/smebuze_github -N ""
cat ~/.ssh/smebuze_github.pub
```

GitHub → repo → **Settings** → **Deploy keys** → Add (read-only). Then:

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/smebuze_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
cd /var/www/smebuze
git remote set-url origin git@github.com:deepj2013/smebuze.git
ssh -T git@github.com
```

### 3. Load the new deploy script on the VPS (once)

```bash
cd /var/www/smebuze
git fetch origin production
git checkout production
git reset --hard origin/production
bash scripts/deploy.sh
```

That writes `.deploy-revision` so later pushes only run what changed. Watch:

```bash
tail -f /var/www/smebuze/logs/deploy.log
```

If `smebuze` cannot `sudo` for nginx without a password, either add a sudoers line for those two `cp`/`nginx` commands or leave nginx as a manual step. App/DB deploys still work.

---

## Every time you ship

On your laptop:

```bash
git checkout main
git add -A && git commit -m "Your message"
git push origin main
bash scripts/promote-to-production.sh
```

Then:

1. GitHub → **Actions** → **Deploy production** — wait for green.
2. Open the job log: you will see `plan: npm_ci=… migrate=… api=… website=…` and `RUN` / `SKIP` lines.
3. On the VPS: `tail -80 /var/www/smebuze/logs/deploy.log`

Rebuild everything without a code change: Actions → **Deploy production** → **Run workflow** → tick **force_full**.

If deploy failed on **EACCES** / root-owned `dist`, the workflow now runs **`chown` as root** before `deploy.sh`. After the first green deploy, `.deploy-revision` updates — only **new** commits rebuild; code already on disk (e.g. mall) gets built when `website=1` in that run.

---

## If Actions fails

| Log | Meaning |
|-----|---------|
| `ssh: handshake` / Permission denied | `VPS_SSH_KEY` / `authorized_keys` / `VPS_USER` |
| `Could not read from remote repository` | VPS deploy key missing |
| `missing .env` | `.env` was deleted on the server |
| `nginx -t` failed | nginx skipped after fail — fix the conf, do not reload |
| Health not `connected` | `DB_*` in `/var/www/smebuze/.env`, then `pm2 logs smebuze-api` |
| `EACCES` on `apps/api/dist` during deploy | Builds were run as **root**; deploy runs as **smebuze**. Fix ownership (below). |
| `pm2 list` empty as root but site worked before | PM2 for production runs as **smebuze**, not root — use `sudo -u smebuze pm2 list`. |
| `smebuze-web` **errored**, ↺ 30+ | Usually **no website build** (deploy failed) or missing `.next`. Re-run deploy after fixing permissions. |

### PM2: use user `smebuze` (not root)

GitHub Actions runs `deploy.sh` as **`smebuze`**. That user’s PM2 owns the live apps.

```bash
# As root — one-time fix after manual root pm2/build:
chown -R smebuze:smebuze /var/www/smebuze/apps/api/dist /var/www/smebuze/apps/website/.next
pm2 kill   # stops root’s empty/crash-loop PM2 only

sudo -u smebuze -H bash -lc 'cd /var/www/smebuze && pm2 list'
sudo -u smebuze -H bash -lc 'cd /var/www/smebuze && FORCE_FULL=1 bash scripts/deploy.sh'
sudo -u smebuze -H pm2 save
```

Optional boot hook (as root): `sudo -u smebuze pm2 startup` and follow the printed command.

---

## Today’s SQL migrations (047–052)

Deploy runs `npm run db:migrate` when `packages/db-migrations/**` changes. Each file is recorded in `_schema_migrations` on the VPS.

To confirm on the server (SSH):

```bash
grep -E '047_|048_|049_|050_|051_|052_' /var/www/smebuze/logs/deploy.log | tail -20
# or in psql:
SELECT name FROM _schema_migrations WHERE name LIKE '04%' OR name LIKE '05%' ORDER BY name;
```

If deploy logs show `applied=0, skipped=52`, migrations **047–052 are already applied** (skipped because they ran on an earlier deploy).

---

Full demo slug/email list and mall URLs: **`deploy/DEMO_LOGINS.md`**.

## Invoice Lite demo login

After seeding on the VPS:

```bash
cd /var/www/smebuze && npm run seed:invoice-lite
# or full demo bundle:
bash scripts/seed-on-vps.sh
```

| Field | Value |
|-------|--------|
| Workspace slug | `demo-invoice` |
| Email | `admin@demo-invoice.demo` |
| Password | `Invoice@123` |

After login: **Organization → Printers** and **Invoice theme** (GST / Tally / Busy / Marg). Sidebar is trimmed to customers, products, and invoices only.

---

## Database: pgAdmin on your laptop + backups

### View production data in local pgAdmin (SSH tunnel — safe)

Never open Postgres port `5432` on the public internet. Tunnel through SSH:

```bash
# On your Mac — keep this terminal open
ssh -N -L 5433:127.0.0.1:5432 USER@VPS_IP
```

In pgAdmin → Register → Server:

| Field | Value |
|-------|--------|
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | from VPS `.env` → `DB_NAME` (usually `smebuze`) |
| Username | `DB_USER` |
| Password | `DB_PASSWORD` |

Read `DB_*` from the VPS: `grep '^DB_' /var/www/smebuze/.env` (SSH session only).

### Nightly backup cron (recommended)

After deploy pulls the new scripts:

```bash
ssh USER@VPS_IP
sudo -u smebuze bash /var/www/smebuze/scripts/install-db-backup-cron.sh
```

Dumps go to `/var/www/smebuze/backups/db/` (`smebuze-YYYYMMDDTHHMMSSZ.dump`), kept 14 days.

Manual dump: `sudo -u smebuze APP_DIR=/var/www/smebuze bash /var/www/smebuze/scripts/backup-db.sh`

### Universal admin button

Super-admin → **Admin → DB backups** → **Backup database now** / **Download**.  
Same files as the cron folder. Only `isSuperAdmin` can call the API.

### Optional: copy dumps to Google Drive

On the VPS install [rclone](https://rclone.org/), `rclone config` a Google Drive remote, then:

```bash
# append to smebuze crontab (example remote name "gdrive")
30 2 * * * rclone copy /var/www/smebuze/backups/db gdrive:smebuze-db-backups --max-age 14d
```

Restore a dump into a **local throwaway** DB only:

```bash
pg_restore --clean --if-exists -d smebuze_restore ./smebuze-….dump
```
