#!/bin/bash
set -e

# ==========================================
# VPS WEBHOOK DEPLOYMENT SCRIPT
# Called by VPS when GitHub webhook triggers
# ==========================================

echo "🚀 Webhook Deployment Triggered at $(date)"
cd "/root/NEW START"

# 1. Pull latest code
echo "📥 Pulling latest code from GitHub..."
git fetch origin stable/prisma-mysql-production
git reset --hard origin/stable/prisma-mysql-production

# 2. Pull fresh Docker images from GHCR
echo "📦 Pulling fresh Docker images..."
docker pull ghcr.io/akifbade/wms-backend:latest
docker pull ghcr.io/akifbade/wms-frontend:latest

# 3. Run deployment script
echo "🔄 Running deployment script..."
chmod +x vps-deploy.sh
./vps-deploy.sh

echo "✅ Webhook deployment complete!"
