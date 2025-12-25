#!/bin/bash
set -e

# ==========================================
# VPS WEBHOOK DEPLOYMENT SCRIPT
# Called manually from local machine
# ==========================================

echo "🚀 Webhook Deployment Triggered at $(date)"
cd "/root/NEW START"

# 1. Pull latest code
echo "📥 Pulling latest code from GitHub..."
git fetch origin stable/prisma-mysql-production
git reset --hard origin/stable/prisma-mysql-production

# 2. Images are already on VPS from previous GitHub Actions build
# Skip docker pull - use existing images

# 3. Run deployment script
echo "🔄 Running deployment script..."
chmod +x vps-deploy.sh
./vps-deploy.sh

echo "✅ Webhook deployment complete!"
