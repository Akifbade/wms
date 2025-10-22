#!/bin/bash

# Automated WMS Deployment Script for Rocky Linux
# This script will install and configure everything automatically

set -e

echo "=========================================="
echo "  WMS Auto-Deployment for Rocky Linux"
echo "=========================================="

# Update system
echo "📦 Step 1/10: Updating system packages..."
dnf update -y

# Install EPEL repository
echo "📦 Step 2/10: Installing EPEL repository..."
dnf install -y epel-release

# Install Node.js 18
echo "📦 Step 3/10: Installing Node.js 18..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs

# Install MySQL 8
echo "📦 Step 4/10: Installing MySQL 8..."
dnf install -y mysql-server mysql

# Start and enable MySQL
systemctl start mysqld
systemctl enable mysqld

# Install Nginx
echo "📦 Step 5/10: Installing Nginx..."
dnf install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
echo "📦 Step 6/10: Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Step 7/10: Installing Git..."
dnf install -y git

# Setup firewall
echo "📦 Step 8/10: Configuring firewall..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=mysql
firewall-cmd --reload

# Create database
echo "📦 Step 9/10: Creating MySQL database..."
DB_NAME="wms_production"
DB_USER="wms_user"
DB_PASS="WMS_SecurePass_2024!"

# Set MySQL root password and create database
mysql -u root <<MYSQL_SCRIPT
ALTER USER 'root'@'localhost' IDENTIFIED BY 'RootPass_2024!';
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

# Create application directory
echo "📦 Step 10/10: Creating application directory..."
mkdir -p /var/www/wms
chmod 755 /var/www/wms

echo ""
echo "=========================================="
echo "  ✅ Server Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Installation Summary:"
echo "  • Node.js: $(node --version)"
echo "  • NPM: $(npm --version)"
echo "  • MySQL: Installed and running"
echo "  • Nginx: Installed and running"
echo "  • PM2: Installed"
echo ""
echo "📝 Database Credentials:"
echo "  • Database: $DB_NAME"
echo "  • User: $DB_USER"
echo "  • Password: $DB_PASS"
echo "  • MySQL Root Password: RootPass_2024!"
echo ""
echo "📁 Application Directory: /var/www/wms"
echo ""
echo "Next: Upload your application files..."
echo ""
