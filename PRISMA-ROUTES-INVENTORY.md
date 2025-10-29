# 📋 Prisma Routes Inventory - Parse Port Reference

**Every endpoint below must be rebuilt in Parse.** Use as checklist.

---

## 🔐 AUTH (DONE ✅)
- [x] POST /api/auth/login
- [x] POST /api/auth/register
- [x] GET /api/auth/me
- [x] GET /api/permissions/my-permissions

**Files to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/auth.ts`

---

## 🏭 WAREHOUSE INTAKE (TODO)
- [ ] POST /api/warehouse/intake (CREATE intake shipment)
- [ ] GET /api/warehouse/intake (GET form data: racks, billing settings)

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/warehouse.ts`

**What it does:**
```
Frontend calls: POST /api/warehouse/intake
Backend creates:
  1. Shipment record (status: PENDING)
  2. ShipmentBox records (one per piece count)
  3. Generate QR codes
  4. Return shipment ID + box IDs
```

---

## 📦 SHIPMENTS (PARTIAL)
- [x] GET /api/shipments (list)
- [x] GET /api/shipments/:id (detail)
- [x] POST /api/shipments (create - basic)
- [ ] POST /api/shipments/:id/assign-boxes (CRITICAL)
- [ ] POST /api/shipments/:id/release-boxes (CRITICAL)
- [ ] GET /api/shipments/:id/boxes
- [ ] POST /api/shipments/:id/boxes (add boxes)
- [x] PATCH /api/shipments/:id (update)
- [x] DELETE /api/shipments/:id

**Files to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/shipments.ts`
- `BACKUP-PRISMA-MYSQL/backend/src/lib/shipmentWorkflow.ts`

**What assign-boxes does (MUST REPLICATE EXACTLY):**
```typescript
// Input: { rackId, boxNumbers: [1, 2, 3] }
// 1. Validate rack exists and is ACTIVE
// 2. Check rack capacity (current + requested <= max)
// 3. Update boxes: status=IN_STORAGE, rackId, assignedAt
// 4. Update rack: capacityUsed += boxCount
// 5. Update shipment: if all assigned → status=ACTIVE, else status=PARTIAL
// 6. Log rackActivity
```

---

## 🎯 WORKER DASHBOARD (TODO)
- [ ] GET /api/worker/pending (pending shipments for assignment)
- [ ] GET /api/worker/dashboard (worker stats)
- [ ] POST /api/worker/assign-boxes (batch assignment)

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/worker-dashboard.ts`

---

## 🚚 MOVING JOBS (PARTIAL)
- [x] GET /api/moving-jobs (list)
- [x] GET /api/moving-jobs/:id (detail)
- [x] POST /api/moving-jobs (create)
- [ ] PATCH /api/moving-jobs/:id (update - WITH validation)
- [ ] DELETE /api/moving-jobs/:id
- [ ] GET /api/moving-jobs/:id/materials
- [ ] POST /api/moving-jobs/:id/assign-staff
- [ ] POST /api/job-cost-snapshot (record costs)

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/moving-jobs.ts`

---

## 📊 MATERIALS (PARTIAL)
- [ ] GET /api/materials (list)
- [ ] POST /api/materials (create)
- [ ] GET /api/materials/stock-levels
- [ ] POST /api/materials/issue (withdraw from stock)
- [ ] POST /api/materials/return (return to stock)
- [ ] POST /api/materials/approve (approval workflow)
- [ ] GET /api/materials/batches
- [ ] POST /api/materials/batches
- [ ] GET /api/materials/approvals
- [ ] PATCH /api/materials/approvals/:id

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/materials.ts`

---

## 💰 INVOICES (PARTIAL)
- [x] GET /api/invoices (list)
- [x] GET /api/invoices/:id (detail)
- [ ] POST /api/invoices (create - WITH shipment auto-link)
- [ ] PATCH /api/invoices/:id (update)
- [ ] POST /api/invoices/:id/pay (mark paid)
- [ ] GET /api/invoices/reports/aging
- [ ] GET /api/invoices/reports/summary

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/invoices.ts`

---

## ⚙️ SETTINGS (TODO)
- [ ] GET /api/settings/billing
- [ ] POST /api/settings/billing
- [ ] GET /api/settings/shipments
- [ ] POST /api/settings/shipments
- [ ] GET /api/settings/company
- [ ] POST /api/settings/company
- [ ] GET /api/settings/roles
- [ ] POST /api/settings/roles

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/invoice-settings.ts`
- `BACKUP-PRISMA-MYSQL/backend/src/routes/shipment-settings.ts`

---

## 📁 UPLOADS (DONE ✅)
- [x] POST /api/upload/single
- [x] POST /api/upload/multiple
- [x] POST /api/upload/avatar
- [x] GET /api/upload/job-files/:jobId

**File to reference:**
- `backend/src/routes-parse/upload.ts`

---

## 📈 DASHBOARD (DONE ✅)
- [x] GET /api/dashboard/stats

**File to reference:**
- `backend/src/routes-parse/dashboard.ts`

---

## 📋 REPORTS (TODO)
- [ ] GET /api/reports/revenue-summary
- [ ] GET /api/reports/shipment-aging
- [ ] GET /api/reports/material-usage
- [ ] GET /api/reports/job-costs
- [ ] POST /api/reports/export (CSV/PDF)

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/reports.ts`

---

## 🎁 CUSTOM FIELDS (TODO)
- [ ] GET /api/custom-fields
- [ ] POST /api/custom-fields
- [ ] PATCH /api/custom-fields/:id
- [ ] DELETE /api/custom-fields/:id
- [ ] GET /api/custom-field-values
- [ ] POST /api/custom-field-values

**File to reference:**
- `BACKUP-PRISMA-MYSQL/backend/src/routes/custom-fields.ts`

---

## 📊 SUMMARY

| Category | DONE | TODO | Total |
|----------|------|------|-------|
| Auth | 4 | 0 | 4 |
| Warehouse | 0 | 2 | 2 |
| Shipments | 4 | 4 | 8 |
| Jobs | 3 | 4 | 7 |
| Materials | 0 | 10 | 10 |
| Invoices | 2 | 5 | 7 |
| Settings | 0 | 8 | 8 |
| Uploads | 4 | 0 | 4 |
| Dashboard | 1 | 0 | 1 |
| Reports | 0 | 5 | 5 |
| Custom | 0 | 6 | 6 |
| **TOTAL** | **18** | **44** | **62** |

**Progress: 29% done (18/62 endpoints)**

---

## Build Order (Priority)

1. **CRITICAL (production blocker):**
   - Warehouse intake
   - Assign boxes to rack
   - Pending list
   - Release boxes
   
2. **HIGH (features staff use daily):**
   - Moving jobs (full CRUD + assignments)
   - Material issue/return/approve
   - Invoice creation + payment

3. **MEDIUM (operational):**
   - Reports
   - Settings
   - Custom fields

4. **LOW (nice to have):**
   - Advanced filters
   - Batch operations
   - Analytics

---

## Testing Each Endpoint

**Template (repeat for each endpoint):**

```bash
# 1. Get token
$token = (Invoke-RestMethod -Uri http://localhost:5000/api/auth/login `
  -Method POST -Body (@{email='qa@example.com'; password='StrongPass123'} | ConvertTo-Json) `
  -ContentType application/json).token

# 2. Test endpoint
Invoke-RestMethod -Uri http://localhost:5000/api/... `
  -Headers @{Authorization="Bearer $token"} `
  -Method POST -Body ... -ContentType application/json

# 3. Verify response matches Prisma behavior
```

---

## Git Workflow for Each Endpoint

```bash
# Create endpoint
vim backend/src/routes-parse/warehouse.ts

# Test locally
docker-compose restart backend
# Test with PowerShell/Postman

# If working:
git add backend/src/routes-parse/warehouse.ts
git commit -m "Parse: Add warehouse intake endpoint"

# If broken:
git checkout BACKUP-PRISMA-MYSQL/backend/src/routes/warehouse.ts
# Copy reference code
# Edit Parse version again
# Retry
```

---

**Start with the CRITICAL section. That's what blocks your team from working.**
