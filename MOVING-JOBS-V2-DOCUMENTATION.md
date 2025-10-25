# 🚚 Moving Jobs System v2.0 - Complete Documentation

## Overview

A comprehensive warehouse and moving jobs management system built with Node.js/Express, Prisma, and React. This system handles complete job lifecycle management including team assignments, material tracking, cost calculations, and profit/loss reporting.

---

## 📋 Table of Contents

1. [Core Features](#core-features)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Setup Instructions](#setup-instructions)
6. [Usage Guide](#usage-guide)

---

## 🎯 Core Features

### 1. **Moving Jobs Management** ✅
- Create and manage moving jobs with comprehensive details
- Assign team members (labor, driver, team leader, helpers, packers)
- Track job status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- Job numbering system (JOB-001, JOB-002, etc.)
- GPS location tracking for start and end points
- Multi-format job types (LOCAL, INTERNATIONAL, PACKING_ONLY)

### 2. **Material Allocation & Tracking** ✅
- Create material master data (tape, box, bubble wrap, foam, etc.)
- Allocate materials to specific jobs
- Track quantity used vs. allocated
- Inventory management with minimum stock levels
- Rack-based storage system
- Low stock warnings

### 3. **Material Returns & Damage Tracking** ✅
- Record returned materials after job completion
- Document damaged materials with photos
- Separate tracking for returns and damage
- Reason codes for both returns and damage
- Admin approval workflow for returns/damage items

### 4. **Admin Approval Workflow** ✅
- Pending approval list for returns and damage
- Admin can approve or reject with notes
- Picture attachments support for damage documentation
- Automatic stock restoration for approved returns
- Audit trail of all approvals

### 5. **Stock Replenishment** ✅
- Purchase new materials from vendors
- Track vendor information and costs
- Auto-assign materials to racks
- Update stock quantities and cost per unit
- Purchase history and receipt tracking

### 6. **Cost & Profit Reporting** ✅
- **Material Cost Report**: Shows cost per unit × quantity used per job
- **Labor Cost Report**: Shows hourly rate × hours worked per team member
- **Profit/Loss Analysis**: Revenue vs. Total Cost (Material + Labor)
- **Profitability by Job Type**: Compare LOCAL vs INTERNATIONAL vs PACKING_ONLY
- **Material Consumption Report**: Detailed breakdown of material usage
- **Team Performance Report**: Track individual worker productivity

**Key Metrics:**
- Unit Cost × Quantity Used = Total Material Cost
- Selling Price × Quantity Used = Total Selling Value
- Profit = Total Selling Value - Total Material Cost
- Profit Margin = (Profit / Revenue) × 100

### 7. **Plugin Feature System** ✅
- Enable/disable features dynamically without core code changes
- JSON-based configuration system
- Feature versioning and patching
- Activity logs for all plugin changes
- Core features cannot be disabled
- Install/uninstall plugins per company

---

## 🗄️ Database Schema

### Key Tables

#### `moving_jobs`
```sql
- id (Primary Key)
- jobNumber (UNIQUE) - JOB-001, JOB-002
- title, description
- jobType - LOCAL | INTERNATIONAL | PACKING_ONLY
- status - SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
- clientName, clientPhone, clientEmail
- fromAddress, toAddress
- scheduledDate, scheduledTime
- actualStartDate, actualEndDate
- estimatedHours
- teamLeaderId (FK to User)
- estimatedCost, actualCost
- sellingPrice, totalProfit
- gpsStartLocation, gpsEndLocation
- photos (JSON array)
- notes
```

#### `job_team_members`
```sql
- id (Primary Key)
- jobId (FK to MovingJob)
- userId (FK to User)
- role - LEAD | DRIVER | LABOR | HELPER | PACKER
- hoursWorked
- hourlyRate
- totalEarnings
- joinedAt, departedAt
```

#### `materials`
```sql
- id (Primary Key)
- code (UNIQUE per company)
- name - TAPE, BOX, BUBBLE_WRAP, FOAM
- category - PACKING | EQUIPMENT | CONSUMABLE
- unit - PCS | ROLL | SHEET | BOX | KG
- quantityInStock
- costPerUnit
- sellingPrice
- minStockLevel
- lastVendorId
- lastPurchaseDate
```

#### `job_materials`
```sql
- id (Primary Key)
- jobId (FK)
- materialId (FK)
- quantityAllocated
- quantityUsed (default 0)
- quantityReturned (default 0)
- quantityDamaged (default 0)
- unitPrice
- sellingPrice
- totalCost
- totalSellingValue
```

#### `material_returns`
```sql
- id (Primary Key)
- jobId (FK)
- returnedMaterialId (FK)
- damagedMaterialId (FK)
- quantityReturned
- quantityDamaged
- returnReason, damageReason
- damagePhotos (JSON array)
- status - PENDING_APPROVAL | APPROVED | REJECTED
- approvalDate
- approvedBy (FK to User)
- approvalNotes
```

#### `material_rack_storage`
```sql
- id (Primary Key)
- materialId (FK)
- rackId (FK)
- quantityStored
- dateAdded
- batchNumber
- expiryDate
```

#### `job_cost_reports`
```sql
- id (Primary Key)
- jobId (FK, UNIQUE)
- totalMaterialCost
- totalMaterialSelling
- materialProfit
- totalLaborCost
- otherCosts
- totalCost
- estimatedRevenue
- actualRevenue
- profitLoss
- profitMargin (%)
```

#### `plugin_features`
```sql
- id (Primary Key)
- pluginName
- featureName
- description
- version
- isActive (default false)
- isCore (default false)
- configSchema (JSON)
- configData (JSON)
- apiEndpoints (JSON array)
- permissions (JSON array)
- installedAt, enabledAt, disabledAt
```

---

## 🔌 API Endpoints

### **Moving Jobs**

```
POST   /api/jobs                    # Create new job
GET    /api/jobs                    # List jobs (with filters)
GET    /api/jobs/:id                # Get job details
PUT    /api/jobs/:id                # Update job
DELETE /api/jobs/:id                # Delete job
PATCH  /api/jobs/:id/complete       # Complete job & calculate costs

POST   /api/jobs/:id/team-members   # Add team member
DELETE /api/jobs/:jobId/team-members/:memberId # Remove team member
GET    /api/jobs/:id/team-members   # Get team members
PATCH  /api/jobs/:jobId/team-members/:memberId/depart # Mark departure
```

### **Materials**

```
POST   /api/materials               # Create material master
GET    /api/materials               # List all materials
GET    /api/materials/:id           # Get material details
POST   /api/materials/allocate/:jobId # Allocate to job
PATCH  /api/materials/allocate/:allocationId/usage # Update usage
POST   /api/materials/returns/:jobId # Record return/damage
GET    /api/materials/pending-approvals/:companyId # Get pending approvals
PATCH  /api/materials/returns/:returnId/approve # Approve return
POST   /api/materials/purchase      # Purchase stock
GET    /api/materials/reports/stock-summary # Stock report
```

### **Reports**

```
GET    /api/reports/job-cost/:jobId # Job cost breakdown
GET    /api/reports/dashboard/all-jobs # All jobs summary
GET    /api/reports/materials/consumption/:jobId # Material consumption
GET    /api/reports/analysis/by-type # Profit by job type
GET    /api/reports/team/performance # Team performance
```

### **Plugins**

```
GET    /api/plugins                 # List plugins
POST   /api/plugins/install         # Install plugin
PATCH  /api/plugins/:featureId/enable # Enable plugin
PATCH  /api/plugins/:featureId/disable # Disable plugin
PATCH  /api/plugins/:featureId/config # Update config
DELETE /api/plugins/:featureId      # Uninstall plugin
GET    /api/plugins/:featureId      # Get plugin details
GET    /api/plugins/:featureId/logs # Activity logs
GET    /api/plugins/active/by-module/:module # Active plugins
```

---

## 🎨 Frontend Components

### **1. MovingJobsManager.tsx**
- Create, list, filter, update jobs
- View job details
- Team member visualization
- Job status badges

### **2. MaterialsManager.tsx**
- Material master CRUD
- Stock cards showing inventory status
- Low stock warnings
- Purchase tracking
- Material allocation to jobs

### **3. JobReportsDashboard.tsx**
- Cost analysis charts
- Profit/loss calculations
- Material consumption breakdown
- Team performance metrics
- Profitability by job type
- Date range filtering

### **4. PluginSystemManager.tsx**
- Install/uninstall plugins
- Enable/disable features
- Configure plugins with JSON
- Activity audit trails
- Core feature protection

---

## 🚀 Setup Instructions

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Update DATABASE_URL, JWT_SECRET, etc.

# 4. Run database migrations
npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. Start backend
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env.local

# 4. Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

### Full Stack Start

```bash
# From root directory
npm run dev
# Starts both backend and frontend concurrently
```

---

## 📖 Usage Guide

### Creating a Moving Job

1. Go to **Moving Jobs** page
2. Click **نئی نوکری** (New Job)
3. Fill in:
   - Job title
   - Job type (LOCAL/INTERNATIONAL/PACKING_ONLY)
   - Client name & phone
   - From & To addresses
   - Estimated cost & selling price
4. Click **نوکری بنائیں** (Create Job)
5. Job gets auto-numbered (JOB-001, JOB-002, etc.)

### Assigning Team Members

1. Open job details
2. Click **Add Team Member**
3. Select user, role, and hourly rate
4. Roles: LEAD, DRIVER, LABOR, HELPER, PACKER
5. System calculates total earnings

### Allocating Materials

1. Go to **Materials** page
2. First, ensure material exists (create if needed)
3. Go to job details
4. Click **Allocate Material**
5. Select material, quantity, and pricing
6. Stock automatically decreases

### Recording Returns

1. After job completion, go to job details
2. Click **Record Return**
3. Enter quantities for:
   - Returned materials
   - Damaged materials
4. Add photos of damage
5. System creates approval request

### Approving Returns

1. Go to **Material Returns** (admin)
2. View pending approvals
3. Review details and photos
4. Approve (stock restored) or Reject
5. Add approval notes

### Generating Reports

1. Go to **Reports** dashboard
2. Set date range (optional)
3. View:
   - Job cost breakdown
   - Material consumption
   - Profit/Loss analysis
   - Team performance
   - Profitability by type

### Installing Plugins

1. Go to **Plugin System**
2. Click **پلگ ان انسٹال کریں**
3. Enter plugin & feature names
4. Add description
5. Click **انسٹال کریں**
6. Enable/disable as needed
7. Configure with JSON settings

---

## 💰 Cost Calculation Examples

### Example 1: Single Job Material Cost

```
Material: Packing Tape
- Unit Cost: 0.5 KWD
- Selling Price: 1.0 KWD
- Quantity Allocated: 100 rolls
- Quantity Used: 85 rolls
- Quantity Returned: 15 rolls

Calculations:
- Material Cost = 0.5 × 85 = 42.5 KWD
- Material Selling Value = 1.0 × 85 = 85 KWD
- Material Profit = 85 - 42.5 = 42.5 KWD
```

### Example 2: Full Job Economics

```
Job: Akif House Packing

MATERIALS:
- Tape: Cost 42.5 KWD, Selling 85 KWD
- Boxes: Cost 150 KWD, Selling 300 KWD
- Bubble Wrap: Cost 25 KWD, Selling 50 KWD
Total Material: 217.5 KWD cost, 435 KWD selling

LABOR:
- Team Leader (20 hrs @ 5 KWD/hr) = 100 KWD
- Labor (40 hrs @ 3 KWD/hr) = 120 KWD
- Driver (15 hrs @ 4 KWD/hr) = 60 KWD
Total Labor: 280 KWD

OTHER COSTS: 50 KWD (fuel, etc.)

SUMMARY:
- Total Cost = 217.5 + 280 + 50 = 547.5 KWD
- Client Revenue = 1000 KWD
- Profit = 1000 - 547.5 = 452.5 KWD
- Profit Margin = (452.5 / 1000) × 100 = 45.25%
```

---

## 🔐 Permissions

```
ADMIN & MANAGER can:
- Complete jobs
- Approve/reject returns
- Manage all settings
- View all reports

WORKER can:
- View assigned jobs
- Record material usage
- Report damage/returns
- View team performance
```

---

## 🐛 Troubleshooting

### Database Migration Failed
```bash
# Reset database and retry
npx prisma migrate reset
npx prisma migrate dev --name moving_jobs_v2
```

### Port Already in Use
```bash
# Change port in backend/.env
PORT=5001
```

### API Connection Failed
```bash
# Check backend is running
# Update frontend .env with correct API URL
VITE_API_URL=http://your-backend-url/api
```

---

## 📊 Report Examples

All reports are accessible via `/api/reports/` endpoints and displayed in the dashboard with:
- Interactive charts
- Exportable tables
- Date range filtering
- Material-wise breakdown
- Team-wise comparison
- Profit margin visualization

---

## 🎓 Best Practices

1. **Always record material returns immediately** after job completion
2. **Use accurate hourly rates** for labor cost calculation
3. **Attach photos** when reporting damage
4. **Set correct minimum stock levels** to avoid stockouts
5. **Review profit reports** regularly by job type
6. **Test plugins** before enabling in production
7. **Maintain audit trail** of all approvals

---

## 📝 License

This system is proprietary. All rights reserved.

---

## 📞 Support

For issues or feature requests, contact the development team.

**Created**: October 24, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅

---

# مکمل نظام تیار ہے! 🎉

The complete Moving Jobs System v2.0 is now fully operational with:
✅ Backend APIs for all 8 core features
✅ Frontend components for user interface
✅ Database schema with all required tables
✅ Cost calculation and reporting
✅ Plugin system for future extensions
✅ Multi-language support (Urdu)

تمام منتقلی کی نوکریوں کا انتظام کریں اور منافع بڑھائیں!
