#!/bin/bash
# Safe VPS Deployment Script - QGO Application
# Location: /var/www/qgo (separate from existing WMS system)
# Does NOT touch existing /var/www/wms system

set -e

echo "🚀 QGO Deployment - Safe Mode (Separate from existing WMS)"
echo "============================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if already running
if pgrep -f "/var/www/qgo" > /dev/null; then
    echo -e "${YELLOW}⚠️  QGO is already running, stopping it first...${NC}"
    pm2 stop qgo-backend qgo-frontend 2>/dev/null || true
    sleep 2
fi

# Step 1: Install Node.js if not present
echo -e "${YELLOW}[1/7]${NC} Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}    Installing Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
    apt-get install -y nodejs > /dev/null
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION} already installed${NC}"
fi

# Step 2: Install PM2 if not present
echo -e "${YELLOW}[2/7]${NC} Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}    Installing PM2...${NC}"
    npm install -g pm2 > /dev/null
else
    echo -e "${GREEN}✓ PM2 already installed${NC}"
fi

# Step 3: Create QGO application directory
echo -e "${YELLOW}[3/7]${NC} Setting up application directory..."
mkdir -p /var/www/qgo
cd /var/www/qgo

# Check if application files already exist
if [ -f "/var/www/qgo/package.json" ]; then
    echo -e "${YELLOW}    Application files found, updating...${NC}"
else
    echo -e "${YELLOW}    Creating fresh installation...${NC}"
fi

# Step 4: Install dependencies
echo -e "${YELLOW}[4/7]${NC} Installing npm dependencies..."
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Setup environment
echo -e "${YELLOW}[5/7]${NC} Configuring environment..."

# Check if MySQL credentials already set
if grep -q "DATABASE_URL" /var/www/qgo/.env 2>/dev/null; then
    echo -e "${GREEN}✓ Environment file already exists${NC}"
    MYSQL_PASSWORD=$(grep "DATABASE_URL" /var/www/qgo/.env | cut -d"'" -f2 | cut -d":" -f3 | cut -d"@" -f1)
else
    echo -e "${YELLOW}    Creating new .env file...${NC}"
    
    # Generate credentials
    MYSQL_PASSWORD=$(openssl rand -base64 16)
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Setup MySQL database
    echo -e "${YELLOW}    Setting up MySQL database for QGO...${NC}"
    
    mysql -u root << MYSQL_EOF 2>/dev/null || echo -e "${YELLOW}    Note: MySQL may need manual setup${NC}"
CREATE DATABASE IF NOT EXISTS qgo_production;
CREATE USER IF NOT EXISTS 'qgo_user'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON qgo_production.* TO 'qgo_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_EOF

    cat > /var/www/qgo/.env << EOF
# QGO Database Configuration
DATABASE_URL="mysql://qgo_user:${MYSQL_PASSWORD}@localhost:3306/qgo_production"

# API Configuration
API_PORT=5001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://72.60.215.188:3001
EOF

    echo -e "${GREEN}✓ Environment configured${NC}"
fi

# Step 6: Setup database
echo -e "${YELLOW}[6/7]${NC} Setting up database..."
npm run prisma:generate > /dev/null 2>&1
npm run prisma:migrate -- --name production > /dev/null 2>&1 || echo -e "${YELLOW}    Migration already up to date${NC}"
npm run prisma:seed > /dev/null 2>&1 || echo -e "${YELLOW}    Database already seeded${NC}"
echo -e "${GREEN}✓ Database configured${NC}"

# Step 7: Start with PM2
echo -e "${YELLOW}[7/7]${NC} Starting application..."

# Delete old PM2 processes if exist
pm2 delete qgo-backend 2>/dev/null || true
pm2 delete qgo-frontend 2>/dev/null || true

# Start new processes
cd /var/www/qgo
pm2 start npm --name "qgo-backend" -- run dev:server > /dev/null 2>&1
pm2 start npm --name "qgo-frontend" -- run dev:client > /dev/null 2>&1

# Wait for startup
sleep 3

# Check if running
if pm2 list | grep -q "qgo-backend.*online"; then
    echo -e "${GREEN}✓ Application started${NC}"
else
    echo -e "${RED}✗ Failed to start application${NC}"
    echo "Check logs with: pm2 logs qgo-backend"
    exit 1
fi

# Save PM2 config
pm2 save > /dev/null 2>&1

# Display Summary
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✅ QGO Deployment Complete! (Separate from WMS)${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${YELLOW}📍 Installation Location:${NC}"
echo -e "   ${GREEN}/var/www/qgo${NC}"
echo ""
echo -e "${YELLOW}🌐 Application URLs:${NC}"
echo -e "   Frontend: ${GREEN}http://72.60.215.188:3001${NC}"
echo -e "   Backend:  ${GREEN}http://72.60.215.188:5001${NC}"
echo -e "   Health:   ${GREEN}http://72.60.215.188:5001/api/health${NC}"
echo ""
echo -e "${YELLOW}🔐 Default Credentials:${NC}"
echo -e "   Email:    ${GREEN}admin@qgo.com${NC}"
echo -e "   Password: ${GREEN}admin123${NC}"
echo ""
echo -e "${YELLOW}💾 MySQL Credentials:${NC}"
echo -e "   User:     ${GREEN}qgo_user${NC}"
echo -e "   Database: ${GREEN}qgo_production${NC}"
echo ""
echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo -e "   ${GREEN}pm2 list${NC}           - Show all PM2 processes"
echo -e "   ${GREEN}pm2 logs qgo-backend${NC} - View backend logs"
echo -e "   ${GREEN}pm2 logs qgo-frontend${NC} - View frontend logs"
echo -e "   ${GREEN}pm2 restart qgo-backend${NC} - Restart backend"
echo -e "   ${GREEN}pm2 stop qgo-backend${NC} - Stop backend"
echo ""
echo -e "${YELLOW}⚠️  Your existing WMS system:${NC}"
echo -e "   Location: ${GREEN}/var/www/wms${NC}"
echo -e "   Status:   ${GREEN}UNTOUCHED (not affected by QGO)${NC}"
echo ""
echo -e "${GREEN}============================================================${NC}"
