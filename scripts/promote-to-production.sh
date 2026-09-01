#!/usr/bin/env bash
# From your laptop: merge latest main into production and push (triggers auto-deploy).
set -euo pipefail

cd "$(dirname "$0")/.."

git checkout main
git pull origin main
git checkout production
git merge main
git push origin production
git checkout main
echo "Pushed production. GitHub Action will SSH to the VPS and run scripts/deploy.sh"
