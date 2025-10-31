# 🔒 SSL/HTTPS Setup Guide for Production

## Overview

**Goal**: Enable HTTPS on `https://qgocargo.cloud`

**Current Status**: HTTP only (port 80)
**Target Status**: HTTPS (port 443) + HTTP redirect

---

## Prerequisites

✅ Domain pointing to server: `qgocargo.cloud → 148.230.107.155`
✅ Port 80 open (for Let's Encrypt verification)
✅ Port 443 open (for HTTPS traffic)

---

## Method 1: Automated SSL with Certbot (Recommended)

### Step 1: Install Certbot on VPS

```bash
ssh root@148.230.107.155

# Install certbot and nginx plugin
dnf install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### Step 2: Stop Nginx Container (Temporarily)

```bash
cd '/root/NEW START'

# Stop frontend to free port 80
docker stop wms-frontend
```

### Step 3: Get SSL Certificate

```bash
# Get certificate for your domain
certbot certonly --standalone \
  -d qgocargo.cloud \
  -d www.qgocargo.cloud \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Certificates will be saved to:
# /etc/letsencrypt/live/qgocargo.cloud/fullchain.pem
# /etc/letsencrypt/live/qgocargo.cloud/privkey.pem
```

### Step 4: Update Docker Compose for SSL

Create/Update `docker-compose.yml`:

```yaml
services:
  frontend:
    image: newstart-frontend
    container_name: wms-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"  # Add HTTPS port
    volumes:
      # Mount SSL certificates
      - /etc/letsencrypt/live/qgocargo.cloud/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
      - /etc/letsencrypt/live/qgocargo.cloud/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
      - /etc/letsencrypt/options-ssl-nginx.conf:/etc/nginx/ssl/options-ssl-nginx.conf:ro
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Step 5: Update Nginx Configuration

SSH to server and edit frontend nginx config:

```bash
cd '/root/NEW START/frontend'

# Create SSL nginx config
cat > nginx-ssl.conf << 'NGINX_CONFIG'
server {
    listen 80;
    server_name qgocargo.cloud www.qgocargo.cloud;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qgocargo.cloud www.qgocargo.cloud;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    include /etc/nginx/ssl/options-ssl-nginx.conf;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # React Router Support
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX_CONFIG
```

### Step 6: Update Frontend Dockerfile

Edit `frontend/Dockerfile`:

```dockerfile
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy nginx configuration
COPY nginx-ssl.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY dist/ /usr/share/nginx/html/

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Step 7: Download SSL Options

```bash
# Download recommended SSL configuration
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > /etc/letsencrypt/options-ssl-nginx.conf
```

### Step 8: Rebuild and Restart

```bash
cd '/root/NEW START'

# Rebuild frontend with SSL config
docker-compose build --no-cache frontend

# Start with new configuration
docker-compose up -d frontend

# Check logs
docker logs wms-frontend --tail 50
```

### Step 9: Test SSL

```bash
# Test HTTPS
curl -I https://qgocargo.cloud

# Test HTTP redirect
curl -I http://qgocargo.cloud

# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=qgocargo.cloud
```

### Step 10: Setup Auto-Renewal

```bash
# Create renewal script
cat > /root/renew-ssl.sh << 'SCRIPT'
#!/bin/bash
certbot renew --quiet --deploy-hook "docker exec wms-frontend nginx -s reload"
SCRIPT

chmod +x /root/renew-ssl.sh

# Add to crontab (runs daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/renew-ssl.sh") | crontab -
```

---

## Method 2: Manual SSL with Docker (Alternative)

### Using Docker Certbot Container

```bash
cd '/root/NEW START'

# Run certbot in Docker
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d qgocargo.cloud \
  -d www.qgocargo.cloud \
  --email your-email@example.com \
  --agree-tos
```

---

## Staging → Production SSL Promotion

### Important: SSL Certificates are NOT Copied

**SSL certificates live on the HOST, not in containers!**

When you promote staging → production:
- ✅ Frontend code is copied
- ✅ Backend code is copied
- ❌ SSL certificates are NOT copied (they're mounted from host)

### Why This is Good:

1. **SSL certificates are host-level** (in `/etc/letsencrypt/`)
2. **Same certificates used** for both staging and production
3. **No need to copy** - just mount the same path
4. **Auto-renewal works** for all containers

### Staging with SSL (Optional):

If you want staging on HTTPS too:

```bash
# Get certificate for staging subdomain
certbot certonly --standalone \
  -d staging.qgocargo.cloud \
  --email your-email@example.com \
  --agree-tos
```

Then mount in `docker-compose.yml`:

```yaml
staging-frontend:
  ports:
    - "8080:80"
    - "8443:443"
  volumes:
    - /etc/letsencrypt/live/staging.qgocargo.cloud/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
    - /etc/letsencrypt/live/staging.qgocargo.cloud/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```

---

## Update GitHub Actions for SSL

The workflow doesn't need changes because:
1. SSL certificates are on the host
2. Docker Compose mounts them automatically
3. Frontend/Backend promotion still works

**Just ensure** `docker-compose.yml` has SSL mounts configured.

---

## Verification Checklist

After SSL setup:

- [ ] `https://qgocargo.cloud` works
- [ ] `http://qgocargo.cloud` redirects to HTTPS
- [ ] No certificate errors in browser
- [ ] Green padlock shows in browser
- [ ] Backend API works: `https://qgocargo.cloud/api/health`
- [ ] Auto-renewal cron job setup
- [ ] Staging → Production promotion still works

---

## Troubleshooting

### Certificate Not Found
```bash
# Check certificate exists
ls -la /etc/letsencrypt/live/qgocargo.cloud/

# Check container has access
docker exec wms-frontend ls -la /etc/nginx/ssl/
```

### Nginx Error: SSL Certificate
```bash
# Check nginx config syntax
docker exec wms-frontend nginx -t

# Check logs
docker logs wms-frontend --tail 100
```

### Port 443 Not Open
```bash
# Check firewall
firewall-cmd --list-ports

# Open port 443
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

### Certificate Renewal Failed
```bash
# Test renewal
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal
```

---

## Quick Setup Script

Save as `setup-ssl.sh`:

```bash
#!/bin/bash
set -e

echo "🔒 Starting SSL Setup..."

# Stop frontend
docker stop wms-frontend

# Get certificate
certbot certonly --standalone \
  -d qgocargo.cloud \
  -d www.qgocargo.cloud \
  --email akif@qgocargo.cloud \
  --agree-tos \
  --non-interactive

# Download SSL options
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > /etc/letsencrypt/options-ssl-nginx.conf

# Update nginx config (copy nginx-ssl.conf to frontend/nginx.conf)
cp /root/NEW\ START/frontend/nginx-ssl.conf /root/NEW\ START/frontend/nginx.conf

# Rebuild frontend
cd '/root/NEW START'
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Setup auto-renewal
cat > /root/renew-ssl.sh << 'SCRIPT'
#!/bin/bash
certbot renew --quiet --deploy-hook "docker exec wms-frontend nginx -s reload"
SCRIPT
chmod +x /root/renew-ssl.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /root/renew-ssl.sh") | crontab -

echo "✅ SSL Setup Complete!"
echo "🌐 Visit: https://qgocargo.cloud"
```

Run it:
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh
```

---

## Summary

### To Enable SSL:
1. Install certbot on VPS
2. Get Let's Encrypt certificate
3. Update nginx config for HTTPS
4. Mount certificates in docker-compose.yml
5. Rebuild frontend container
6. Setup auto-renewal cron

### Staging → Production:
- SSL certificates are on HOST
- Not copied between containers
- Same certificates used by both
- No workflow changes needed

### Auto-Renewal:
- Certbot auto-renews every 60 days
- Cron job checks daily
- Nginx reloads automatically

---

**Ready to enable SSL?** Run the setup script above! 🔒
