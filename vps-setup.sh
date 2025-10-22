#!/bin/bash

# VPS Setup Script - Run this on your Ubuntu/Debian VPS
# Usage: bash vps-setup.sh

set -e

echo "=========================================="
echo "  WMS VPS Setup Script"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

echo "📦 Installing system packages..."
apt update && apt upgrade -y
apt install -y curl wget git nginx mysql-server

echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "📦 Installing PM2..."
npm install -g pm2

echo "🔒 Securing MySQL..."
mysql_secure_installation

echo "📊 Creating database..."
read -p "Enter database name [wms_production]: " DB_NAME
DB_NAME=${DB_NAME:-wms_production}

read -p "Enter database user [wms_user]: " DB_USER
DB_USER=${DB_USER:-wms_user}

read -sp "Enter database password: " DB_PASS
echo ""

mysql -u root -p <<MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo "✅ Database created successfully!"

echo "📁 Creating application directory..."
mkdir -p /var/www/wms
chown -R $SUDO_USER:$SUDO_USER /var/www/wms

echo "🔥 Setting up firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo ""
echo "=========================================="
echo "  ✅ VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/www/wms"
echo "2. Run: cd /var/www/wms && bash deploy.sh"
echo ""
echo "Database details:"
echo "  Name: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: ****"
echo ""
