#!/bin/bash
# VPS Deployment Script
# Run this on your VPS server to deploy the application

set -e

echo "🚀 WMS VPS Deployment Script"
echo "============================"
echo ""

# Configuration
APP_NAME="warehouse-wms"
DEPLOY_USER="${DEPLOY_USER:-wms}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/$APP_NAME}"
GIT_REPO="${GIT_REPO:-https://github.com/yourusername/warehouse-wms.git}"
DOMAIN="${DOMAIN:-your-domain.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running as root${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
apt-get update
apt-get install -y \
    docker.io \
    docker-compose \
    git \
    nginx \
    certbot \
    python3-certbot-nginx

# Enable and start Docker
systemctl enable docker
systemctl start docker

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Create deployment user
echo -e "${YELLOW}👤 Setting up deployment user...${NC}"
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    echo -e "${GREEN}✅ User $DEPLOY_USER created${NC}"
else
    echo -e "${YELLOW}⚠️  User $DEPLOY_USER already exists${NC}"
fi
echo ""

# Create deployment directory
echo -e "${YELLOW}📁 Setting up deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"
echo -e "${GREEN}✅ Directory created: $DEPLOY_DIR${NC}"
echo ""

# Clone or update repository
echo -e "${YELLOW}📥 Cloning/updating repository...${NC}"
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd "$DEPLOY_DIR"
    sudo -u "$DEPLOY_USER" git pull
    echo -e "${GREEN}✅ Repository updated${NC}"
else
    sudo -u "$DEPLOY_USER" git clone "$GIT_REPO" "$DEPLOY_DIR"
    echo -e "${GREEN}✅ Repository cloned${NC}"
fi
echo ""

# Setup environment file
echo -e "${YELLOW}⚙️  Setting up environment...${NC}"
cd "$DEPLOY_DIR"
if [ ! -f ".env" ]; then
    cp .env.docker .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your production settings${NC}"
    echo -e "${YELLOW}   Run: nano $DEPLOY_DIR/.env${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Build and start containers
echo -e "${YELLOW}🐳 Building and starting Docker containers...${NC}"
cd "$DEPLOY_DIR"
sudo -u "$DEPLOY_USER" docker-compose -f docker-compose.yml down
sudo -u "$DEPLOY_USER" docker-compose -f docker-compose.yml build
sudo -u "$DEPLOY_USER" docker-compose -f docker-compose.yml up -d

echo -e "${GREEN}✅ Containers started${NC}"
echo ""

# Setup nginx reverse proxy
echo -e "${YELLOW}🌐 Setting up Nginx reverse proxy...${NC}"
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    client_max_body_size 100M;
}
EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"
echo ""

# Setup SSL with Let's Encrypt
echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
read -p "Do you want to setup SSL with Let's Encrypt? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
    echo -e "${GREEN}✅ SSL certificate installed${NC}"
fi
echo ""

# Setup auto-renewal
echo -e "${YELLOW}🔄 Setting up SSL auto-renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
echo -e "${GREEN}✅ SSL auto-renewal configured${NC}"
echo ""

# Setup systemd service for auto-start
echo -e "${YELLOW}🔧 Setting up systemd service...${NC}"
cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=Warehouse WMS Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_DIR
User=$DEPLOY_USER
ExecStart=/usr/bin/docker-compose -f docker-compose.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable $APP_NAME.service
echo -e "${GREEN}✅ Systemd service configured${NC}"
echo ""

# Show status
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📊 Container Status:${NC}"
cd "$DEPLOY_DIR"
sudo -u "$DEPLOY_USER" docker-compose ps
echo ""
echo -e "${YELLOW}🌐 Access your application at:${NC}"
echo -e "   http://$DOMAIN"
echo ""
echo -e "${YELLOW}📝 Useful Commands:${NC}"
echo -e "   View logs:    cd $DEPLOY_DIR && docker-compose logs -f"
echo -e "   Restart:      systemctl restart $APP_NAME"
echo -e "   Stop:         systemctl stop $APP_NAME"
echo -e "   Update app:   cd $DEPLOY_DIR && git pull && docker-compose up -d --build"
echo ""
echo -e "${YELLOW}⚙️  Next Steps:${NC}"
echo -e "   1. Edit .env file: nano $DEPLOY_DIR/.env"
echo -e "   2. Update domain: $DOMAIN"
echo -e "   3. Restart: systemctl restart $APP_NAME"
echo ""
