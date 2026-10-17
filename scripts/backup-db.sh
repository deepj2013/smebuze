#!/usr/bin/env bash
# Dump Postgres to APP_DIR/backups/db (custom format .dump). Safe for cron + admin button.
# Usage (on VPS as smebuze user):
#   APP_DIR=/var/www/smebuze bash scripts/backup-db.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/smebuze}"
BACKUP_DIR="${BACKUP_DIR:-${APP_DIR}/backups/db}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
ENV_FILE="${APP_DIR}/.env"

[[ -f "${ENV_FILE}" ]] || { echo "missing ${ENV_FILE}" >&2; exit 1; }
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found — install postgresql-client" >&2; exit 1; }

# Never `source .env` (MAIL_FROM etc. break bash). Export via node helper.
eval "$(node "${APP_DIR}/scripts/export-dotenv.js" "${ENV_FILE}")"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-smebuze}"
DB_NAME="${DB_NAME:-smebuze}"
: "${DB_PASSWORD:?DB_PASSWORD missing in .env}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}" 2>/dev/null || true

STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
OUT="${BACKUP_DIR}/smebuze-${STAMP}.dump"

export PGPASSWORD="${DB_PASSWORD}"
pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=custom \
  --no-owner \
  --file="${OUT}"

chmod 600 "${OUT}" 2>/dev/null || true

# Rotate old dumps
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'smebuze-*.dump' -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true

echo "${OUT}"
