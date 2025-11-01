# 🛡️ Staging Deployment Safety Features & Rollback Guide

## Overview

The three-stage deployment workflow now includes **production-grade safety features** for staging deployments:

- ✅ **Pre-deployment Backups** — Automatic backup of current staging frontend/backend before deployment
- ✅ **Automatic Rollback** — On any failure, automatically restore from backup
- ✅ **Health Checks** — Verify frontend (HTTP), backend (API), and HTTPS after deployment
- ✅ **Persistent Backups** — All backups retained for manual recovery
- ✅ **HTTPS Support** — Staging domain with SSL certificate option

---

## What Happens During Staging Deployment

### Stage 1: Pre-Deployment Backups (Automatic)

```
1. Create backup directory: backups/staging-YYYYMMDD-HHMMSS/
2. Backup current staging frontend files
3. Backup current staging backend code
4. Save metadata (commit, actor, timestamp)
```

**Backup Location on VPS:** `/root/NEW START/backups/staging-*`

### Stage 2: Deploy New Code (With Error Handling)

```
1. Deploy frontend dist → wms-staging-frontend
2. Validate nginx syntax (nginx -t)
3. Reload nginx
4. Deploy backend code → wms-staging-backend
5. Install dependencies (npm install)
6. Generate Prisma client
7. Clean failed migrations
8. Run migrations
9. Restart backend
```

**Error Trap:** If ANY step fails, immediately proceed to **Automatic Rollback**

### Stage 3: Health Checks (Comprehensive)

After deployment, 3 automated checks run:

| Check | Endpoint | Expected Result |
|-------|----------|-----------------|
| Frontend HTTP | http://127.0.0.1:8080 | HTTP 200 |
| Backend API | http://127.0.0.1:5001/api/health | HTTP 200 JSON |
| HTTPS (Optional) | Certificate existence check | `/etc/letsencrypt/live/staging.qgocargo.cloud/fullchain.pem` |

**If ANY check fails** → Automatic Rollback executed

### Stage 4: Automatic Rollback (On Failure)

```
1. Stop and restore frontend from backup
2. Reload nginx
3. Stop and restore backend from backup
4. Restart backend
5. Wait 15 seconds for startup
6. Report backup location for manual review
7. Fail the GitHub Actions job (alert user)
```

---

## Monitoring & Troubleshooting

### View Deployment Logs in GitHub Actions

1. Go to: **GitHub → Your Repo → Actions → Three-Stage Deployment**
2. Click the latest workflow run
3. Expand "Deploy to Staging VPS (Full Stack)" step
4. Look for:
   - ✅ Green checkmarks = Success
   - ❌ Red X = Failure (rollback occurred)
   - 🔄 "Rollback complete" = Backup restored

### Find Backup Location

In the GitHub Actions output, look for:

```
✅ Backups created: backups/staging-20251101-143025
```

Or on the VPS:

```bash
ssh root@148.230.107.155
cd "/root/NEW START"
ls -la backups/staging-*
```

### Manual Rollback (If Needed)

If you need to manually revert staging:

```bash
BACKUP_DIR="backups/staging-20251101-143025"  # Replace with actual date

# Restore frontend
docker cp "$BACKUP_DIR/frontend/." wms-staging-frontend:/usr/share/nginx/html/
docker exec wms-staging-frontend nginx -s reload

# Restore backend
docker cp "$BACKUP_DIR/backend/." wms-staging-backend:/app/
docker restart wms-staging-backend
```

---

## Enabling HTTPS for Staging Domain

Once staging deployment is stable, enable HTTPS for `staging.qgocargo.cloud`:

### Option 1: Automatic Setup (Recommended)

**Local machine:**

```powershell
cd "c:\Users\USER\Videos\NEW START"
.\enable-staging-https.ps1
```

**What it does:**
1. Checks if cert exists
2. Issues cert via Let's Encrypt (if needed)
3. Validates nginx config
4. Reloads nginx with HTTPS enabled
5. Verifies HTTPS is working

### Option 2: Manual Setup on VPS

**SSH to VPS:**

```bash
ssh root@148.230.107.155

cd "/root/NEW START"

# Ensure DNS is configured first!
# staging.qgocargo.cloud → 148.230.107.155

# Issue certificate
certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d staging.qgocargo.cloud \
  --email admin@qgocargo.cloud \
  --agree-tos \
  --no-eff-email \
  --non-interactive

# Reload nginx
docker exec wms-frontend nginx -t
docker exec wms-frontend nginx -s reload

# Verify
curl -I https://staging.qgocargo.cloud
```

---

## Verification Checklist

After a staging deployment completes:

### ✅ Basic Checks

```bash
# Frontend is responding
curl -I http://148.230.107.155:8080
# Expected: HTTP/1.1 200 OK

# Backend API is healthy
curl -I http://148.230.107.155:5001/api/health
# Expected: HTTP/1.1 200 OK

# Uploads are accessible
curl -I http://148.230.107.155:8080/uploads/company-logos/company-1761808122145-343818670.png
# Expected: HTTP/1.1 200 OK (or rewrite to correct path)
```

### ✅ Feature Tests

```bash
# Login page loads
curl -s http://148.230.107.155:8080 | grep -i "warehouse\|login" | head -1

# API returns data
curl -s http://148.230.107.155:5001/api/health | jq .

# Database connectivity
curl -s http://148.230.107.155:5001/api/companies | head -c 100
```

### ✅ HTTPS Checks (If Enabled)

```bash
# HTTPS responds
curl -I https://staging.qgocargo.cloud 2>&1 | head -3

# Certificate details
openssl s_client -connect staging.qgocargo.cloud:443 -servername staging.qgocargo.cloud 2>/dev/null | \
  openssl x509 -noout -subject -dates

# Redirect from HTTP to HTTPS (if configured)
curl -I http://staging.qgocargo.cloud 2>&1 | grep -i location
```

---

## Backup Retention Policy

| Type | Location | Retention | Purpose |
|------|----------|-----------|---------|
| Pre-Deploy Backup | `/root/NEW START/backups/staging-*` | Manual cleanup* | Quick rollback |
| Production Backup | `/root/NEW START/backups/production-*` | Manual cleanup* | Recovery |
| Database Dumps | `backups/*/database/` | Weekly cleanup recommended | Data recovery |

**\* Manual cleanup:** Backups don't auto-delete. Periodic cleanup recommended:

```bash
# Remove backups older than 7 days
find /root/NEW\ START/backups -type d -name "staging-*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
```

---

## Troubleshooting Guide

### Deployment Failed - Check These

1. **GitHub Actions Job Output**
   - Look for the specific step that failed
   - Red "❌" marks show where it stopped

2. **SSH to VPS and Check Logs**

```bash
# Frontend logs
docker logs wms-staging-frontend --tail 50

# Backend logs
docker logs wms-staging-backend --tail 50

# Nginx error log inside container
docker exec wms-staging-frontend cat /var/log/nginx/error.log | tail -20
```

3. **Verify Backups Exist**

```bash
ls -lh /root/NEW\ START/backups/staging-*/
```

### Common Failures & Fixes

#### ❌ "Frontend HTTP check failed"

**Cause:** Nginx not serving files or container crashed

**Fix:**

```bash
# Check container status
docker ps | grep staging-frontend

# Restart if needed
docker restart wms-staging-frontend

# Check config
docker exec wms-staging-frontend nginx -t
```

#### ❌ "Backend API health check failed"

**Cause:** Backend crashed, migrations failed, or ports blocked

**Fix:**

```bash
# Check logs
docker logs wms-staging-backend --tail 50

# Verify database connection
docker exec wms-staging-backend \
  mysql -h staging-database -u wms_user -pwmspassword123 warehouse_wms -e "SELECT 1"

# Restart backend
docker restart wms-staging-backend
sleep 20
curl http://127.0.0.1:5001/api/health
```

#### ❌ "Certificate not found for HTTPS"

**Cause:** Cert not yet issued or DNS not configured

**Fix:**

1. Verify DNS: `nslookup staging.qgocargo.cloud`
2. Run: `./enable-staging-https.ps1` from local machine
3. Or manually run certbot on VPS (see "Enabling HTTPS" section above)

---

## GitHub Actions Integration

### Automatic on Every Push

The staging deployment runs automatically when you push to `stable/prisma-mysql-production`:

```
Push → GitHub → Actions → Auto-builds frontend → Auto-deploys to staging
```

### Manual Trigger

To manually deploy to staging:

1. Go to: **GitHub → Actions → Three-Stage Deployment**
2. Click "Run workflow"
3. Select environment: **staging**
4. Click "Run workflow"

---

## Summary: Safety Layers

| Layer | What It Does | Trigger |
|-------|-------------|---------|
| **Backup** | Saves current state before changes | Pre-deployment |
| **Health Check** | Verifies frontend/backend/HTTPS | Post-deployment |
| **Rollback** | Restores from backup if anything fails | Any error |
| **Logging** | Records all actions for audit trail | Every deployment |
| **Retention** | Keeps backups for manual recovery | Until manual cleanup |

---

## Questions?

- **How do I know if deployment succeeded?** → Look for "✅ All health checks passed!" in GitHub Actions
- **Can I rollback manually?** → Yes, see "Manual Rollback" section
- **Will production be affected?** → No, staging is completely isolated
- **Can I enable HTTPS later?** → Yes, use `enable-staging-https.ps1` anytime

---

**Last Updated:** 2025-11-01  
**Status:** ✅ Production-Ready
