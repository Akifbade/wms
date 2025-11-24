#!/bin/bash

# Deploy phpMyAdmin to Production VPS
# Run this script to add phpMyAdmin to your production server

echo "🚀 Deploying phpMyAdmin to Production VPS..."
echo ""

# Step 1: Pull latest changes
echo "📥 Step 1: Pulling latest code from GitHub..."
ssh root@148.230.107.155 "cd /root/NEW\ START && git pull origin stable/prisma-mysql-production"

echo ""
echo "✅ Code updated!"
echo ""

# Step 2: Start phpMyAdmin container
echo "🐳 Step 2: Starting phpMyAdmin container..."
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose up -d phpmyadmin"

echo ""
echo "✅ phpMyAdmin container started!"
echo ""

# Step 3: Verify it's running
echo "🔍 Step 3: Checking if phpMyAdmin is running..."
ssh root@148.230.107.155 "docker ps | grep phpmyadmin"

echo ""
echo "════════════════════════════════════════════════"
echo "✅ phpMyAdmin Deployed Successfully!"
echo "════════════════════════════════════════════════"
echo ""
echo "📝 Access Information:"
echo ""
echo "   🌐 URL: http://148.230.107.155:8081"
echo ""
echo "   👤 Username: root"
echo "   🔑 Password: rootpassword123"
echo ""
echo "   📦 Database: warehouse_wms"
echo ""
echo "════════════════════════════════════════════════"
echo ""
echo "⚠️  SECURITY RECOMMENDATIONS:"
echo ""
echo "1. Change port 8081 to something random (edit docker-compose.yml)"
echo "2. Use SSH tunnel: ssh -L 8081:localhost:8081 root@148.230.107.155"
echo "3. Add firewall rule to restrict access to your IP only"
echo ""
echo "📖 Full guide: See PHPMYADMIN-SETUP.md"
echo ""
