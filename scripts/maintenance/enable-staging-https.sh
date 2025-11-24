#!/bin/bash

# ============================================================================
# Enable HTTPS for staging.qgocargo.cloud
# ============================================================================
# Run this on the VPS after the HTTPS nginx config is deployed.
# This script:
# 1. Checks if staging cert already exists
# 2. Issues cert via certbot webroot (using existing Let's Encrypt setup)
# 3. Validates nginx config
# 4. Reloads nginx to activate HTTPS

set -e

VPS_PATH="/root/NEW START"
CERT_DIR="/etc/letsencrypt/live/staging.qgocargo.cloud"
STAGING_DOMAIN="staging.qgocargo.cloud"
EMAIL="admin@qgocargo.cloud"

echo "============================================================================"
echo "🔐 ENABLING HTTPS FOR STAGING DOMAIN"
echo "============================================================================"

# Step 1: Check if cert already exists
echo ""
echo "1️⃣  Checking certificate status..."
if [ -f "$CERT_DIR/fullchain.pem" ]; then
  echo "✅ Certificate already exists for $STAGING_DOMAIN"
  CERT_EXPIRES=$(openssl x509 -enddate -noout -in "$CERT_DIR/cert.pem" | cut -d= -f2)
  echo "   Expires: $CERT_EXPIRES"
else
  echo "ℹ️  Certificate not found - will issue new one"
  
  # Step 2: Verify DNS is pointing to this IP
  echo ""
  echo "2️⃣  Verifying DNS resolution..."
  if nslookup $STAGING_DOMAIN > /dev/null 2>&1; then
    echo "✅ DNS resolves for $STAGING_DOMAIN"
  else
    echo "⚠️  WARNING: DNS may not be configured yet"
    echo "   Please ensure: $STAGING_DOMAIN → 148.230.107.155"
    read -p "   Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Aborted"
      exit 1
    fi
  fi
  
  # Step 3: Issue certificate via certbot webroot
  echo ""
  echo "3️⃣  Issuing certificate via Let's Encrypt (webroot method)..."
  
  # Ensure webroot exists
  mkdir -p /var/www/certbot
  
  echo "   Running certbot (this may take 30 seconds)..."
  certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d $STAGING_DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    2>&1 | grep -E "(Congratulations|existing certificate|Renewal)" || true
  
  if [ -f "$CERT_DIR/fullchain.pem" ]; then
    echo "✅ Certificate issued successfully!"
  else
    echo "❌ Certificate issuance failed"
    exit 1
  fi
fi

# Step 4: Validate nginx config
echo ""
echo "4️⃣  Validating nginx configuration..."
if docker exec wms-frontend nginx -t 2>&1 | grep -q "successful"; then
  echo "✅ Nginx config is valid"
else
  echo "❌ Nginx config validation failed!"
  docker exec wms-frontend nginx -t
  exit 1
fi

# Step 5: Reload nginx
echo ""
echo "5️⃣  Reloading nginx..."
docker exec wms-frontend nginx -s reload
echo "✅ Nginx reloaded"

# Step 6: Verify HTTPS is working
echo ""
echo "6️⃣  Verifying HTTPS is accessible..."
sleep 2

# Try from host curl (if available)
if command -v curl &> /dev/null; then
  if curl -f https://127.0.0.1 -k 2>&1 | head -1 | grep -q "200\|301\|302"; then
    echo "✅ HTTPS is responding"
  else
    echo "⚠️  Warning: HTTPS check had issues (may be DNS or firewall)"
  fi
fi

echo ""
echo "============================================================================"
echo "✅ STAGING HTTPS SETUP COMPLETE"
echo "============================================================================"
echo ""
echo "🌐 Access URLs:"
echo "   HTTP:  http://$STAGING_DOMAIN:8080"
echo "   HTTPS: https://$STAGING_DOMAIN"
echo ""
echo "📋 Next Steps:"
echo "   1. Test in browser: https://$STAGING_DOMAIN"
echo "   2. Verify SSL certificate (should show green lock)"
echo "   3. Check that uploads and API work over HTTPS"
echo ""
echo "🔄 Auto-Renewal:"
echo "   Certbot will auto-renew 30 days before expiry"
echo "   Check status: sudo certbot certificates"
echo ""
echo "============================================================================"
