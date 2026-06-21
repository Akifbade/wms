# WMS Staging Environment — Implementation Plan

> **Goal:** Create a complete staging environment that mirrors production — separate database, separate containers, separate ports. Production ZERO touch.

**Architecture:**

| Layer | Production | Staging |
|---|---|---|
| 📁 Code | `/root/NEW START` | `/root/WMS-STAGING` |
| 🌐 Frontend | `wms-frontend` :3080 | `wms-frontend-staging` :4080 |
| ⚙️ Backend | `wms-backend` :5000 | `wms-backend-staging` :6000 |
| 🗄️ Database | `wms-database` :3307 | `wms-database-staging` :3407 |
| 🌍 Access | `qgocargo.cloud` (SSL) | `qgocargo.cloud:4080` (direct) |
| 🔌 Network | `wms-network` | `wms-staging-network` |
| 🌿 Git Branch | `stable/prisma-mysql-production` | `staging` |

---

## Phase 1: Setup Infrastructure

### Task 1: Create staging directory + copy code
```bash
mkdir -p /root/WMS-STAGING
cd /root/NEW START && git clone . /root/WMS-STAGING
cd /root/WMS-STAGING && git checkout -b staging
```

### Task 2: Create staging .env
Copy production .env → staging .env with different passwords:
- DB_ROOT_PASSWORD → staging_root_pass
- DB_PASSWORD → staging_wms_pass
- DB_NAME → warehouse_wms_staging
- PORT=6000

### Task 3: Create staging docker-compose.yml
Separate compose file with:
- All service names suffixed `-staging`
- All ports offset (+1000 from production)
- External network: `wms-staging-network`

### Task 4: Create docker network
```bash
docker network create wms-staging-network
```

---

## Phase 2: Database Clone

### Task 5: Dump production DB (safe — read only, no production impact)
```bash
docker exec wms-database mysqldump \
  -u wms_user -p<password> \
  --single-transaction --routines --triggers \
  warehouse_wms > /root/prod_dump.sql
```

### Task 6: Start staging DB container
```bash
docker compose -f docker-compose.staging.yml up -d wms-database-staging
```

### Task 7: Restore dump to staging DB
```bash
docker exec -i wms-database-staging mysql \
  -u root -p<staging_root_pass> warehouse_wms_staging < /root/prod_dump.sql
```

### Task 8: Sanitize sensitive data (optional)
- Scramble customer emails/phones
- Remove real payment info
- Keep structure, mock the data

---

## Phase 3: Build & Deploy Staging

### Task 9: Build staging backend + frontend images
```bash
cd /root/WMS-STAGING
docker compose -f docker-compose.staging.yml build
```

### Task 10: Start all staging containers
```bash
docker compose -f docker-compose.staging.yml up -d
```

### Task 11: Verify staging health
```bash
curl http://127.0.0.1:6000/api/health
curl http://127.0.0.1:4080
```

---

## Phase 4: Access & Nginx

### Task 12: Configure nginx for staging
Option A — Port-based (simplest):
```
qgocargo.cloud:4080 → staging frontend
```

Option B — Path-based:
```
qgocargo.cloud/staging → staging frontend (SPA routing tricky)
```

**Recommendation:** Option A — port-based direct access. Baad mein subdomain `staging.qgocargo.cloud` setup kar sakte hain agar domain DNS access ho.

### Task 13: Firewall — open staging port
```bash
ufw allow 4080
```

---

## Phase 5: Workflow Rules

### Task 14: Document staging workflow
- `fix-staging.sh` → quick build + deploy to staging
- `sync-prod-db.sh` → refresh staging DB from production
- `promote-to-prod.sh` → after testing, merge staging → production branch + deploy

---

## Safety Rules (Staging is SAFE to break)

| Rule | Staging | Production |
|---|---|---|
| DB safe to modify? | ✅ Yes | ❌ NEVER |
| Docker safe to restart? | ✅ Yes | ⚠️ Careful |
| Code safe to experiment? | ✅ Yes | ❌ After staging verified |
| Snapshots needed? | Optional | ✅ Mandatory |

---

## Time Estimate

| Phase | Time |
|---|---|
| Phase 1: Setup | 15 min |
| Phase 2: DB Clone | 20 min |
| Phase 3: Build & Deploy | 15 min |
| Phase 4: Access Config | 10 min |
| **Total** | **~1 hour** |
