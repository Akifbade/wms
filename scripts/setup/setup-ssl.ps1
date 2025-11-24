# 🔒 Setup SSL Certificate for qgocargo.cloud
# This script will setup Let's Encrypt SSL certificate

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔒 SSL CERTIFICATE SETUP" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$DOMAIN = "qgocargo.cloud"
$EMAIL = "your-email@example.com"  # ⚠️ CHANGE THIS!
$VPS_HOST = "148.230.107.155"

Write-Host "⚠️  Important: Make sure DNS is pointing to VPS!" -ForegroundColor Yellow
Write-Host "Domain: $DOMAIN → $VPS_HOST" -ForegroundColor White
Write-Host ""
Write-Host "Email for SSL certificate: $EMAIL" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue with SSL setup? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📡 Connecting to VPS..." -ForegroundColor Cyan

ssh root@$VPS_HOST @"
set -e
cd '/root/NEW START'

echo ""
echo "================================================"
echo "📦 STEP 1: Install Certbot"
echo "================================================"
dnf install -y certbot python3-certbot-nginx || yum install -y certbot python3-certbot-nginx

echo ""
echo "================================================"
echo "🔒 STEP 2: Get SSL Certificate"
echo "================================================"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

echo ""
echo "================================================"
echo "🔄 STEP 3: Setup Auto-renewal"
echo "================================================"
systemctl enable certbot-renew.timer
systemctl start certbot-renew.timer

echo ""
echo "================================================"
echo "✅ SSL SETUP COMPLETE"
echo "================================================"
echo "🌐 Your site is now available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "🔒 Certificate will auto-renew every 90 days"
echo "================================================"

# Restart nginx
docker exec wms-frontend nginx -s reload
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SSL SETUP COMPLETE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Test your site:" -ForegroundColor Cyan
    Write-Host "   https://$DOMAIN" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ SSL SETUP FAILED!" -ForegroundColor Red
    Write-Host ""
}
