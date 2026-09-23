#!/usr/bin/env bash
# Run on the VPS only. Idempotent demo + business-variant seeds (restaurant, etc.).
# Seed scripts parse .env themselves — do not bash-source .env.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/smebuze}"

export PATH="/usr/local/bin:/usr/bin:${PATH}"
if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
fi

cd "${APP_DIR}"
[[ -f package.json ]] || { echo "ERROR: missing ${APP_DIR}/package.json" >&2; exit 1; }
[[ -f .env ]] || { echo "ERROR: missing ${APP_DIR}/.env" >&2; exit 1; }

echo "Seeding demo users..."
npm run seed:demo
echo "Seeding business variants (restaurant, sweets, ...)"
npm run seed:variants
echo "Seed complete."
