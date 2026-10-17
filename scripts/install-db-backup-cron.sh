#!/usr/bin/env bash
# Install a daily 02:15 local-time pg_dump cron for the smebuze user.
# Run once on the VPS: sudo -u smebuze bash /var/www/smebuze/scripts/install-db-backup-cron.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/smebuze}"
SCRIPT="${APP_DIR}/scripts/backup-db.sh"
LOG="${APP_DIR}/logs/db-backup.log"
MARKER="# smebuze-db-backup"

[[ -f "${SCRIPT}" ]] || { echo "missing ${SCRIPT}" >&2; exit 1; }
chmod +x "${SCRIPT}"
mkdir -p "${APP_DIR}/logs" "${APP_DIR}/backups/db"

LINE="15 2 * * * APP_DIR=${APP_DIR} BACKUP_KEEP_DAYS=14 /bin/bash ${SCRIPT} >> ${LOG} 2>&1 ${MARKER}"

EXISTING="$(crontab -l 2>/dev/null || true)"
FILTERED="$(printf '%s\n' "${EXISTING}" | grep -v "${MARKER}" || true)"
printf '%s\n%s\n' "${FILTERED}" "${LINE}" | crontab -

echo "Installed cron:"
crontab -l | grep "${MARKER}" || true
echo "Dumps land in ${APP_DIR}/backups/db (kept ${BACKUP_KEEP_DAYS:-14} days)."
echo "Optional Drive sync: install rclone, then append:"
echo "  30 2 * * * rclone copy ${APP_DIR}/backups/db remote:smebuze-db-backups --max-age 14d ${MARKER}-rclone"
