# DNS SETUP - PHYSICAL SEPARATION

## Current Setup (PROBLEM):
```
qgocargo.cloud → 148.230.107.155 (STAGING and PRODUCTION mixed!)
```

## New Setup (SOLUTION):

**DNS Changes Needed (in your domain registrar):**

```
Record Type: A
Name: staging
Value: 148.230.107.155
TTL: 3600

Result: staging.qgocargo.cloud → 148.230.107.155 (STAGING ONLY)
```

**Keep production as is:**
```
Record Type: A
Name: @ (root)
Value: 148.230.107.155
TTL: 3600

Result: qgocargo.cloud → 148.230.107.155 (PRODUCTION ONLY)
```

---

## Current Architecture (What We're Creating):

```
┌─────────────────────────────────────────────────────┐
│         Server IP: 148.230.107.155                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐      ┌──────────────────┐   │
│  │  PRODUCTION      │      │  STAGING         │   │
│  │ qgocargo.cloud   │      │staging.qgocargo. │   │
│  │                  │      │cloud             │   │
│  ├──────────────────┤      ├──────────────────┤   │
│  │ Port 80/443      │      │ Port 8080/8443   │   │
│  │ Nginx            │      │ Nginx            │   │
│  │ (qgocargo.cloud) │      │(staging subdomain)   │
│  └────────┬─────────┘      └──────────┬───────┘   │
│           │                           │            │
│  ┌────────▼─────────┐      ┌──────────▼───────┐   │
│  │ Backend 5000     │      │ Backend 5001     │   │
│  │ Database 3306    │      │ Database 3308    │   │
│  │ (root user)      │      │ (staging user)   │   │
│  └──────────────────┘      └──────────────────┘   │
│                                                     │
│  Permissions:                                      │
│  - root: Full access (PRODUCTION)                  │
│  - staging: Limited to port 8080/8443 only        │
│             Cannot touch port 80/443              │
│             Cannot access production database     │
│             Cannot access root files              │
└─────────────────────────────────────────────────────┘
```

---

## Steps:

### 1. Add DNS A Record for Staging
**In your domain registrar (Namecheap, GoDaddy, CloudFlare, etc):**

- Subdomain: `staging`
- Type: `A`
- Value: `148.230.107.155`
- TTL: `3600` (default)

**Result:** `staging.qgocargo.cloud` resolves to `148.230.107.155`

### 2. Verify DNS is Updated
```bash
nslookup staging.qgocargo.cloud
# Should show: 148.230.107.155
```

### 3. Deploy Staging Environment
```bash
# Copy staging docker-compose to VPS
scp STAGING-docker-compose.yml staging@148.230.107.155:~/docker-compose.yml

# SSH as staging user (NOT root!)
ssh staging@148.230.107.155

# Navigate to project
cd ~/NEW\ START/

# Start staging containers (limited permissions - can only touch 8080/8443)
sudo docker-compose up -d
```

### 4. Configure Nginx for Staging Subdomain
The staging frontend needs nginx config for `staging.qgocargo.cloud`

---

## Why This Works:

✅ **Production (qgocargo.cloud):**
- Port 80/443 (standard HTTPS)
- Runs as `root` user
- Full access
- **Customers use this**

❌ **AI cannot touch it:**
- `staging` user has no permission to port 80/443
- `staging` user cannot run `docker-compose down` on production
- Different database (3308 vs 3306)
- Physically separated config

✅ **Staging (staging.qgocargo.cloud):**
- Port 8080/8443
- Runs as `staging` user
- Limited permissions
- **AI safely deploys here**

❌ **User/AI cannot confuse them:**
- Different domains (obvious difference)
- Different ports (8080 vs 80)
- Different users (staging vs root)

---

## Next Steps:

1. **Add DNS A record** for `staging` → `148.230.107.155`
2. **Wait 5-30 minutes** for DNS to propagate
3. **Test:** `nslookup staging.qgocargo.cloud`
4. **Tell me when DNS is ready** and I'll deploy staging environment

---

## Safety Guarantee:

After this setup:
- Even if AI makes a mistake, it can only affect staging (port 8080)
- Production (port 80/443) requires ROOT access AI doesn't have
- Physical separation via users = IMPOSSIBLE to mix them up

