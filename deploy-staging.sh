#!/bin/bash
# WMS Staging — Quick Deploy Script
# Usage: ./deploy-staging.sh [frontend|backend|all]
# Run from /root/WMS-STAGING

set -e
cd /root/WMS-STAGING

case "${1:-all}" in
  frontend)
    echo "[staging] Building & deploying frontend..."
    docker compose -f docker-compose.staging.yml build frontend-staging
    docker compose -f docker-compose.staging.yml up -d --no-deps frontend-staging
    ;;
  backend)
    echo "[staging] Building & deploying backend..."
    docker compose -f docker-compose.staging.yml build backend-staging
    docker compose -f docker-compose.staging.yml up -d --no-deps backend-staging
    ;;
  all)
    echo "[staging] Building & deploying ALL..."
    docker compose -f docker-compose.staging.yml build
    docker compose -f docker-compose.staging.yml up -d
    ;;
  *)
    echo "Usage: $0 [frontend|backend|all]"
    exit 1
    ;;
esac

echo "[staging] Health check..."
sleep 5
curl -s http://127.0.0.1:6000/api/health | grep -q '"status":"ok"' && echo "✅ Backend: OK" || echo "❌ Backend: FAIL"
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://127.0.0.1:4080/

echo "[staging] Done!"
