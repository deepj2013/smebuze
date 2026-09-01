#!/usr/bin/env bash
# Run on the Hostinger VPS only. Updates SMEBUZE from branch production and
# reloads smebuze-api / smebuze-web. Does not touch other PM2 apps, Nginx, or databases.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/smebuze}"
BRANCH="${DEPLOY_BRANCH:-production}"

export PATH="/usr/local/bin:/usr/bin:${PATH}"
if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
fi

cd "${APP_DIR}"

if [[ ! -d .git ]]; then
  echo "ERROR: ${APP_DIR} is not a git clone. Clone branch production to /var/www/smebuze first (see README.md)." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: missing ${APP_DIR}/.env — copy from .env.example on the server, never from git." >&2
  exit 1
fi

echo "==> fetching origin/${BRANCH}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "==> npm ci"
npm ci

set -a
# shellcheck disable=SC1091
source .env
set +a

DATABASE_URL="$(node -e "
  const e = process.env;
  const user = encodeURIComponent(e.DB_USER || 'smebuze');
  const pass = encodeURIComponent(e.DB_PASSWORD || '');
  const host = e.DB_HOST || '127.0.0.1';
  const port = e.DB_PORT || '5432';
  const name = e.DB_NAME || 'smebuze';
  process.stdout.write('postgres://' + user + ':' + pass + '@' + host + ':' + port + '/' + name);
")"
export DATABASE_URL

echo "==> migrations (database ${DB_NAME:-smebuze} only)"
npm run db:migrate

echo "==> build API"
npm run api:build
ln -sfn "${APP_DIR}/.env" "${APP_DIR}/apps/api/.env"

if [[ ! -f apps/website/.env.local ]]; then
  echo "NEXT_PUBLIC_API_URL=${API_PUBLIC_URL:-https://api.smebuze.com}" > apps/website/.env.local
fi

echo "==> build website"
npm run website:build

echo "==> PM2 smebuze-api + smebuze-web only"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload "${APP_DIR}/ecosystem.config.cjs" --update-env
  pm2 save
else
  echo "ERROR: pm2 not found on PATH" >&2
  exit 1
fi

echo "==> health"
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-3000}/api/v1/health"
echo
echo "==> deploy ok $(git rev-parse --short HEAD) ${BRANCH}"
