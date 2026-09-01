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

Does **not** touch other PM2 apps or other databases.

Logs (on the VPS):

- GitHub → **Actions** → **Deploy production** (live stdout)
- `/var/www/smebuze/logs/deploy.log` (all runs)
- `/var/www/smebuze/logs/deploy-YYYYMMDD-HHMMSS.log` (one file per run)

---

## One-time setup (after the first manual install)

### 1. GitHub secrets

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Value |
|--------|--------|
| `VPS_HOST` | VPS IP |
| `VPS_USER` | `root` or `smebuze` (the user you SSH as) |
| `VPS_SSH_KEY` | **Private** key that can SSH as that user (see below) |

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

---

## If Actions fails

| Log | Meaning |
|-----|---------|
| `ssh: handshake` / Permission denied | `VPS_SSH_KEY` / `authorized_keys` / `VPS_USER` |
| `Could not read from remote repository` | VPS deploy key missing |
| `missing .env` | `.env` was deleted on the server |
| `nginx -t` failed | nginx skipped after fail — fix the conf, do not reload |
| Health not `connected` | `DB_*` in `/var/www/smebuze/.env`, then `pm2 logs smebuze-api` |
