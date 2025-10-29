# 🚀 Parse Migration Roadmap - Build It Right

## Strategy
- **Prisma remains untouched** in `BACKUP-PRISMA-MYSQL/` and `stable/prisma-mysql-production` branch
- **Parse development** in `backend/src/routes-parse/` (new Parse endpoints)
- **Can switch anytime:** docker-compose.yml backend service can point to either system
- **No pressure:** Build Parse feature-by-feature, test thoroughly before production switch

---

## Phase 1: CRITICAL WORKFLOWS (Week 1)

### ✅ Already Done
- [x] Auth (login/register/permissions)
- [x] File uploads
- [x] Dashboard stats (with proper stats shape)
- [x] 43 model CRUD endpoints (auto-generated)

### 🔴 URGENT - Must Build (Blocks production)
- [ ] **Warehouse Intake** - `POST /api/warehouse/intake`
  - Create shipment + generate boxes in transaction
  - Reference: `BACKUP-PRISMA-MYSQL/backend/src/routes/warehouse.ts`
  - Must return: shipment ID, box count, QR codes
  
- [ ] **Rack Assignment** - `POST /api/shipments/:id/assign-boxes`
  - Validate rack capacity
  - Update `shipmentBox.status` → `IN_STORAGE`
  - Update `shipment.status` → `ACTIVE` or `PARTIAL`
  - Log `rackActivity`
  - Reference: `BACKUP-PRISMA-MYSQL/backend/src/lib/shipmentWorkflow.ts` (lines 109-190)
  
- [ ] **Pending List** - `GET /api/worker/pending`
  - Filter shipments with `status: PENDING` and `status: PARTIAL`
  - Include box details
  - Reference: `BACKUP-PRISMA-MYSQL/backend/src/routes/worker-dashboard.ts` (lines 10-100)
  
- [ ] **Release Boxes** - `POST /api/shipments/:id/release-boxes`
  - Calculate storage charges
  - Generate invoice automatically
  - Update box/shipment status → `RELEASED`
  - Reference: `BACKUP-PRISMA-MYSQL/backend/src/lib/shipmentWorkflow.ts` (lines 195-220)

---

## Phase 2: MATERIAL WORKFLOWS (Week 2)

- [ ] **Material Issue** - `POST /api/materials/issue`
- [ ] **Material Return** - `POST /api/materials/return`
- [ ] **Material Approval** - `POST /api/materials/approve`
- [ ] **Stock Levels** - `GET /api/materials/stock-levels`

Reference: `BACKUP-PRISMA-MYSQL/backend/src/routes/materials.ts`

---

## Phase 3: MOVING JOBS (Week 3)

- [ ] **Create Job** - `POST /api/moving-jobs` (with team assignment)
- [ ] **Update Job** - `PATCH /api/moving-jobs/:id`
- [ ] **Cost Snapshot** - `POST /api/job-cost-snapshot`
- [ ] **Job Materials** - `GET /api/moving-jobs/:id/materials`

Reference: `BACKUP-PRISMA-MYSQL/backend/src/routes/moving-jobs.ts`

---

## Phase 4: INVOICING & SETTINGS (Week 4)

- [ ] **Invoices** - Full CRUD with payment tracking
- [ ] **Billing Settings** - `GET/POST /api/settings/billing`
- [ ] **Shipment Settings** - `GET/POST /api/settings/shipments`
- [ ] **Permissions** - Proper role checks on all endpoints

---

## Testing Checklist

### Test Sequence (matches production workflow):
```
1. Login as admin/worker
2. Create shipment (intake form)
   ✓ Boxes generated
   ✓ Status = PENDING
3. Scanner page → Assign to rack
   ✓ Pending list loads
   ✓ Capacity validation works
   ✓ Status → IN_STORAGE
4. Release shipment
   ✓ Invoice generated
   ✓ Charges calculated
   ✓ Status → RELEASED
5. Moving job complete
   ✓ Cost snapshot saved
   ✓ Report accessible
```

---

## Fallback Plan

**If Parse breaks production:**
1. Run: `git checkout stable/prisma-mysql-production`
2. Update docker-compose backend to point to `BACKUP-PRISMA-MYSQL/`
3. Restart: `docker-compose up -d`
4. System back online instantly

**Git branches:**
- `feature/parse-migration` ← Current (Parse development)
- `stable/prisma-mysql-production` ← Instant rollback
- `main` ← Keep for releases

---

## How to Verify Each Endpoint

### Template for POST endpoints:
```powershell
$token = "your-jwt-token"
$body = @{
  # payload
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/..." `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -Body $body `
  -ContentType "application/json"
```

### Template for GET endpoints:
```powershell
$token = "your-jwt-token"

Invoke-RestMethod -Uri "http://localhost:5000/api/..." `
  -Headers @{Authorization="Bearer $token"}
```

---

## Current Status

| Phase | Status | ETA |
|-------|--------|-----|
| 1: Critical Workflows | ⏳ Ready to build | ASAP |
| 2: Materials | ⏳ Waiting | +1 week |
| 3: Moving Jobs | ⏳ Waiting | +2 weeks |
| 4: Invoicing | ⏳ Waiting | +3 weeks |

**You control the timeline.** Build as fast or slow as needed—Prisma is always there.
