# WMS and Fleet Separation - Complete Guide

**Date:** January 1, 2026  
**Purpose:** Completely isolate WMS (qgocargo.cloud) and Fleet (track.qgocargo.cloud) to prevent interference

---

## 🎯 Problem Before

- Both WMS and Fleet were trying to use ports 80/443
- wms-frontend container was listening on 80/443 for ALL traffic
- Host nginx couldn't serve track.qgocargo.cloud properly
- SSL certificate confusion - track was serving qgocargo.cloud's certificate
- Changes to one system would break the other

---

## ✅ Solution - Complete Separation

### Architecture Now

```
                    HOST NGINX (Ports 80/443)
                           |
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
   WMS (qgocargo.cloud)              Fleet (track.qgocargo.cloud)
        |                                     |
   Port 3080 (Internal)                 Port 1337 (Parse)
        |                                     |
   wms-frontend container              parse-server-fleet
   wms-backend:5000                    mongodb-fleet
   wms-database:3307                   Static files in /var/www/
```

---

## 📝 Changes Made

### 1. WMS Frontend Container - Changed Port Binding
**Before:**
```bash
docker run -d --name wms-frontend \
  -p 80:80 -p 443:443 \     # ❌ Blocked all traffic
  ...
```

**After:**
```bash
docker run -d --name wms-frontend \
  -p 3080:80 \               # ✅ Internal port only
  --network wms-network \
  -v '/root/NEW START/frontend/nginx-http-only.conf:/etc/nginx/conf.d/default.conf:ro' \
  --restart always \
  ghcr.io/akifbade/wms-frontend:latest
```

### 2. WMS Container Nginx Config - HTTP Only
**File:** `/root/NEW START/frontend/nginx-http-only.conf`

```nginx
# Simple HTTP-only config - SSL handled by host nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # React routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend container
    location /api {
        proxy_pass http://wms-backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploads proxy
    location /uploads {
        proxy_pass http://wms-backend:5000/uploads;
    }
}
```

### 3. Host Nginx - Separate Config Files

#### WMS Config
**File:** `/etc/nginx/conf.d/wms.conf`

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name qgocargo.cloud www.qgocargo.cloud;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    http2 on;
    server_name qgocargo.cloud www.qgocargo.cloud;
    
    # WMS-specific SSL certificate
    ssl_certificate /etc/letsencrypt/live/qgocargo.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qgocargo.cloud/privkey.pem;
    
    # Proxy to WMS frontend container
    location / {
        proxy_pass http://127.0.0.1:3080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API proxy to backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_read_timeout 300s;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://127.0.0.1:5000/uploads;
    }
}
```

#### Fleet Config
**File:** `/etc/nginx/conf.d/fleet.conf`

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name track.qgocargo.cloud;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    http2 on;
    server_name track.qgocargo.cloud;
    
    # Fleet static files
    root /var/www/track.qgocargo.cloud;
    index index.html;
    
    # Fleet-specific SSL certificate (DIFFERENT from WMS!)
    ssl_certificate /etc/letsencrypt/live/track.qgocargo.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/track.qgocargo.cloud/privkey.pem;
    
    # Parse Server API
    location ^~ /parse/ {
        proxy_pass http://127.0.0.1:1337/parse/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 300s;
    }
    
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:1337;
        proxy_connect_timeout 300s;
    }
    
    # APK download
    location ^~ /app-debug.apk {
        alias /var/www/track.qgocargo.cloud/app-debug.apk;
        add_header Content-Type application/vnd.android.package-archive;
    }
    
    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Firewall Configuration
```bash
# Open HTTP and HTTPS ports
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

---

## 🔑 Key Points

### Separate SSL Certificates
- **WMS:** `/etc/letsencrypt/live/qgocargo.cloud/`
- **Fleet:** `/etc/letsencrypt/live/track.qgocargo.cloud/`

### Separate Ports
- **Host nginx:** 80, 443 (public)
- **WMS frontend:** 3080 (internal only)
- **WMS backend:** 5000 (internal only)
- **Parse Server:** 1337 (internal only)

### Separate Config Files
- **WMS:** `/etc/nginx/conf.d/wms.conf`
- **Fleet:** `/etc/nginx/conf.d/fleet.conf`
- **Removed:** `/etc/nginx/conf.d/track.conf` (old combined config)

### Separate Docker Networks
- **WMS:** `wms-network` (wms-frontend, wms-backend, wms-database)
- **Fleet:** Default bridge (parse-server-fleet, mongodb-fleet, parse-dashboard-fleet)

---

## 🚀 Deployment Commands

### Deploy WMS Changes (from Git)
```bash
# Automatic via GitHub Actions when pushing to stable/prisma-mysql-production
git add -A
git commit -m "feat: Your WMS changes"
git push origin stable/prisma-mysql-production
```

### Deploy Fleet Changes (Manual)
```bash
# SSH to VPS
ssh root@148.230.107.155

# Update fleet files
cd /var/www/track.qgocargo.cloud
# ... make your changes ...

# Restart Parse Server (if needed)
docker restart parse-server-fleet

# Reload nginx (if config changed)
nginx -t && systemctl reload nginx
```

---

## ⚠️ Important Rules

### For WMS Team:
1. ❌ DO NOT touch `/etc/nginx/conf.d/fleet.conf`
2. ❌ DO NOT modify Parse Server containers
3. ❌ DO NOT use ports 1337, 4040, 27017
4. ✅ Only edit `/etc/nginx/conf.d/wms.conf` if needed
5. ✅ WMS containers use `wms-network`

### For Fleet Team:
1. ❌ DO NOT touch `/etc/nginx/conf.d/wms.conf`
2. ❌ DO NOT modify WMS containers (wms-frontend, wms-backend, wms-database)
3. ❌ DO NOT use ports 3080, 5000, 3307
4. ✅ Only edit `/etc/nginx/conf.d/fleet.conf` if needed
5. ✅ Fleet containers use default bridge network

---

## 🔍 Verification Commands

```bash
# Check both sites
curl -s -o /dev/null -w "WMS: %{http_code}\n" https://qgocargo.cloud
curl -s -o /dev/null -w "Fleet: %{http_code}\n" https://track.qgocargo.cloud

# Verify SSL certificates
echo | openssl s_client -connect qgocargo.cloud:443 -servername qgocargo.cloud 2>/dev/null | grep subject
echo | openssl s_client -connect track.qgocargo.cloud:443 -servername track.qgocargo.cloud 2>/dev/null | grep subject

# Check containers
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Check nginx configs
ls -la /etc/nginx/conf.d/
nginx -t
```

---

## 📦 Container List

### WMS Containers
- `wms-frontend` - Port 3080 (internal)
- `wms-backend` - Port 5000 (internal)
- `wms-database` - Port 3307 (host), 3306 (internal)

### Fleet Containers
- `parse-server-fleet` - Port 1337
- `parse-dashboard-fleet` - Port 4040
- `mongodb-fleet` - Port 27017 (internal only)

---

## ✅ Results

- ✅ Both sites work independently
- ✅ Correct SSL certificates for each domain
- ✅ No port conflicts
- ✅ Changes to WMS don't affect Fleet
- ✅ Changes to Fleet don't affect WMS
- ✅ Clean separation of concerns

---

**Last Updated:** January 1, 2026  
**Tested:** Both sites responding with correct SSL certificates
