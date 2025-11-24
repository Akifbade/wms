#!/bin/bash

# SSL Setup Script for qgocargo.cloud
# This script sets up Let's Encrypt SSL certificates

set -e

DOMAIN="qgocargo.cloud"
EMAIL="admin@qgocargo.cloud"  # Change this to your email
STAGING=0  # Set to 1 for testing, 0 for production

echo "🔒 Setting up SSL for $DOMAIN"

# Create required directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "✅ SSL certificates already exist for $DOMAIN"
    echo "To renew, run: docker-compose -f docker-compose.ssl.yml exec certbot certbot renew"
    exit 0
fi

# Start nginx temporarily for certificate validation
echo "📦 Starting temporary Nginx for certificate validation..."
docker-compose -f docker-compose.ssl.yml up -d frontend

# Wait for nginx to start
sleep 5

# Get SSL certificate
echo "📜 Requesting SSL certificate from Let's Encrypt..."

if [ $STAGING -eq 1 ]; then
    echo "⚠️  Using staging server (for testing)"
    STAGING_FLAG="--staging"
else
    echo "✅ Using production server"
    STAGING_FLAG=""
fi

docker-compose -f docker-compose.ssl.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
    echo "🔄 Restarting services with SSL..."
    docker-compose -f docker-compose.ssl.yml down
    docker-compose -f docker-compose.ssl.yml up -d
    echo ""
    echo "🎉 SSL setup complete!"
    echo "✅ Your site is now accessible at: https://$DOMAIN"
    echo ""
    echo "📝 Certificate will auto-renew every 12 hours"
else
    echo "❌ Failed to obtain SSL certificate"
    echo "Please check:"
    echo "  1. DNS records point to this server (A record for $DOMAIN and www.$DOMAIN)"
    echo "  2. Port 80 is accessible from the internet"
    echo "  3. No firewall blocking port 80"
    exit 1
fi
