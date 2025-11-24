#!/bin/bash

# SSL Certificate Renewal Script for WMS
# Renews Let's Encrypt SSL certificate and reloads Nginx

echo "🔐 Starting SSL certificate renewal..."

# Navigate to project directory
cd /root/NEW\ START

# Renew certificate
docker compose run --rm certbot renew

# Reload Nginx to apply new certificate
docker compose exec frontend nginx -s reload

echo "✅ SSL certificate renewal complete!"
echo "📅 Next renewal: $(date -d '+60 days' '+%Y-%m-%d')"
