#!/bin/bash
# Quick Deploy Script - Run this on your VPS
# Usage: bash /tmp/quick_deploy.sh

set -e

echo "🚀 QGO Application - Quick Deploy Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install Prerequisites
echo -e "${YELLOW}[Step 1/6]${NC} Installing prerequisites..."
apt-get update > /dev/null 2>&1
apt-get install -y curl wget git nodejs npm mysql-server > /dev/null 2>&1
npm install -g pm2 > /dev/null 2>&1
echo -e "${GREEN}✓ Prerequisites installed${NC}"

# Step 2: Setup MySQL
echo -e "${YELLOW}[Step 2/6]${NC} Setting up MySQL database..."
systemctl start mysql
systemctl enable mysql

# Generate random password
MYSQL_PASSWORD=$(openssl rand -base64 16)

mysql -u root << MYSQL_EOF > /dev/null 2>&1
CREATE DATABASE IF NOT EXISTS qgo_production;
CREATE USER IF NOT EXISTS 'qgo_user'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON qgo_production.* TO 'qgo_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_EOF

echo -e "${GREEN}✓ MySQL database created${NC}"
echo -e "${YELLOW}   User: qgo_user${NC}"
echo -e "${YELLOW}   Password: ${MYSQL_PASSWORD}${NC}"

# Step 3: Create application directory
echo -e "${YELLOW}[Step 3/6]${NC} Creating application directory..."
mkdir -p /app
cd /app
echo -e "${GREEN}✓ Application directory ready at /app${NC}"

# Step 4: Setup environment
echo -e "${YELLOW}[Step 4/6]${NC} Configuring environment..."
JWT_SECRET=$(openssl rand -base64 32)

cat > /app/.env << EOF
DATABASE_URL="mysql://qgo_user:${MYSQL_PASSWORD}@localhost:3306/qgo_production"
API_PORT=5000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=7d
FRONTEND_URL=http://72.60.215.188:3000
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

# Step 5: Install dependencies
echo -e "${YELLOW}[Step 5/6]${NC} Installing npm dependencies (this may take 2-3 minutes)..."
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 6: Setup database and start app
echo -e "${YELLOW}[Step 6/6]${NC} Setting up database and starting application..."
npm run prisma:generate > /dev/null 2>&1
npm run prisma:migrate -- --name production > /dev/null 2>&1
npm run prisma:seed > /dev/null 2>&1

# Start with PM2
pm2 start npm --name "qgo-backend" -- run dev:server > /dev/null 2>&1
pm2 start npm --name "qgo-frontend" -- run dev:client > /dev/null 2>&1
pm2 save > /dev/null 2>&1
pm2 startup > /dev/null 2>&1

echo -e "${GREEN}✓ Application started${NC}"

# Display Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}🌐 Application URLs:${NC}"
echo -e "   Frontend: ${GREEN}http://72.60.215.188:3000${NC}"
echo -e "   Backend:  ${GREEN}http://72.60.215.188:5000${NC}"
echo -e "   Health:   ${GREEN}http://72.60.215.188:5000/api/health${NC}"
echo ""
echo -e "${YELLOW}🔐 Default Credentials:${NC}"
echo -e "   Email:    ${GREEN}admin@qgo.com${NC}"
echo -e "   Password: ${GREEN}admin123${NC}"
echo ""
echo -e "${YELLOW}💾 MySQL Credentials:${NC}"
echo -e "   User:     ${GREEN}qgo_user${NC}"
echo -e "   Password: ${GREEN}${MYSQL_PASSWORD}${NC}"
echo -e "   Database: ${GREEN}qgo_production${NC}"
echo ""
echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo -e "   ${GREEN}pm2 status${NC}        - Check running processes"
echo -e "   ${GREEN}pm2 logs${NC}          - View application logs"
echo -e "   ${GREEN}pm2 restart all${NC}   - Restart all processes"
echo -e "   ${GREEN}pm2 stop all${NC}      - Stop all processes"
echo ""
echo -e "${GREEN}========================================${NC}"
