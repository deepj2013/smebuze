#!/usr/bin/env bash
# Run on the VPS only. Idempotent demo seeds — never deletes live tenant data.
# Seed scripts parse .env themselves — do not bash-source .env.
# Passwords for EXISTING users are left alone unless SEED_RESET_PASSWORDS=1.
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

echo "Running additive migrations (IF NOT EXISTS / no DROP)..."
npm run db:migrate

echo "Seeding demo trading tenant (slug=demo only)..."
npm run seed:demo

echo "Seeding platform roles (BDE + partner) — no live tenant writes..."
npm run seed:platform

echo "Seeding business variants (demo-* / pos-* slugs only)..."
npm run seed:variants

echo "Seed complete. Live customer tenants were not modified."
echo "New demo users use Password123. Existing passwords unchanged unless SEED_RESET_PASSWORDS=1."
