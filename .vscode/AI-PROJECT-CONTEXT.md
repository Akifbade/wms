# 🤖 AI Project Context - WMS (Warehouse Management System)

> **Last Updated**: December 14, 2025
> **Current Version**: v2.2.87
> **Branch**: stable/prisma-mysql-production

---

## 🖥️ VPS Server Details

| Property | Value |
|----------|-------|
| **IP Address** | `148.230.107.155` |
| **Domain** | `qgocargo.cloud` |
| **OS** | Rocky Linux 9.x |
| **SSH User** | `root` |
| **SSH Password** | `Qgocargo@123` |

### How to Connect via PowerShell (plink)

```powershell
# Simple command
plink -batch -pw Qgocargo@123 root@148.230.107.155 "your-command-here"

# Example: Check running containers
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker ps"

# Example: Run SQL query
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -e 'SELECT * FROM packing_materials LIMIT 5;'"
```

---

## 🐳 Docker Containers

| Container Name | Image | Port | Purpose |
|----------------|-------|------|---------|
| `wms-backend` | `wms-backend-fixed` or `ghcr.io/akifbade/wms-backend:latest` | 5000 | Node.js API Server |
| `wms-frontend` | `ghcr.io/akifbade/wms-frontend:latest` | 80, 443 | Nginx serving React app |
| `wms-database` | `mysql:8.0` | 3307 (host) → 3306 (container) | MySQL Database |

### Docker Network
- **Network Name**: `wms-network`
- All containers are connected to this bridge network

### Common Docker Commands

```bash
# Check container status
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'

# View backend logs
docker logs wms-backend --tail 50

# Restart backend
docker restart wms-backend

# Rebuild backend from source
cd "/root/NEW START/backend"
docker build -t wms-backend-fixed .
docker stop wms-backend && docker rm wms-backend
docker run -d --name wms-backend \
  --network wms-network \
  -e NODE_ENV=production \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@wms-database:3306/warehouse_wms' \
  -e JWT_SECRET='your-production-jwt-secret-here' \
  -e PORT=5000 \
  -p 5000:5000 \
  -v '/root/NEW START/backend/uploads:/app/uploads' \
  --restart always \
  wms-backend-fixed

# Execute command inside container
docker exec wms-backend ls /app
docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -e "SHOW TABLES;"
```

---

## 🗄️ Database Details

| Property | Value |
|----------|-------|
| **Type** | MySQL 8.0 |
| **Database Name** | `warehouse_wms` |
| **User** | `wms_user` |
| **Password** | `wmspassword123` |
| **Root Password** | `rootpassword123` |
| **Host (from container)** | `wms-database:3306` |
| **Host (from VPS)** | `localhost:3307` |

### Run SQL Queries

```powershell
# From PowerShell (via plink)
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -N -B -e 'SELECT name, totalQuantity FROM packing_materials;'"

# Upload and run SQL file
pscp -batch -pw Qgocargo@123 "fix.sql" root@148.230.107.155:/tmp/
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker exec -i wms-database mysql -u wms_user -pwmspassword123 warehouse_wms < /tmp/fix.sql"
```

### Key Tables
- `packing_materials` - Material inventory
- `material_issues` - Materials issued to jobs
- `material_returns` - Materials returned from jobs
- `shipments` - Shipment records
- `racks` - Warehouse rack locations
- `moving_jobs` - Moving job records
- `users` - User accounts

---

## 🔀 Git & GitHub

| Property | Value |
|----------|-------|
| **Repository** | `https://github.com/Akifbade/wms` |
| **Branch** | `stable/prisma-mysql-production` |
| **GitHub Actions** | Auto-deploys on push |

### Git Commands

```powershell
# Check status
git status

# Commit and push (triggers auto-deploy)
git add -A
git commit --no-verify -m "v2.2.87: Your commit message"
git push origin stable/prisma-mysql-production

# Watch deployment progress
# Open: https://github.com/Akifbade/wms/actions
```

### GitHub Actions Workflow
- **File**: `.github/workflows/cloud-build-deploy.yml`
- **Process**:
  1. Builds backend Docker image
  2. Builds frontend Docker image
  3. Saves images as tar.gz
  4. SCPs to VPS
  5. Runs `vps-deploy.sh` script

---

## 📁 Complete Project Structure (A to Z)

```
NEW START/
│
├── .github/
│   └── workflows/
│       └── cloud-build-deploy.yml    # GitHub Actions CI/CD
│
├── .husky/
│   ├── post-commit                   # Git hooks
│   ├── post-commit.ps1
│   └── pre-build
│
├── .vscode/
│   ├── AI-PROJECT-CONTEXT.md         # THIS FILE - AI reference
│   ├── ai-instructions.json          # AI settings
│   ├── auto-version-and-commit.ps1   # Version bump script
│   ├── auto-version.ps1              # Version script
│   ├── DEPLOY-TO-PRODUCTION.ps1      # Production deploy
│   ├── DEPLOY-TO-PRODUCTION-V2.ps1   # Deploy V2
│   ├── ROLLBACK-PRODUCTION.ps1       # Rollback script
│   ├── launch.json                   # VS Code debug config
│   ├── mcp.json                      # MCP config
│   ├── settings.json                 # VS Code settings
│   ├── sftp.json                     # SFTP config
│   └── tasks.json                    # VS Code tasks
│
├── backend/                          # 🔧 NODE.JS BACKEND
│   ├── prisma/
│   │   ├── migrations/               # Database migrations
│   │   │   ├── 20251105063900_add_custom_shipment_charges/
│   │   │   ├── 20251212100000_add_material_approval_email_tracking/
│   │   │   └── migration_lock.toml
│   │   ├── seeds/
│   │   │   ├── fleet-simple.seed.ts
│   │   │   └── fleet.seed.ts
│   │   ├── schema.prisma             # ⭐ DATABASE SCHEMA
│   │   ├── schema-backup.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── version.ts            # ⭐ BACKEND VERSION
│   │   ├── cron/
│   │   │   └── notificationJobs.ts   # Scheduled jobs
│   │   ├── db/
│   │   │   └── prisma.ts             # Prisma client
│   │   ├── lib/
│   │   │   ├── materialWorkflow.ts
│   │   │   ├── shipmentWorkflow.ts
│   │   │   └── validation.ts
│   │   ├── middleware/
│   │   │   ├── activityTracker.ts
│   │   │   ├── auth.ts               # JWT auth middleware
│   │   │   ├── check-permission.ts   # Permission checker
│   │   │   └── permissions.ts
│   │   ├── models/
│   │   │   ├── Company.ts
│   │   │   ├── Rack.ts
│   │   │   └── User.ts
│   │   ├── routes/                   # ⭐ API ENDPOINTS
│   │   │   ├── auth.ts               # Login/logout
│   │   │   ├── backups.ts            # Backup endpoints
│   │   │   ├── billing.ts            # Billing system
│   │   │   ├── categories.ts         # Category CRUD
│   │   │   ├── companies.ts          # Company management
│   │   │   ├── consumables.ts        # Consumables
│   │   │   ├── contracts.ts          # Contracts
│   │   │   ├── custom-fields.ts      # Custom fields
│   │   │   ├── customer-materials.ts # Customer materials
│   │   │   ├── dashboard.ts          # Dashboard stats
│   │   │   ├── email.ts              # Email endpoints
│   │   │   ├── expenses.ts           # Expense tracking
│   │   │   ├── finance.ts            # Finance reports
│   │   │   ├── materials.ts          # ⭐ Material management
│   │   │   ├── mobile-upload.ts      # Mobile photo upload
│   │   │   ├── moving-jobs.ts        # ⭐ Moving jobs
│   │   │   ├── permissions.ts        # Permission management
│   │   │   ├── racks.ts              # ⭐ Rack management
│   │   │   ├── reports.ts            # Reports
│   │   │   ├── shipment-items.ts     # Shipment items
│   │   │   ├── shipments.ts          # ⭐ Shipment management
│   │   │   ├── system.ts             # System settings
│   │   │   ├── templates.ts          # Email templates
│   │   │   ├── upload.ts             # File uploads
│   │   │   ├── users.ts              # User management
│   │   │   ├── warehouse.ts          # Warehouse ops
│   │   │   └── worker-dashboard.ts   # Worker dashboard
│   │   ├── services/
│   │   │   ├── emailService.ts       # Email sending
│   │   │   └── userActivityTracker.ts
│   │   ├── shared/
│   │   │   └── constants.ts
│   │   ├── types/                    # TypeScript types
│   │   ├── utils/
│   │   │   ├── auditLog.ts
│   │   │   ├── chargeCalculation.ts
│   │   │   ├── rackCapacity.ts
│   │   │   └── warehouseUtils.ts
│   │   └── index.ts                  # ⭐ APP ENTRY POINT
│   │
│   ├── scripts/
│   │   ├── approvals-report.ts
│   │   ├── job-return-summary.ts
│   │   └── restock-pending-returns.ts
│   │
│   ├── uploads/                      # Uploaded files (mounted volume)
│   ├── __tests__/                    # Backend tests
│   │
│   ├── Dockerfile                    # Backend Docker build
│   ├── Dockerfile.dev                # Dev Docker build
│   ├── package.json                  # NPM dependencies
│   ├── tsconfig.json                 # TypeScript config
│   └── .env                          # Environment vars
│
├── frontend/                         # 🎨 REACT FRONTEND
│   ├── public/
│   │   ├── icons/
│   │   │   └── icon-144.svg
│   │   ├── version.json              # Version JSON (auto-generated)
│   │   ├── manifest.json
│   │   ├── sw.js                     # Service worker
│   │   └── index.html
│   │
│   ├── scripts/
│   │   └── generate-version-json.js  # Version generator
│   │
│   ├── src/
│   │   ├── components/               # ⭐ REUSABLE COMPONENTS
│   │   │   ├── Layout/               # Layout components
│   │   │   ├── moving-jobs/          # Moving job components
│   │   │   ├── reports/              # Report components
│   │   │   ├── warehouse/            # Warehouse components
│   │   │   ├── BoxQRModal.tsx        # Box QR code modal
│   │   │   ├── BulkAddRackModal.tsx  # Bulk add racks
│   │   │   ├── CategoryManagement.tsx
│   │   │   ├── ConfirmDialog.tsx     # Confirmation dialog
│   │   │   ├── CreateExpenseModal.tsx
│   │   │   ├── CreateMovingJobModal.tsx
│   │   │   ├── CreateRackModal.tsx   # Create rack modal
│   │   │   ├── CreateShipmentModal.tsx
│   │   │   ├── CustomChargesModal.tsx
│   │   │   ├── EditExpenseModal.tsx
│   │   │   ├── EditMovingJobModal.tsx
│   │   │   ├── EditRackModal.tsx     # ⭐ Edit rack (CBM)
│   │   │   ├── EditShipmentModal.tsx
│   │   │   ├── GlobalErrorBoundary.tsx
│   │   │   ├── LiveChargesPreview.tsx
│   │   │   ├── MaterialReturnModal.tsx
│   │   │   ├── MaterialTransactionHistory.tsx
│   │   │   ├── PaymentBeforeReleaseModal.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RackMapModal.tsx
│   │   │   ├── RecordPaymentModal.tsx
│   │   │   ├── ReleaseNoteModal.tsx
│   │   │   ├── ReleaseShipmentModal.tsx
│   │   │   ├── ShipmentDetailModal.tsx
│   │   │   ├── ShipmentPhoto.tsx
│   │   │   ├── ShipmentsPrintReport.tsx
│   │   │   ├── StaffAssignmentDialog.tsx
│   │   │   ├── VersionBadge.tsx
│   │   │   ├── VersionBadgeHeader.tsx
│   │   │   ├── WHMShipmentModal.tsx
│   │   │   └── WithdrawalModal.tsx
│   │   │
│   │   ├── config/
│   │   │   └── version.ts            # ⭐ FRONTEND VERSION
│   │   │
│   │   ├── contexts/
│   │   │   └── PermissionContext.tsx # Permission context
│   │   │
│   │   ├── pages/                    # ⭐ PAGE COMPONENTS
│   │   │   ├── Admin/                # Admin pages
│   │   │   ├── Analytics/            # Analytics pages
│   │   │   ├── BackupManagement/     # Backup management
│   │   │   ├── Companies/            # Company pages
│   │   │   ├── CompanyProfile/       # Company profile
│   │   │   ├── Dashboard/            # Dashboard page
│   │   │   ├── Expenses/             # Expense pages
│   │   │   ├── Finance/              # Finance pages
│   │   │   ├── Invoices/             # Invoice pages
│   │   │   ├── Landing/              # Landing page
│   │   │   ├── Login/                # Login page
│   │   │   ├── Materials/            # ⭐ Material pages
│   │   │   │   ├── MaterialReports.tsx  # Material reports
│   │   │   │   └── ...
│   │   │   ├── MobileUpload/         # Mobile upload
│   │   │   ├── MovingJobs/           # Moving jobs page
│   │   │   ├── Profile/              # User profile
│   │   │   ├── Racks/                # Rack management
│   │   │   ├── Scanner/              # QR Scanner
│   │   │   ├── Settings/             # Settings pages
│   │   │   ├── ShipmentReport/       # Shipment reports
│   │   │   ├── Shipments/            # Shipment pages
│   │   │   ├── CustomerMaterials.tsx
│   │   │   ├── DebugLogin.tsx
│   │   │   └── WorkerDashboard.tsx
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                # ⭐ API CLIENT
│   │   │
│   │   ├── theme/
│   │   │   └── theme.ts              # MUI theme
│   │   │
│   │   ├── utils/
│   │   │   ├── inputHelpers.ts
│   │   │   ├── numberInput.ts
│   │   │   └── pdfGenerator.ts       # PDF generation
│   │   │
│   │   ├── App.tsx                   # ⭐ MAIN APP COMPONENT
│   │   ├── App.css
│   │   ├── index.tsx                 # Entry point
│   │   └── index.css
│   │
│   ├── dist/                         # Built files (production)
│   │
│   ├── Dockerfile                    # Frontend Docker build
│   ├── Dockerfile.dev
│   ├── Dockerfile.ssl
│   ├── docker-entrypoint.sh
│   ├── nginx.conf                    # Nginx config
│   ├── nginx-ssl.conf                # SSL Nginx config
│   ├── package.json                  # NPM dependencies
│   ├── vite.config.ts                # Vite config
│   ├── tailwind.config.js            # Tailwind CSS
│   ├── tsconfig.json                 # TypeScript config
│   └── index.html
│
├── config/                           # Configuration files
│   ├── nginx-ssl.conf
│   ├── nginx-wms.conf
│   ├── qgocargo-cloud.conf           # Domain nginx config
│   └── ...
│
├── database/                         # Database scripts
│   ├── add-billing-column.sql
│   ├── add-rack-fields.sql
│   ├── create-admin.sql
│   ├── fix-material-issues.sql
│   └── ... (many SQL files)
│
├── docs/                             # Documentation
│   ├── 00-README-START-HERE.md
│   ├── 3-STAGE-DEPLOYMENT-SAFETY.md
│   ├── ADMIN-QUICK-START-GUIDE.md
│   ├── AI-CONTEXT.md
│   ├── AUTO-VERSION-SETUP-COMPLETE.md
│   ├── BILLING-SYSTEM-COMPLETE-FIX.md
│   ├── CI-CD-COMPLETE-SETUP.md
│   ├── DOCKER-QUICK-START.md
│   ├── LOGIN-CUSTOMIZATION-GUIDE.md
│   ├── QR-CODES-QUICK-REFERENCE.md
│   ├── THREE-STAGE-DEPLOYMENT-GUIDE.md
│   ├── VERSION-TRACKING-GUIDE.md
│   └── ... (many docs)
│
├── scripts/                          # Utility scripts
│   ├── backup/
│   │   ├── auto-backup-system.ps1
│   │   ├── backup-manager.sh
│   │   ├── restore-backup.ps1
│   │   └── ...
│   ├── deploy/
│   │   ├── deploy-production-direct.ps1
│   │   ├── deploy-to-vps.sh
│   │   ├── deploy.ps1
│   │   ├── promote-staging-to-production.ps1
│   │   └── ...
│   ├── maintenance/
│   │   ├── auto-backup.ps1
│   │   ├── check-vps-health.ps1
│   │   ├── emergency-rollback.ps1
│   │   ├── fix-production-backend.ps1
│   │   ├── quick-commit.ps1
│   │   ├── verify-production.ps1
│   │   └── ...
│   ├── setup/
│   │   ├── setup-auto-backup.sh
│   │   ├── setup-ssl.ps1
│   │   ├── vps-setup.sh
│   │   └── ...
│   ├── START-ALL.bat
│   ├── STOP-ALL.bat
│   └── ...
│
├── tests/                            # Test files
│   ├── test-login.js
│   ├── test-prisma.js
│   └── ...
│
├── vps-backups/                      # VPS backup files
│
├── docker-compose.yml                # ⭐ LOCAL DOCKER COMPOSE
├── docker-compose.production.yml     # Production compose
├── docker-compose.staging.yml        # Staging compose
├── docker-compose.ssl.yml            # SSL compose
├── docker-compose.dev.yml            # Dev compose
│
├── .env                              # Environment variables
├── .env.docker                       # Docker env
├── .env.local                        # Local env
├── .dockerignore
├── .gitignore
│
├── package.json                      # Root package.json
├── README.md                         # Project readme
├── VERSION.md                        # ⭐ VERSION HISTORY
│
└── vps-deploy.sh                     # VPS deployment script
```

### Key Files Quick Reference

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Backend entry point |
| `backend/src/routes/*.ts` | API endpoints |
| `backend/prisma/schema.prisma` | Database schema |
| `backend/src/config/version.ts` | Backend version |
| `frontend/src/App.tsx` | Main React component |
| `frontend/src/pages/*` | Page components |
| `frontend/src/components/*` | Reusable components |
| `frontend/src/config/version.ts` | Frontend version |
| `frontend/src/services/api.ts` | API client |
| `docker-compose.yml` | Local Docker setup |
| `VERSION.md` | Version changelog |
| `.github/workflows/cloud-build-deploy.yml` | CI/CD pipeline |

---

## 🎯 Active Modals Reference (Currently Used)

> ⚠️ **IMPORTANT**: Some modal files exist but are NOT used. Below is the ACTUAL usage map.

### Shipment Modals

| Modal Name | File | Purpose | Used Where | Status |
|------------|------|---------|------------|--------|
| **WHMShipmentModal** | `WHMShipmentModal.tsx` | ⭐ **NEW SHIPMENT INTAKE** (simplified UI, no pallet QR) | `Shipments.tsx` | ✅ ACTIVE |
| **CreateShipmentModal** | `CreateShipmentModal.tsx` | Old shipment creation modal | ❌ NOT USED | ⛔ LEGACY |
| **EditShipmentModal** | `EditShipmentModal.tsx` | Edit existing shipment details | `Shipments.tsx` | ✅ ACTIVE |
| **ShipmentDetailModal** | `ShipmentDetailModal.tsx` | View shipment details (read-only) | `Shipments.tsx`, `Scanner.tsx` | ✅ ACTIVE |

### Release Workflow Modals (3-Step Chain)

```
User clicks "Release" button
        ↓
┌─────────────────────────────────────┐
│  1. WithdrawalModal                 │  ← Opens first, select boxes to release
│     (WithdrawalModal.tsx)           │
└─────────────────────────────────────┘
        ↓ (when clicking Confirm)
┌─────────────────────────────────────┐
│  2. PaymentBeforeReleaseModal       │  ← Invoice & payment collection
│     (PaymentBeforeReleaseModal.tsx) │     Shows charges, editable invoice
└─────────────────────────────────────┘
        ↓ (on successful release)
        Done!
```

| Modal Name | File | Purpose | Status |
|------------|------|---------|--------|
| **WithdrawalModal** | `WithdrawalModal.tsx` | ⭐ **RELEASE STEP 1**: Select boxes to withdraw | ✅ ACTIVE |
| **PaymentBeforeReleaseModal** | `PaymentBeforeReleaseModal.tsx` | ⭐ **RELEASE STEP 2**: Payment & invoice before release | ✅ ACTIVE |
| **ReleaseShipmentModal** | `ReleaseShipmentModal.tsx` | Old release modal | ❌ NOT USED | ⛔ LEGACY |

### Moving Job Modals

| Modal Name | File | Purpose | Used Where | Status |
|------------|------|---------|------------|--------|
| **CreateMovingJobModal** | `CreateMovingJobModal.tsx` | Create new moving job | `MovingJobs.tsx` | ✅ ACTIVE |
| **EditMovingJobModal** | `EditMovingJobModal.tsx` | Edit job + has material return inside | `MovingJobs.tsx` | ✅ ACTIVE |
| **MaterialReturnModal** | `MaterialReturnModal.tsx` | Return materials from job | `MovingJobs.tsx`, inside `EditMovingJobModal` | ✅ ACTIVE |

### Rack Modals

| Modal Name | File | Purpose | Used Where | Status |
|------------|------|---------|------------|--------|
| **CreateRackModal** | `CreateRackModal.tsx` | Create single rack | `Racks.tsx` | ✅ ACTIVE |
| **EditRackModal** | `EditRackModal.tsx` | ⭐ Edit rack (incl. individual CBM capacity) | `Racks.tsx` | ✅ ACTIVE |
| **BulkAddRackModal** | `BulkAddRackModal.tsx` | Bulk add multiple racks at once | `Racks.tsx` | ✅ ACTIVE |
| **RackMapModal** | `RackMapModal.tsx` | Visual rack selection map | `CreateShipmentModal`, `EditShipmentModal` | ✅ ACTIVE |

### Material Modals

| Modal Name | File | Purpose | Used Where | Status |
|------------|------|---------|------------|--------|
| **MaterialReturnModal** | `MaterialReturnModal.tsx` | Return materials from job | `MovingJobs.tsx`, `EditMovingJobModal` | ✅ ACTIVE |
| **MaterialTransactionHistory** | `MaterialTransactionHistory.tsx` | View material transaction history | `MaterialsManagement.tsx` | ✅ ACTIVE |

### Other Modals

| Modal Name | File | Purpose | Used Where | Status |
|------------|------|---------|------------|--------|
| **BoxQRModal** | `BoxQRModal.tsx` | Generate/print box QR codes | `Shipments.tsx` | ✅ ACTIVE |
| **ConfirmDialog** | `ConfirmDialog.tsx` | Generic confirmation dialog | Multiple pages | ✅ ACTIVE |
| **RecordPaymentModal** | `RecordPaymentModal.tsx` | Record payment against shipment | `Shipments.tsx` | ✅ ACTIVE |
| **ReleaseNoteModal** | `ReleaseNoteModal.tsx` | View/print release note | After release | ✅ ACTIVE |
| **CustomChargesModal** | `CustomChargesModal.tsx` | Add custom charges to shipment | `EditShipmentModal` | ✅ ACTIVE |
| **LiveChargesPreview** | `LiveChargesPreview.tsx` | Preview live charges calculation | Various | ✅ ACTIVE |
| **CreateExpenseModal** | `CreateExpenseModal.tsx` | Create expense entry | `Expenses.tsx` | ✅ ACTIVE |
| **EditExpenseModal** | `EditExpenseModal.tsx` | Edit expense entry | `Expenses.tsx` | ✅ ACTIVE |

### Legacy/Unused Modals (DO NOT USE)

| Modal Name | File | Why Not Used |
|------------|------|--------------|
| **CreateShipmentModal** | `CreateShipmentModal.tsx` | Replaced by WHMShipmentModal |
| **ReleaseShipmentModal** | `ReleaseShipmentModal.tsx` | Replaced by WithdrawalModal → PaymentBeforeReleaseModal chain |

### Quick Reference for Common Tasks

| Task | Modal to Use |
|------|--------------|
| **New shipment intake** | `WHMShipmentModal` |
| **Edit shipment** | `EditShipmentModal` |
| **View shipment details** | `ShipmentDetailModal` |
| **Release shipment** | `WithdrawalModal` → `PaymentBeforeReleaseModal` |
| **Print box QR codes** | `BoxQRModal` |
| **Create job** | `CreateMovingJobModal` |
| **Edit job / Return materials** | `EditMovingJobModal` (has MaterialReturnModal inside) |
| **Add rack** | `CreateRackModal` or `BulkAddRackModal` |
| **Edit rack / Set CBM** | `EditRackModal` |
| **Select rack visually** | `RackMapModal` |

---

## 🔧 Version Management

### Version Files (All must be in sync)
1. `VERSION.md` - Version history
2. `frontend/src/config/version.ts` - Frontend version
3. `backend/src/config/version.ts` - Backend version
4. `frontend/public/version.json` - Generated on build

### Check Current Version

```powershell
# Backend API
curl https://qgocargo.cloud/api/health

# Frontend version.json
curl https://qgocargo.cloud/version.json
```

---

## 🚀 Deployment Methods

### Method 1: Git Push (Recommended - Auto Deploy)

```powershell
cd "c:\Users\USER\Videos\NEW START"
git add -A
git commit --no-verify -m "v2.2.XX: Your changes"
git push origin stable/prisma-mysql-production
# Watch: https://github.com/Akifbade/wms/actions
```

### Method 2: Manual Frontend Deploy

```powershell
# Build frontend
cd "c:\Users\USER\Videos\NEW START\frontend"
npm run build

# Create tar and upload
cd dist
tar -czf ../dist.tar.gz *
pscp -batch -pw Qgocargo@123 "../dist.tar.gz" root@148.230.107.155:/tmp/

# Deploy on VPS
plink -batch -pw Qgocargo@123 root@148.230.107.155 "cd /tmp && mkdir -p dist && cd dist && tar -xzf ../dist.tar.gz && docker cp . wms-frontend:/usr/share/nginx/html/ && docker exec wms-frontend nginx -s reload"
```

### Method 3: Manual Backend Deploy

```powershell
# On VPS via plink
plink -batch -pw Qgocargo@123 root@148.230.107.155 "cd '/root/NEW START' && git pull origin stable/prisma-mysql-production && docker stop wms-backend && docker rm wms-backend && cd backend && docker build -t wms-backend-fixed . && docker run -d --name wms-backend --network wms-network -e NODE_ENV=production -e DATABASE_URL='mysql://wms_user:wmspassword123@wms-database:3306/warehouse_wms' -e JWT_SECRET='your-production-jwt-secret-here' -e PORT=5000 -p 5000:5000 -v '/root/NEW START/backend/uploads:/app/uploads' --restart always wms-backend-fixed"
```

---

## 🔍 Debugging Tips

### Check Backend Health
```powershell
plink -batch -pw Qgocargo@123 root@148.230.107.155 "curl -s http://localhost:5000/api/health"
```

### Check Backend Logs
```powershell
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker logs wms-backend --tail 50"
```

### Check Container Network
```powershell
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker network inspect wms-network --format '{{range .Containers}}{{.Name}} {{end}}'"
```

### Test Frontend to Backend Connection
```powershell
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker exec wms-frontend wget -q -O- http://wms-backend:5000/api/health"
```

---

## 📝 Common Fixes

### Fix: Material Balance Wrong
```sql
-- Recalculate material totalQuantity
UPDATE packing_materials 
SET totalQuantity = (
  (SELECT COALESCE(SUM(quantityPurchased), 0) FROM stock_batches WHERE materialId = 'MATERIAL_ID')
  + (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi JOIN purchase_orders po ON poi.purchaseOrderId = po.id WHERE poi.materialId = 'MATERIAL_ID' AND po.status = 'RECEIVED')
  - (SELECT COALESCE(SUM(quantity), 0) FROM material_issues WHERE materialId = 'MATERIAL_ID')
  + (SELECT COALESCE(SUM(quantityGood), 0) FROM material_returns WHERE materialId = 'MATERIAL_ID' AND restocked = 1)
)
WHERE id = 'MATERIAL_ID';
```

### Fix: Shipments Stuck in Wrong Status
```sql
UPDATE shipments SET status = 'IN_WAREHOUSE' WHERE status = 'IN_STORAGE';
```

### Fix: Old Returns Not Restocked
```sql
UPDATE material_returns SET restocked = 1 WHERE restocked = 0;
```

---

## 🌐 URLs

| Environment | Frontend | Backend Health |
|-------------|----------|----------------|
| **Production** | https://qgocargo.cloud | https://qgocargo.cloud/api/health |
| **Localhost** | http://localhost | http://localhost:5000/api/health |

---

## 📞 Quick Reference

```
VPS IP:        148.230.107.155
VPS User:      root
VPS Password:  Qgocargo@123
Domain:        qgocargo.cloud

DB Name:       warehouse_wms
DB User:       wms_user
DB Password:   wmspassword123

Git Branch:    stable/prisma-mysql-production
GitHub:        https://github.com/Akifbade/wms
Actions:       https://github.com/Akifbade/wms/actions
```
