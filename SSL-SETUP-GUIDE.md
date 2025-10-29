# 🔒 SSL Setup Guide for qgocargo.cloud

## Prerequisites

Before setting up SSL, ensure:

1. **DNS Configuration**: Your domain DNS must point to your VPS
   - A record: `qgocargo.cloud` → `148.230.107.155`
   - A record: `www.qgocargo.cloud` → `148.230.107.155`

2. **Firewall**: Ports 80 and 443 must be open
   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

## Quick Setup (Automated)

### On VPS:

```bash
cd '/root/NEW START'

# Make script executable
chmod +x setup-ssl.sh

# Run SSL setup
./setup-ssl.sh
```

This script will:
- ✅ Create certbot directories
- ✅ Start Nginx temporarily
- ✅ Request SSL certificate from Let's Encrypt
- ✅ Configure auto-renewal
- ✅ Restart all services with SSL

## Manual Setup

If you prefer manual control:

### Step 1: Create Directories
```bash
mkdir -p certbot/conf certbot/www
```

### Step 2: Start Services
```bash
docker-compose -f docker-compose.ssl.yml up -d
```

### Step 3: Get SSL Certificate
```bash
docker-compose -f docker-compose.ssl.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@qgocargo.cloud \
  --agree-tos \
  --no-eff-email \
  -d qgocargo.cloud \
  -d www.qgocargo.cloud
```

### Step 4: Restart Services
```bash
docker-compose -f docker-compose.ssl.yml down
docker-compose -f docker-compose.ssl.yml up -d
```

## Verify SSL

After setup, verify your SSL:

```bash
# Test HTTPS connection
curl -I https://qgocargo.cloud

# Check certificate expiry
docker-compose -f docker-compose.ssl.yml exec certbot certbot certificates
```

## Access Your Site

- **Frontend**: https://qgocargo.cloud
- **Backend API**: https://qgocargo.cloud/api
- **Direct Backend**: http://148.230.107.155:5000 (internal only)

## Certificate Renewal

Certificates auto-renew every 12 hours. Manual renewal:

```bash
docker-compose -f docker-compose.ssl.yml exec certbot certbot renew
docker-compose -f docker-compose.ssl.yml exec frontend nginx -s reload
```

## Troubleshooting

### DNS Not Propagated
```bash
# Check DNS
nslookup qgocargo.cloud
dig qgocargo.cloud

# Wait for propagation (can take up to 48 hours)
```

### Port 80 Blocked
```bash
# Check firewall
sudo firewall-cmd --list-all

# Open ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### Certificate Request Failed
```bash
# Check Nginx logs
docker logs wms-frontend

# Check Certbot logs
docker logs wms-certbot

# Test with staging first
docker-compose -f docker-compose.ssl.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@qgocargo.cloud \
  --agree-tos \
  --staging \
  -d qgocargo.cloud
```

## Files Created

- `docker-compose.ssl.yml` - SSL-enabled Docker Compose configuration
- `frontend/Dockerfile.ssl` - Frontend Dockerfile with SSL support
- `frontend/nginx-ssl.conf` - Nginx configuration with SSL
- `setup-ssl.sh` - Automated SSL setup script
- `certbot/conf/` - SSL certificates directory
- `certbot/www/` - ACME challenge directory

## Security Features

- ✅ TLS 1.2 and 1.3
- ✅ Strong cipher suites
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Auto HTTP to HTTPS redirect
- ✅ Security headers
- ✅ Auto certificate renewal

## Next Steps

After SSL is active:

1. Update frontend API base URL to use HTTPS
2. Update CORS settings in backend if needed
3. Test all application features
4. Monitor certificate renewal logs

---

**Note**: First-time setup requires domain DNS to be properly configured and propagated. If DNS is not ready, the certificate request will fail. Wait for DNS propagation and try again.
