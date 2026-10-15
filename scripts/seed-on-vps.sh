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

# Load DB credentials for migrate (seed scripts also load .env themselves).
if [[ -f "${APP_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${APP_DIR}/.env"
  set +a
fi

echo "Running additive migrations (IF NOT EXISTS / no DROP)..."
if ! npm run db:migrate; then
  echo "WARN: db:migrate failed (often already applied). Continuing with seeds…"
fi

echo "Seeding demo trading tenant (slug=demo only)..."
npm run seed:demo

echo "Seeding platform roles (BDE + partner) — no live tenant writes..."
npm run seed:platform

echo "Seeding business variants (demo-* / pos-* slugs only)..."
npm run seed:variants

echo "Seeding B2B garments wholesale demo (slug=demo-b2b-garments)..."
npm run seed:b2b-garments

echo "Seed complete. Live customer tenants were not modified."
echo "New demo users use Password123. Existing passwords unchanged unless SEED_RESET_PASSWORDS=1."
echo "B2B garments: tenant demo-b2b-garments / admin@demo-b2b-garments.demo / Password123"
