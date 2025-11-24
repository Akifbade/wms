#!/bin/bash

# 🚀 QGO MATERIAL TRACKING SYSTEM - VPS DEPLOYMENT SCRIPT
# Automated deployment to production VPS

set -e

# Configuration
VPS_IP="148.230.107.155"
VPS_USER="root"
VPS_PATH="/opt/qgo-materials"
REPO_PATH="c:\Users\USER\Videos\NEW START\qgo"
DOMAIN="qgocargo.cloud"

echo "🚀 Starting VPS Deployment..."
echo "================================"

# Step 1: Build locally
echo "📦 Step 1: Building application locally..."
cd "$REPO_PATH"
npm run build:server
npm run build

# Step 2: Create deployment package
echo "📦 Step 2: Creating deployment package..."
tar --exclude=node_modules --exclude=.git --exclude=dist -czf qgo-materials-production.tar.gz .

# Step 3: Upload to VPS
echo "📤 Step 3: Uploading to VPS..."
scp qgo-materials-production.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Step 4: Deploy on VPS
echo "🔧 Step 4: Deploying on VPS..."
ssh $VPS_USER@$VPS_IP << 'EOF'
set -e

echo "📥 Extracting files..."
cd /opt
rm -rf qgo-materials-old
mv qgo-materials qgo-materials-old 2>/dev/null || true
mkdir -p qgo-materials
cd qgo-materials
tar -xzf /tmp/qgo-materials-production.tar.gz

echo "📦 Installing dependencies..."
npm install --production

echo "🗄️ Setting up database..."
npm run prisma:generate
npm run prisma:migrate:deploy

echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/qgo-materials.service << 'SERVICE'
[Unit]
Description=QGO Material Tracking System
After=network.target mysql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/qgo-materials
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable qgo-materials.service
systemctl restart qgo-materials.service

echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/qgo-materials << 'NGINX'
server {
    listen 80;
    server_name qgocargo.cloud www.qgocargo.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qgocargo.cloud www.qgocargo.cloud;

    ssl_certificate /etc/letsencrypt/live/qgocargo.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qgocargo.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/qgo-materials /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "✅ Deployment complete!"
echo "🌐 Application running at: https://qgocargo.cloud"
echo "📊 API available at: https://qgocargo.cloud/api"

EOF

# Step 5: Cleanup
echo "🧹 Cleaning up..."
rm qgo-materials-production.tar.gz

echo ""
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "================================"
echo "🌐 Access your application:"
echo "   Frontend: https://qgocargo.cloud"
echo "   API: https://qgocargo.cloud/api"
echo "📊 Backend Port: 3000"
echo "🗄️ Database: MySQL on VPS"
echo ""
echo "📋 Useful commands:"
echo "   Check status:    ssh root@$VPS_IP 'systemctl status qgo-materials'"
echo "   View logs:       ssh root@$VPS_IP 'journalctl -u qgo-materials -f'"
echo "   Restart service: ssh root@$VPS_IP 'systemctl restart qgo-materials'"
