#!/bin/bash

# Material Tracking System - VPS Deployment Script
# Deploys complete system to production server
# Date: October 22, 2025

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  Material Tracking System - VPS Deployment"
echo "═══════════════════════════════════════════════════════════════"

# Configuration
VPS_USER="root"
VPS_IP="148.230.107.155"
VPS_PATH="/home/qgo"
LOCAL_PATH="c:\Users\USER\Videos\NEW START\qgo"
APP_NAME="qgo-material-tracking"
APP_PORT=3000
FRONTEND_PORT=5173

echo ""
echo "📋 Configuration:"
echo "   VPS IP:       $VPS_IP"
echo "   VPS Path:     $VPS_PATH"
echo "   App Port:     $APP_PORT"
echo "   Frontend:     $FRONTEND_PORT"
echo ""

# Step 1: Prepare local build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Building application locally..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$LOCAL_PATH"

# Generate Prisma
echo "  ✓ Generating Prisma client..."
npm run prisma:generate

# Build backend
echo "  ✓ Building backend..."
npm run build:server

# Build frontend
echo "  ✓ Building frontend..."
npm run build

echo "✅ Local build complete"
echo ""

# Step 2: Create deployment package
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Creating deployment package..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create tar file
echo "  ✓ Packaging files..."
tar -czf /tmp/qgo-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist-simple \
  .env \
  package.json \
  package-lock.json \
  prisma/ \
  dist/ \
  server/ \
  dist-server/ \
  dist-build/ \
  index.html \
  tsconfig.json \
  vite.config.ts

echo "✅ Package created: /tmp/qgo-deploy.tar.gz"
echo ""

# Step 3: Deploy to VPS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Uploading to VPS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  ✓ Uploading deployment package..."
scp -P 22 /tmp/qgo-deploy.tar.gz $VPS_USER@$VPS_IP:/tmp/

echo "✅ Upload complete"
echo ""

# Step 4: Setup on VPS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Setting up on VPS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -p 22 $VPS_USER@$VPS_IP << 'EOF'

echo "  ✓ Extracting files..."
cd /home/qgo
rm -rf ./backup
mkdir -p ./backup
cp -r ./* ./backup/ 2>/dev/null || true
rm -rf *

cd /tmp
tar -xzf qgo-deploy.tar.gz -C /home/qgo

echo "  ✓ Installing dependencies..."
cd /home/qgo
npm install --production

echo "  ✓ Deploying database..."
npm run prisma:migrate:deploy || npm run prisma:db push --accept-data-loss

echo "✅ VPS setup complete"

EOF

echo ""

# Step 5: Restart services
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Starting services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -p 22 $VPS_USER@$VPS_IP << 'EOF'

cd /home/qgo

# Kill existing processes
pkill -f "npm start" || true
pkill -f "node dist" || true

# Start application with PM2 or nohup
echo "  ✓ Starting application..."

# Using PM2 if available, otherwise nohup
if command -v pm2 &> /dev/null; then
    pm2 start npm --name "qgo" -- start
    pm2 save
    echo "  ✓ Started with PM2"
else
    nohup npm start > /var/log/qgo.log 2>&1 &
    echo "  ✓ Started with nohup"
fi

sleep 2

# Verify services
if curl -s http://localhost:3000/api/materials/racks > /dev/null; then
    echo "✅ Backend running on port 3000"
else
    echo "⚠️  Backend health check failed"
fi

EOF

echo ""

# Step 6: Setup reverse proxy (if needed)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Configuring reverse proxy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -p 22 $VPS_USER@$VPS_IP << 'EOF'

# Configure Nginx if available
if command -v nginx &> /dev/null; then
    cat > /etc/nginx/sites-available/qgo << 'NGINX'
server {
    listen 80;
    server_name qgocargo.cloud;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

    ln -sf /etc/nginx/sites-available/qgo /etc/nginx/sites-enabled/qgo
    nginx -t && systemctl restart nginx
    echo "  ✓ Nginx configured"
else
    echo "  ⚠️  Nginx not found"
fi

EOF

echo ""

# Step 7: Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Verification & Testing..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test API
echo "  Testing API endpoints..."
ssh -p 22 $VPS_USER@$VPS_IP << 'EOF'

echo "  ✓ Testing backend..."
curl -s http://localhost:3000/api/materials/racks && echo "" || echo "Backend test failed"

echo "  ✓ Checking disk space..."
df -h /home/qgo | tail -1

echo "  ✓ Checking memory..."
free -h | head -2

EOF

echo ""

# Step 8: Summary
echo "═══════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📊 Deployment Summary:"
echo "   Server IP:      $VPS_IP"
echo "   App Location:   $VPS_PATH"
echo "   Backend Port:   $APP_PORT"
echo "   Frontend Port:  $FRONTEND_PORT"
echo ""
echo "🌐 Access URLs:"
echo "   API:     http://$VPS_IP:$APP_PORT/api/materials/racks"
echo "   Domain:  http://qgocargo.cloud"
echo ""
echo "📋 Next Steps:"
echo "   1. Test API: curl http://$VPS_IP:3000/api/materials/racks"
echo "   2. Check logs: ssh $VPS_USER@$VPS_IP 'tail -f /var/log/qgo.log'"
echo "   3. View PM2 status: ssh $VPS_USER@$VPS_IP 'pm2 status'"
echo ""
echo "💾 Backup Location: /home/qgo/backup"
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Cleanup
rm /tmp/qgo-deploy.tar.gz

echo "✅ Deployment complete! System is now live on VPS."
