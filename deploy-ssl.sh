#!/bin/bash

# Quick SSL Deployment for VPS
# Run this on the VPS to set up SSL

set -e

echo "🚀 Deploying SSL for qgocargo.cloud..."

# Pull latest changes
cd '/root/NEW START'
git pull

# Make setup script executable
chmod +x setup-ssl.sh

# First, check DNS
echo "📡 Checking DNS configuration..."
DNS_IP=$(dig +short qgocargo.cloud | head -1)
SERVER_IP=$(curl -s ifconfig.me)

echo "Domain IP: $DNS_IP"
echo "Server IP: $SERVER_IP"

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    echo "⚠️  WARNING: DNS does not point to this server!"
    echo "Please update your DNS A records to point to: $SERVER_IP"
    echo ""
    echo "Required DNS records:"
    echo "  qgocargo.cloud      A    $SERVER_IP"
    echo "  www.qgocargo.cloud  A    $SERVER_IP"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if ports are open
echo "🔍 Checking firewall..."
if command -v firewall-cmd &> /dev/null; then
    echo "Opening ports 80 and 443..."
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

# Run SSL setup
echo "🔒 Running SSL setup..."
./setup-ssl.sh

echo ""
echo "✅ SSL deployment complete!"
echo "🌐 Your site: https://qgocargo.cloud"
