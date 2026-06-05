#!/bin/bash
# Deploy staging frontend with auto version detection
set -e

cd "$(dirname "$0")"

# Export git metadata for Docker build args
export VITE_APP_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local-dev")
export VITE_APP_COMMIT_MESSAGE=$(git log -1 --pretty=%s 2>/dev/null || echo "local-build")
export COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
export VITE_APP_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "staging")

echo "🚀 Deploying staging frontend..."
echo "   Version: v$(cat frontend/VERSION 2>/dev/null || echo "2.4.0")+build.${COMMIT_COUNT}"
echo "   Commit: ${VITE_APP_COMMIT_HASH} — ${VITE_APP_COMMIT_MESSAGE}"
echo "   Branch: ${VITE_APP_BRANCH}"

docker compose -f docker-compose.staging.yml up -d --build frontend-staging

echo "✅ Deployed!"
