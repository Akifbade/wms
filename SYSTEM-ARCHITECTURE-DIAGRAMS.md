# Moving Jobs v2.0 - System Architecture & Diagrams

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MOVING JOBS MANAGEMENT SYSTEM v2.0                   │
├──────────────┬────────────────────────────┬──────────────┬──────────────┤
│  FRONTEND    │      API GATEWAY           │   BACKEND    │   DATABASE   │
│  (React)     │      (Express)             │   (Logic)    │   (SQLite)   │
├──────────────┼────────────────────────────┼──────────────┼──────────────┤
│              │                            │              │              │
│ 1. Jobs UI   │  POST /api/jobs            │ Job Service  │ MovingJob    │
│ 2. Materials │  GET  /api/jobs            │              │ JobTeam      │
│ 3. Reports   │  PUT  /api/jobs/:id        │ Team Service │ Material     │
│ 4. Plugins   │  DEL  /api/jobs/:id        │              │ JobMaterial  │
│              │                            │              │              │
│              │  POST /api/materials       │ Material     │ Material     │
│              │  GET  /api/materials       │ Service      │ Storage      │
│              │  POST /allocate/:jobId     │              │ Purchase     │
│              │                            │              │              │
│              │  POST /materials/returns   │ Return       │ Material     │
│              │  PATCH /returns/:id/approve│ Service      │ Return       │
│              │                            │              │ Approval     │
│              │                            │              │              │
│              │  GET /reports/job-cost     │ Report       │ JobCost      │
│              │  GET /reports/dashboard    │ Service      │ Report       │
│              │  GET /reports/consumption  │              │              │
│              │                            │              │              │
│              │  GET /plugins              │ Plugin       │ Plugin       │
│              │  POST /plugins/install     │ Service      │ Feature      │
│              │  PATCH /plugins/:id/enable │              │ PluginLog    │
│              │  DELETE /plugins/:id       │              │              │
│              │                            │              │              │
└──────────────┴────────────────────────────┴──────────────┴──────────────┘
```

---

## 🔄 Data Flow Diagrams

### Job Creation Flow
```
User Input Form
      ↓
Validation (Zod)
      ↓
Create MovingJob
      ↓
Auto-Generate jobNumber (JOB-001)
      ↓
Save to Database
      ↓
Return Job Details
      ↓
Display in List
```

### Team Assignment Flow
```
Select User & Role
      ↓
Validation (User exists, Role valid)
      ↓
Create JobTeamMember
      ↓
Set Hourly Rate
      ↓
Calculate Total Earnings (0 initially)
      ↓
Save to Database
      ↓
Display in Job Details
```

### Material Allocation Flow
```
Select Material & Quantity
      ↓
Validate Stock Available
      ↓
Check: quantityToAllocate ≤ stock
      ↓
IF YES:
  ├─ Deduct from Stock
  ├─ Create JobMaterial Record
  ├─ Save Unit & Selling Prices
  └─ Display "Allocated"
      ↓
IF NO:
  └─ Show Error "Only X available"
```

### Job Completion & Cost Calculation Flow
```
Mark Job as COMPLETED
      ↓
Retrieve All JobTeamMembers
      ├─ Calculate: hourlyRate × hoursWorked
      └─ Sum all labor costs
      ↓
Retrieve All JobMaterials
      ├─ Calculate: costPerUnit × quantityUsed
      └─ Sum all material costs
      ↓
Add Other Costs (if any)
      ↓
Calculate Total Cost
      ↓
Calculate Profit = Revenue - Total Cost
      ↓
Calculate Margin % = (Profit / Revenue) × 100
      ↓
Create JobCostReport
      ↓
Update MovingJob with costs
      ↓
Display in Dashboard
```

### Material Return & Approval Flow
```
User Records Return/Damage
      ├─ Quantity Returned
      ├─ Quantity Damaged
      ├─ Reason
      └─ Photos (if damaged)
      ↓
Create MaterialReturn (Status: PENDING_APPROVAL)
      ↓
Notify Admin
      ↓
ADMIN APPROVES:
  ├─ Review Details & Photos
  ├─ Add Approval Notes
  ├─ Set Status: APPROVED
  ├─ Restore Stock: material.quantity += returned
  ├─ Update JobMaterial.quantityReturned
  └─ Log Approval
      ↓
RESULT:
  ├─ Stock Restored ✓
  ├─ Cost Adjusted ✓
  └─ Report Updated ✓
```

### Plugin Installation Flow
```
User Submits Install Form
      ├─ Plugin Name
      ├─ Feature Name
      ├─ Description
      └─ Version
      ↓
Validation
      ↓
Create PluginFeature Record
      ├─ companyId (multi-tenant)
      ├─ isActive: false (initially)
      ├─ isCore: false (unless special)
      └─ configData: {}
      ↓
Create Audit Log Entry
      ├─ "Plugin installed by user@company"
      └─ Timestamp
      ↓
Display in Plugin List
      ↓
User Can Enable/Disable/Configure
      ↓
Each Action Creates Audit Log Entry
```

---

## 📊 Database Entity Relationship Diagram

```
┌──────────────────┐
│     Company      │
├──────────────────┤
│ id (PK)          │
│ name             │
│ logo             │
│ settings         │
└────────┬─────────┘
         │ 1:N
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐         ┌──────────────────┐
│      User        │         │  PluginFeature   │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ name             │         │ pluginName       │
│ email            │         │ isActive         │
│ role             │         │ configData (JSON)│
│ hourlyRate       │         │ apiEndpoints     │
└──────┬───────────┘         └────────┬─────────┘
       │ 1:N                         │ 1:N
       │                            ▼
       │                 ┌──────────────────────┐
       │                 │  PluginFeatureLog    │
       │                 ├──────────────────────┤
       │                 │ id (PK)              │
       │                 │ pluginFeatureId (FK) │
       │                 │ action               │
       │                 │ timestamp            │
       │                 │ performedBy (FK)     │
       │                 └──────────────────────┘
       │
       ├────────────────────────────────────────┐
       │                                        │
       │                            ┌───────────────────┐
       │                            │  MaterialApproval │
       │                            ├───────────────────┤
       │        ┌────────────────────│ id (PK)          │
       │        │                    │ approvedBy (FK)  │
       │        │                    │ approvalDate     │
       │        │                    │ approvalNotes    │
       │        │                    └──────┬───────────┘
       │        │                           │ 1:1
       │        │                           │
       ▼        ▼                           │
┌──────────────────────┐                    │
│    MovingJob         │                    │
├──────────────────────┤                    │
│ id (PK)              │                    │
│ jobNumber (UNIQUE)   │                    │
│ title                │                    │
│ jobType              │◄───────────────────┘
│ clientName           │
│ fromAddress          │
│ toAddress            │
│ status               │
│ teamLeaderId (FK)    │
│ estimatedCost        │
│ sellingPrice         │
│ totalProfit          │
│ createdAt            │
└──────┬───────────────┘
       │ 1:N
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  JobTeamMember   │  │   JobMaterial    │  │ JobCostReport    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ id (PK)          │  │ id (PK)          │  │ jobId (FK,UNIQUE)│
│ jobId (FK)       │  │ jobId (FK)       │  │ totalMaterialCost│
│ userId (FK)      │  │ materialId (FK)  │  │ totalLaborCost   │
│ role             │  │ quantityAllocated│  │ totalCost        │
│ hoursWorked      │  │ quantityUsed     │  │ profitLoss       │
│ hourlyRate       │  │ quantityReturned │  │ profitMargin (%) │
│ totalEarnings    │  │ unitPrice        │  │ createdAt        │
│ joinedAt         │  │ sellingPrice     │  └──────────────────┘
│ departedAt       │  │ totalCost        │
└────────┬─────────┘  └──────┬───────────┘
         │                   │ 1:N
         │                   │
         │                   ▼
         │          ┌──────────────────┐
         │          │     Material     │
         │          ├──────────────────┤
         │          │ id (PK)          │
         │          │ code (UNIQUE)    │
         │          │ name             │
         │          │ category         │
         │          │ quantityInStock  │
         │          │ costPerUnit      │
         │          │ sellingPrice     │
         │          │ minStockLevel    │
         │          └────────┬─────────┘
         │                   │ 1:N
         │                   │
         │                   ▼
         │          ┌──────────────────────┐
         │          │MaterialRackStorage   │
         │          ├──────────────────────┤
         │          │ id (PK)              │
         │          │ materialId (FK)      │
         │          │ rackId (FK)          │
         │          │ quantityStored       │
         │          │ dateAdded            │
         │          └──────────────────────┘
         │
         │ Assigns Role: LEAD, DRIVER, LABOR, HELPER, PACKER
         │
         └─ TeamLeader Role in MovingJob

┌──────────────────────┐
│      Rack            │
├──────────────────────┤
│ id (PK)              │
│ name (A1, A2, B1)    │
│ location             │
│ capacity             │
└──────────────────────┘

┌──────────────────────┐
│  MaterialPurchase    │
├──────────────────────┤
│ id (PK)              │
│ materialId (FK)      │
│ vendorName           │
│ quantity             │
│ costPerUnit          │
│ totalCost            │
│ purchaseDate         │
│ receiptNumber        │
└──────────────────────┘

┌──────────────────────┐
│   MaterialReturn     │
├──────────────────────┤
│ id (PK)              │
│ jobId (FK)           │
│ quantityReturned     │
│ quantityDamaged      │
│ returnReason         │
│ damageReason         │
│ damagePhotos (JSON)  │
│ status (PENDING...)  │
│ approvalDate         │
│ approvalNotes        │
└──────────────────────┘
```

---

## 🎯 Component Architecture

### Frontend Component Tree
```
App
├─ Navigation
│  ├─ Link → /moving-jobs
│  ├─ Link → /materials
│  ├─ Link → /reports
│  └─ Link → /plugins
│
├─ Route: /moving-jobs
│  └─ MovingJobsManager
│     ├─ JobList (grid/table)
│     │  └─ JobCard (status, team, materials)
│     ├─ CreateJobForm
│     │  └─ Input fields with validation
│     ├─ JobDetailModal
│     │  ├─ Team Member List
│     │  └─ Material Allocation List
│     └─ DeleteConfirmation
│
├─ Route: /materials
│  └─ MaterialsManager
│     ├─ Summary Cards
│     │  ├─ Total Materials
│     │  ├─ Low Stock Count
│     │  └─ Total Stock Value
│     ├─ MaterialTable
│     │  └─ Material Row (CRUD)
│     ├─ CreateMaterialForm
│     └─ PurchaseForm
│
├─ Route: /reports
│  └─ JobReportsDashboard
│     ├─ DateRangePicker
│     ├─ Summary Cards
│     │  ├─ Total Jobs
│     │  ├─ Total Cost
│     │  ├─ Total Revenue
│     │  └─ Total Profit
│     ├─ ProfitMarginGauge (SVG)
│     ├─ JobTable
│     │  └─ Sortable columns
│     └─ Drill-down Details
│
└─ Route: /plugins
   └─ PluginSystemManager
      ├─ PluginGrid
      │  └─ PluginCard (status, toggle, actions)
      ├─ InstallPluginForm
      ├─ ConfigEditor (JSON)
      ├─ ActivityLog
      └─ PluginLogs
```

---

## 📈 Request/Response Flow

### Create Job Request/Response

**Request:**
```json
{
  "title": "House Packing",
  "jobType": "LOCAL",
  "clientName": "Akif Ahmed",
  "clientPhone": "+966501234567",
  "fromAddress": "Old House, Road 5",
  "toAddress": "New House, Road 10",
  "estimatedCost": 500,
  "sellingPrice": 1000,
  "scheduledDate": "2025-10-25T08:00:00Z",
  "companyId": "company-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-abc123",
    "jobNumber": "JOB-001",
    "title": "House Packing",
    "jobType": "LOCAL",
    "clientName": "Akif Ahmed",
    "status": "SCHEDULED",
    "estimatedCost": 500,
    "sellingPrice": 1000,
    "teamLeaderId": null,
    "createdAt": "2025-10-24T14:30:00Z"
  },
  "message": "Job created successfully"
}
```

### Complete Job Request/Response

**Request:**
```json
{
  "actualEndDate": "2025-10-25T14:30:00Z",
  "notes": "Job completed successfully. All materials returned."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-abc123",
    "jobNumber": "JOB-001",
    "status": "COMPLETED",
    "actualEndDate": "2025-10-25T14:30:00Z",
    "totalProfit": 452.5,
    "costReport": {
      "totalMaterialCost": 217.5,
      "totalLaborCost": 280,
      "otherCosts": 50,
      "totalCost": 547.5,
      "profitLoss": 452.5,
      "profitMargin": 45.25
    }
  },
  "message": "Job completed. Report generated."
}
```

### Get Cost Report Request/Response

**Request:**
```
GET /api/reports/job-cost/job-abc123
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobNumber": "JOB-001",
    "jobTitle": "House Packing",
    "clientName": "Akif Ahmed",
    "jobType": "LOCAL",
    "materials": [
      {
        "name": "Packing Tape",
        "quantityAllocated": 100,
        "quantityUsed": 85,
        "costPerUnit": 0.5,
        "totalCost": 42.5,
        "sellingPrice": 1.0,
        "totalSellingValue": 85
      },
      {
        "name": "Boxes",
        "quantityAllocated": 50,
        "quantityUsed": 40,
        "costPerUnit": 3,
        "totalCost": 120,
        "sellingPrice": 7.5,
        "totalSellingValue": 300
      }
    ],
    "teamMembers": [
      {
        "name": "Ahmad",
        "role": "LABOR",
        "hoursWorked": 8,
        "hourlyRate": 5,
        "totalEarnings": 40
      }
    ],
    "summary": {
      "totalMaterialCost": 217.5,
      "totalMaterialSelling": 435,
      "totalLaborCost": 280,
      "otherCosts": 50,
      "totalCost": 547.5,
      "revenue": 1000,
      "profitLoss": 452.5,
      "profitMargin": 45.25
    }
  }
}
```

---

## 🔐 Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Submit login form
       ↓
┌────────────────────┐
│  Express Server    │
├────────────────────┤
│ Verify credentials │
└────────┬───────────┘
         │ 2. Generate JWT
         ↓
┌──────────────────────────┐
│ JWT Token (exp: 24 hours)│
│ Payload: {userId, role}  │
└────────┬─────────────────┘
         │ 3. Send to browser
         ↓
┌─────────────────────┐
│ Browser Storage     │
│ localStorage[token] │
└────────┬────────────┘
         │ 4. Add to every request header
         ↓
┌──────────────────────────────────────┐
│ Authorization: Bearer eyJhbGc...     │
│ Content-Type: application/json       │
│ GET /api/jobs                        │
└────────┬─────────────────────────────┘
         │ 5. Verify token
         ↓
┌──────────────────┐
│ Middleware Auth  │
│ Decode JWT token │
│ Check expiration │
│ Check user roles │
└────────┬─────────┘
         │ 6. Allow/Deny request
         ↓
┌──────────────────┐
│ Process Request  │
│ Return Response  │
└──────────────────┘
```

---

## 📊 Cost Calculation State Machine

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  DURING JOB EXECUTION                          │
│  ─────────────────────────                     │
│                                                 │
│  Job Status: IN_PROGRESS                       │
│  Material Status: ALLOCATED                    │
│  Cost Status: CALCULATING                      │
│                                                 │
└─────────────────────────────────────────────────┘
                     │
                     │ Mark Complete
                     ↓
┌────────────────────────────────────────┐
│                                        │
│  JOB COMPLETION TRIGGER                │
│  ────────────────────────              │
│                                        │
│  1. Get all JobTeamMembers             │
│  2. Sum: hourlyRate × hoursWorked     │
│  3. Get all JobMaterials               │
│  4. Sum: costPerUnit × quantityUsed   │
│  5. Add other costs                    │
│  6. Calculate total cost               │
│                                        │
└────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────┐
│                                        │
│  CALCULATIONS                          │
│  ────────────                          │
│                                        │
│  Material Cost:   217.5 KWD            │
│  Labor Cost:      280.0 KWD            │
│  Other Costs:     50.0 KWD             │
│  ─────────────────────────             │
│  Total Cost:      547.5 KWD            │
│                                        │
│  Revenue:         1000.0 KWD           │
│  Profit:          452.5 KWD            │
│  Margin %:        45.25%               │
│                                        │
└────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────┐
│                                        │
│  CREATE REPORT                         │
│  ──────────────                        │
│                                        │
│  JobCostReport Created                 │
│  All calculations stored               │
│  Database updated                      │
│  Report available in dashboard         │
│                                        │
└────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────┐
│                                        │
│  JOB COMPLETED                         │
│  ──────────────                        │
│                                        │
│  Status: COMPLETED                     │
│  Cost Report: Available                │
│  Profit: 452.5 KWD                    │
│  Ready for Dashboard View              │
│                                        │
└────────────────────────────────────────┘
```

---

## 🔌 Plugin System Architecture

```
┌──────────────────────────────────────────────────┐
│          CORE SYSTEM (Protected)                 │
│                                                  │
│  - Job Management                               │
│  - Material Tracking                            │
│  - Team Management                              │
│  - Report Generation                            │
│  - Approval Workflow                            │
│                                                  │
│  Cannot be disabled or deleted                  │
└──────────────────────────────────────────────────┘
                        │
                        ↑ Extends
                        │
┌──────────────────────────────────────────────────┐
│            PLUGIN LAYER (Extensible)             │
│                                                  │
│  ┌─ Plugin 1: GPS Tracking                      │
│  │  ├─ Status: ENABLED                          │
│  │  ├─ Config: {api_key: "xxx"}                 │
│  │  └─ Logs: [installed, enabled]               │
│  │                                               │
│  ┌─ Plugin 2: Cloud Storage                     │
│  │  ├─ Status: DISABLED                         │
│  │  ├─ Config: {bucket: "photos"}              │
│  │  └─ Logs: [installed]                        │
│  │                                               │
│  ┌─ Plugin 3: SMS Notifications                 │
│  │  ├─ Status: ENABLED                          │
│  │  ├─ Config: {gateway: "twilio"}             │
│  │  └─ Logs: [installed, enabled, disabled...]  │
│  │                                               │
│  └─ Plugin N: [Custom Feature]                  │
│     ├─ Status: [ENABLED/DISABLED]               │
│     ├─ Config: [JSON settings]                  │
│     └─ Logs: [Audit trail]                      │
│                                                  │
│  Each plugin has:                               │
│  • Independent installation                     │
│  • JSON configuration                           │
│  • Enable/disable toggle                        │
│  • Audit logs                                   │
│  • API endpoints                                │
│  • Permissions                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🌐 Multi-Tenancy Architecture

```
┌──────────────────────────────────────────────────┐
│              SYSTEM DATABASE (SQLite)             │
│                                                  │
│  All tables have companyId field                │
│  Data is filtered by companyId on every query  │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Company: Alpha Movers                      │ │
│  │ companyId: company-001                     │ │
│  │                                             │ │
│  │ ├─ Jobs: [JOB-001, JOB-002, JOB-003]      │ │
│  │ ├─ Materials: [TAPE, BOX, ...]            │ │
│  │ ├─ Users: [Ahmad, Fatima, Omar]           │ │
│  │ ├─ Plugins: [GPS, SMS]                    │ │
│  │ └─ Reports: [Report-1, Report-2]          │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Company: Beta Transport                    │ │
│  │ companyId: company-002                     │ │
│  │                                             │ │
│  │ ├─ Jobs: [JOB-001, JOB-002]               │ │
│  │ ├─ Materials: [CARTONS, FOAM]             │ │
│  │ ├─ Users: [Ali, Zainab]                   │ │
│  │ ├─ Plugins: [Cloud Storage]               │ │
│  │ └─ Reports: [Report-1]                    │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Company: Gamma Logistics                   │ │
│  │ companyId: company-003                     │ │
│  │                                             │ │
│  │ ├─ Jobs: [JOB-001, JOB-002, ..., JOB-100] │ │
│  │ ├─ Materials: [Various]                    │ │
│  │ ├─ Users: [Multiple]                       │ │
│  │ ├─ Plugins: [GPS, SMS, Cloud Storage]     │ │
│  │ └─ Reports: [Multiple]                     │ │
│  │                                             │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Query Example:                                 │
│  SELECT * FROM moving_jobs                     │
│  WHERE companyId = ?                           │
│                                                  │
│  This ensures complete data isolation          │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 📱 Mobile-Friendly Responsive Design

```
┌────────────────┐        ┌─────────────────────────────┐
│   Mobile       │        │      Desktop                │
│  (320px)       │        │  (1024px+)                  │
├────────────────┤        ├─────────────────────────────┤
│ Header         │        │ Header / Nav                │
│ ┌────────────┐ │        │ ┌─────────────────────────┐ │
│ │ ☰ Title   │ │        │ │ Logo  Nav Menu        │ │
│ └────────────┘ │        │ └─────────────────────────┘ │
│                │        │                             │
│ Nav Buttons    │        │ Sidebar / Nav               │
│ ┌────────────┐ │        │ ┌──────────┐               │
│ │ Jobs       │ │        │ │ • Jobs   │ ┌───────────┐│
│ │ Materials  │ │        │ │ • Mater. │ │ Main      ││
│ │ Reports    │ │        │ │ • Report │ │ Content   ││
│ │ Plugins    │ │        │ │ • Plugin │ │ Area      ││
│ └────────────┘ │        │ └──────────┘ └───────────┘│
│                │        │                             │
│ Content        │        │ Multiple Columns            │
│ ┌────────────┐ │        │ ┌──────────┬──────────┐     │
│ │   Card 1   │ │        │ │ Card 1   │ Card 2   │     │
│ ├────────────┤ │        │ ├──────────┼──────────┤     │
│ │   Card 2   │ │        │ │ Card 3   │ Card 4   │     │
│ ├────────────┤ │        │ └──────────┴──────────┘     │
│ │   Card 3   │ │        │ ┌──────────────────────┐    │
│ └────────────┘ │        │ │ Table / Data Grid    │    │
│                │        │ └──────────────────────┘    │
│ Table (Vert)   │        │                             │
│ ┌────────────┐ │        │ Charts & Graphs             │
│ │ Header     │ │        │ ┌──────────────────────┐    │
│ ├────────────┤ │        │ │ ✓ Charts render well │    │
│ │ Row 1      │ │        │ │ ✓ Multiple columns   │    │
│ ├────────────┤ │        │ └──────────────────────┘    │
│ │ Row 2      │ │        │                             │
│ └────────────┘ │        │ Forms fill full width      │
│                │        │                             │
│ Forms          │        │                             │
│ ┌────────────┐ │        │                             │
│ │ Field 1    │ │        │                             │
│ │ Field 2    │ │        │                             │
│ │ Field 3    │ │        │                             │
│ │ [Submit]   │ │        │                             │
│ └────────────┘ │        │                             │
└────────────────┘        └─────────────────────────────┘
```

---

## 🔍 Search & Filter Flow

```
┌─────────────┐
│ User Input  │
└──────┬──────┘
       │ Type search/filter
       ↓
┌─────────────────────────┐
│ Validate Input          │
│ - Check length          │
│ - Sanitize input        │
│ - Prepare query         │
└──────┬──────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Build WHERE Clause       │
│ - Filter by jobType      │
│ - Filter by status       │
│ - Filter by date range   │
│ - Filter by companyId    │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Execute Query            │
│ - Prisma findMany()      │
│ - Apply pagination       │
│ - Order by latest first  │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Format Results           │
│ - Map to UI format       │
│ - Add computed fields    │
│ - Count totals           │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Return to Frontend       │
│ - Send JSON response     │
│ - Include metadata       │
│ - Include pagination     │
└──────────────────────────┘
```

---

**System Architecture Documentation Complete** ✅

All diagrams and flows documented for complete system understanding.
