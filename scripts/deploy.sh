#!/usr/bin/env bash
# VPS only. Pulls branch production, then runs only what that commit changed:
#   DB migrations | API build+reload | website build+reload | nginx | or all.
# Logs: stdout (GitHub Actions) and logs/deploy.log
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/smebuze}"
BRANCH="${DEPLOY_BRANCH:-production}"
FORCE_FULL="${FORCE_FULL:-0}"
SKIP_PULL="${SKIP_PULL:-0}"
STATE_FILE="${APP_DIR}/.deploy-revision"
LOG_DIR="${APP_DIR}/logs"

export PATH="/usr/local/bin:/usr/bin:${PATH}"
if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
fi

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/deploy.log"
RUN_LOG="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

log() {
  local line
  line="[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"
  echo "$line"
  echo "$line" >> "${LOG_FILE}"
  echo "$line" >> "${RUN_LOG}"
}

die() {
  log "ERROR: $*"
  exit 1
}

cd "${APP_DIR}"

[[ -d .git ]] || die "${APP_DIR} is not a git clone."
[[ -f .env ]] || die "missing ${APP_DIR}/.env"

if [[ "${SKIP_PULL}" != "1" ]]; then
  export PREV_SHA
  PREV_SHA="$(cat "${STATE_FILE}" 2>/dev/null || git rev-parse HEAD 2>/dev/null || true)"
  log "==== deploy start (pull ${BRANCH}) ===="
  log "previous: ${PREV_SHA:-none}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
  log "now:      $(git rev-parse --short HEAD) $(git log -1 --format='%s')"
  SKIP_PULL=1 PREV_SHA="${PREV_SHA}" FORCE_FULL="${FORCE_FULL}" exec bash "${APP_DIR}/scripts/deploy.sh"
fi

NEW_SHA="$(git rev-parse HEAD)"
PREV_SHA="${PREV_SHA:-}"
log "==== decide what to run ===="
log "from ${PREV_SHA:-<first>} -> ${NEW_SHA}"

NEED_NPM=0
NEED_MIGRATE=0
NEED_API=0
NEED_WEB=0
NEED_NGINX=0

if [[ "${FORCE_FULL}" == "1" || "${FORCE_FULL}" == "true" ]]; then
  log "FORCE_FULL=1 → npm ci, migrate, API, website, nginx, PM2"
  NEED_NPM=1
  NEED_MIGRATE=1
  NEED_API=1
  NEED_WEB=1
  NEED_NGINX=1
elif [[ -z "${PREV_SHA}" ]]; then
  log "no previous revision → full deploy"
  NEED_NPM=1
  NEED_MIGRATE=1
  NEED_API=1
  NEED_WEB=1
  NEED_NGINX=1
elif [[ "${PREV_SHA}" == "${NEW_SHA}" ]]; then
  log "same commit — health check only"
else
  if ! git cat-file -e "${PREV_SHA}^{commit}" 2>/dev/null; then
    log "previous SHA not in git (force-push?) → full deploy"
    NEED_NPM=1
    NEED_MIGRATE=1
    NEED_API=1
    NEED_WEB=1
    NEED_NGINX=1
  else
    mapfile -t CHANGED < <(git diff --name-only "${PREV_SHA}" "${NEW_SHA}")
    if [[ ${#CHANGED[@]} -eq 0 ]]; then
      log "empty diff — health check only"
    else
      log "changed files (${#CHANGED[@]}):"
      for f in "${CHANGED[@]}"; do
        log "  - ${f}"
        case "${f}" in
          package-lock.json|package.json|apps/*/package.json)
            NEED_NPM=1
            ;;
          packages/db-migrations/*)
            NEED_MIGRATE=1
            NEED_API=1
            ;;
          apps/api/*)
            NEED_API=1
            ;;
          apps/website/*)
            NEED_WEB=1
            ;;
          packages/*)
            NEED_API=1
            ;;
          ecosystem.config.cjs)
            NEED_API=1
            NEED_WEB=1
            ;;
          deploy/nginx/*)
            NEED_NGINX=1
            ;;
        esac
      done
    fi
  fi
fi

if [[ ! -d node_modules ]]; then
  log "node_modules missing → npm ci"
  NEED_NPM=1
fi

log "plan: npm_ci=${NEED_NPM} migrate=${NEED_MIGRATE} api=${NEED_API} website=${NEED_WEB} nginx=${NEED_NGINX}"

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ "${NEED_NPM}" == "1" || "${NEED_MIGRATE}" == "1" || "${NEED_API}" == "1" || "${NEED_WEB}" == "1" ]]; then
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
fi

if [[ "${NEED_NPM}" == "1" ]]; then
  log "RUN npm ci"
  npm ci
else
  log "SKIP npm ci"
fi

if [[ "${NEED_MIGRATE}" == "1" ]]; then
  log "RUN db:migrate (database ${DB_NAME:-smebuze} only)"
  npm run db:migrate
else
  log "SKIP db:migrate"
fi

ln -sfn "${APP_DIR}/.env" "${APP_DIR}/apps/api/.env"
if [[ ! -f apps/website/.env.local ]]; then
  echo "NEXT_PUBLIC_API_URL=${API_PUBLIC_URL:-https://api.smebuze.com}" > apps/website/.env.local
  log "wrote apps/website/.env.local"
fi

RESTART_API=0
RESTART_WEB=0

if [[ "${NEED_API}" == "1" ]]; then
  log "RUN api:build"
  npm run api:build
  RESTART_API=1
else
  log "SKIP api:build"
fi

if [[ "${NEED_WEB}" == "1" ]]; then
  log "RUN website:build"
  npm run website:build
  RESTART_WEB=1
else
  log "SKIP website:build"
fi

if [[ "${NEED_MIGRATE}" == "1" ]]; then
  RESTART_API=1
fi

if [[ "${NEED_NGINX}" == "1" ]]; then
  if sudo -n true 2>/dev/null; then
    log "RUN nginx site files + reload"
    sudo cp "${APP_DIR}/deploy/nginx/api.smebuze.com.conf" /etc/nginx/sites-available/api.smebuze.com
    sudo cp "${APP_DIR}/deploy/nginx/smebuze.com.conf" /etc/nginx/sites-available/smebuze.com
    sudo ln -sf /etc/nginx/sites-available/api.smebuze.com /etc/nginx/sites-enabled/api.smebuze.com
    sudo ln -sf /etc/nginx/sites-available/smebuze.com /etc/nginx/sites-enabled/smebuze.com
    sudo nginx -t
    sudo systemctl reload nginx
    log "nginx reloaded"
  else
    log "WARN SKIP nginx — this user cannot sudo without a password. Apply deploy/nginx/ by hand."
  fi
else
  log "SKIP nginx"
fi

command -v pm2 >/dev/null 2>&1 || die "pm2 not found on PATH"

if [[ "${RESTART_API}" == "1" && "${RESTART_WEB}" == "1" ]]; then
  log "RUN pm2 startOrReload smebuze-api + smebuze-web"
  pm2 startOrReload "${APP_DIR}/ecosystem.config.cjs" --update-env
  pm2 save
elif [[ "${RESTART_API}" == "1" ]]; then
  log "RUN pm2 restart smebuze-api only"
  if pm2 describe smebuze-api >/dev/null 2>&1; then
    pm2 restart smebuze-api --update-env
  else
    pm2 startOrReload "${APP_DIR}/ecosystem.config.cjs" --update-env
  fi
  pm2 save
elif [[ "${RESTART_WEB}" == "1" ]]; then
  log "RUN pm2 restart smebuze-web only"
  if pm2 describe smebuze-web >/dev/null 2>&1; then
    pm2 restart smebuze-web --update-env
  else
    pm2 startOrReload "${APP_DIR}/ecosystem.config.cjs" --update-env
  fi
  pm2 save
else
  log "SKIP pm2 restart"
fi

log "==== health ===="
sleep 2
API_HEALTH="$(curl -sS "http://127.0.0.1:${PORT:-3000}/api/v1/health" || true)"
log "api  : ${API_HEALTH}"
WEB_CODE="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ || true)"
log "web  : HTTP ${WEB_CODE}"
pm2 status smebuze-api smebuze-web || pm2 status

echo "${NEW_SHA}" > "${STATE_FILE}"
log "saved ${STATE_FILE}"
log "==== deploy ok $(git rev-parse --short HEAD) ${BRANCH} ===="
log "this run: ${RUN_LOG}"
log "all runs: ${LOG_FILE}"
