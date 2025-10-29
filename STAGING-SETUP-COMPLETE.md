# STAGING ENVIRONMENT SETUP COMPLETE ✅

## Current Status

### Users on Server (148.230.107.155)

| User | Purpose | Access | Location |
|------|---------|--------|----------|
| **root** | Production | Full system access | `/root/NEW START/` |
| **staging** | Staging/Testing | Docker only (ports 8080/8443) | `/home/staging/staging-app/` |

---

## Staging Environment Structure

```
/home/staging/staging-app/
├── backend/              (Same code as production)
├── frontend/             (Same code as production)
├── docker-compose.yml    (Staging-specific config)
└── ...other files

Runs on SEPARATE ports:
- Staging DB: Port 3308 (vs Production: 3307)
- Staging Backend: Port 5001 (vs Production: 5000)
- Staging Frontend: Port 8080/8443 (vs Production: 80/443)
```

---

## Next Steps (After DNS is Added)

### 1. Configure Nginx for staging.qgocargo.cloud

The staging frontend needs to respond to the subdomain. We need an nginx config for staging.

Current config is at: `/root/NEW START/frontend/nginx.conf` (points to localhost)

We need to create a staging-specific nginx.conf that:
- Listens for `staging.qgocargo.cloud`
- Proxies to `staging-backend:5001`

### 2. Once DNS is Ready

```bash
# SSH to VPS as root (to set up DNS initially)
ssh root@148.230.107.155

# Start staging environment (from root)
cd /home/staging/staging-app
docker-compose up -d

# Verify
docker ps | grep staging
```

### 3. Future Deployments to Staging

```bash
# SSH to VPS (any user can do this part)
ssh staging@148.230.107.155

# Navigate to staging
cd ~/staging-app

# Pull latest code from local
# (using scp from development machine)

# Rebuild
docker-compose restart

# Check logs
docker-compose logs -f
```

---

## Safety Architecture

```
┌──────────────────────────────────────────────────┐
│         Server: 148.230.107.155                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ROOT USER                    STAGING USER       │
│  ──────────                   ─────────────      │
│  /root/NEW START/             /home/staging/    │
│  ├── docker-compose.yml       ├── staging-app/  │
│  ├── backend/                 │   ├── docker... │
│  ├── frontend/                │   ├── backend/  │
│  └── (production code)         │   ├── frontend/│
│                               │   └── (staging) │
│  Ports:                        Ports:           │
│  - 80/443 (production)        - 8080/8443      │
│  - 3306 (production DB)       - 3308 (staging) │
│  - 5000 (production API)      - 5001 (staging) │
│                                                  │
│  Can access: EVERYTHING      Can access: ONLY  │
│  Files: PROD                 Files: STAGING    │
│  Ports: ALL                  Ports: 8080/8443 │
└──────────────────────────────────────────────────┘
```

---

## Domains

**After DNS is added:**

| Domain | Points To | User | Purpose |
|--------|-----------|------|---------|
| `qgocargo.cloud` | 148.230.107.155:80/443 | root | Production (Live customers) |
| `staging.qgocargo.cloud` | 148.230.107.155:8080/8443 | staging | Staging (Testing) |

---

## Why This Is Safe

✅ **AI cannot touch production:**
- Even if AI SSH's with wrong IP, staging user can't access root files
- staging user can only run docker-compose on port 8080
- Production runs on port 80/443 (requires root)
- Different database (3308 vs 3306)

✅ **User can easily see difference:**
- Staging: `staging.qgocargo.cloud` (obvious subdomain)
- Production: `qgocargo.cloud` (main domain)

✅ **Physical separation:**
- Two completely separate directories
- Two completely separate users
- Two completely separate docker-compose files
- Two completely separate databases

---

## What's Needed From User

**1. Add DNS A Record (ONE TIME):**
   - Subdomain: `staging`
   - Type: `A`
   - IP: `148.230.107.155`

**That's it!** Once DNS propagates, we can start staging environment.

---

## Verification Commands

```bash
# Check users exist
ssh root@148.230.107.155 "id staging"

# Check staging directory
ssh root@148.230.107.155 "ls -la /home/staging/staging-app/"

# Check DNS (after adding record)
nslookup staging.qgocargo.cloud
# Should show: 148.230.107.155
```

---

**STATUS:** ✅ Ready for DNS setup

**NEXT ACTION:** Add `staging` A record to DNS, then tell me when it's ready.

