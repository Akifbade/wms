#!/bin/bash
# VPS Deployment Instructions

echo "🚀 Deploying QGO to VPS: 72.60.215.188"
echo "========================================"

# Variables
VPS_HOST="72.60.215.188"
VPS_USER="root"
VPS_PASSWORD="Akif@8788881688"

# Step 1: Prepare files
echo "[1] Preparing files for upload..."
cd /c/Users/Anand\ Mani/Desktop/backup/akif

# Create temp directory
mkdir -p /tmp/qgo_deploy
cp -r . /tmp/qgo_deploy/

# Remove node_modules to reduce size
rm -rf /tmp/qgo_deploy/node_modules
rm -rf /tmp/qgo_deploy/dist
rm -rf /tmp/qgo_deploy/.git

# Step 2: Upload via SCP
echo "[2] Uploading application files to VPS..."
echo "This may take 5-10 minutes depending on connection speed..."

# Using sshpass for non-interactive authentication
echo "$VPS_PASSWORD" | scp -r /tmp/qgo_deploy/ root@${VPS_HOST}:/app/

echo "[3] Running deployment script on VPS..."
echo "$VPS_PASSWORD" | ssh root@${VPS_HOST} 'bash /app/quick_deploy.sh'

echo "✅ Deployment Complete!"
