#!/bin/bash
# Redeploy SMEBUZE API container without triggering docker-compose "recreate"
# (avoids KeyError: 'ContainerConfig' with old docker-compose + new Docker Engine)
# Run from project root: ./scripts/docker-api-redeploy.sh

set -e
cd "$(dirname "$0")/.."
COMPOSE_FILE="docker-compose.production.yml"

echo "Stopping API service..."
docker-compose -f "$COMPOSE_FILE" stop api 2>/dev/null || true

echo "Removing any existing API container(s)..."
for name in $(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -E '_api_1$|smebuze.*api' || true); do
  echo "  Removing container: $name"
  docker rm -f "$name" 2>/dev/null || true
done

echo "Starting API (fresh create)..."
docker-compose -f "$COMPOSE_FILE" up -d api

echo "Done. Check: docker-compose -f $COMPOSE_FILE ps"
