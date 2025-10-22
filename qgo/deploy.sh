#!/bin/bash

# QGO Application Deployment Script for VPS
# VPS: 72.60.215.188
# User: root

set -e

echo "========================================"
echo "QGO Application - VPS Deployment"
echo "========================================"

# Step 1: Update system
echo "[1/10] Updating system packages..."
apt-get update && apt-get upgrade -y

# Step 2: Install Node.js 20
echo "[2/10] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Step 3: Install MySQL Server
echo "[3/10] Installing MySQL Server..."
apt-get install -y mysql-server

# Start MySQL
systemctl start mysql
systemctl enable mysql

# Step 4: Create MySQL database and user
echo "[4/10] Setting up MySQL database..."
MYSQL_PASSWORD=$(openssl rand -base64 32)

mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS qgo_production;
CREATE USER IF NOT EXISTS 'qgo_user'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON qgo_production.* TO 'qgo_user'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "MySQL User: qgo_user"
echo "MySQL Password: ${MYSQL_PASSWORD}"
echo "Save these credentials!"

# Step 5: Install PM2 globally
echo "[5/10] Installing PM2..."
npm install -g pm2

# Step 6: Create app directory
echo "[6/10] Creating application directory..."
mkdir -p /app
cd /app

# Step 7: Upload application files
# Note: Files should be uploaded via SCP or git clone
echo "[7/10] Waiting for application files..."
echo "Upload application files to /app directory"
read -p "Press Enter when files are ready..."

# Step 8: Install dependencies
echo "[8/10] Installing npm dependencies..."
cd /app
npm install

# Step 9: Setup environment
echo "[9/10] Creating .env file..."
cat > /app/.env << EOF
# Database Configuration
DATABASE_URL="mysql://qgo_user:${MYSQL_PASSWORD}@localhost:3306/qgo_production"

# API Configuration
API_PORT=5000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://72.60.215.188:3000
EOF

echo "Environment file created at /app/.env"

# Step 10: Setup database
echo "[10/10] Setting up database..."
cd /app
npm run prisma:generate
npm run prisma:migrate -- --name production
npm run prisma:seed

# Step 11: Start application with PM2
echo "========================================="
echo "Starting application with PM2..."
echo "========================================="

pm2 start npm --name "qgo-backend" -- run dev:server
pm2 start npm --name "qgo-frontend" -- run dev:client

pm2 save
pm2 startup

echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Application URLs:"
echo "  Frontend: http://72.60.215.188:3000"
echo "  Backend:  http://72.60.215.188:5000"
echo "  Health:   http://72.60.215.188:5000/api/health"
echo ""
echo "Default Credentials:"
echo "  Email:    admin@qgo.com"
echo "  Password: admin123"
echo ""
echo "PM2 Commands:"
echo "  pm2 status           - Check running processes"
echo "  pm2 logs            - View application logs"
echo "  pm2 restart all     - Restart all processes"
echo "  pm2 stop all        - Stop all processes"
echo ""
echo "MySQL Credentials:"
echo "  User:     qgo_user"
echo "  Password: ${MYSQL_PASSWORD}"
echo "  Database: qgo_production"
echo "========================================="
