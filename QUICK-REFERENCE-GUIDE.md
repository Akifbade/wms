# ⚡ Moving Jobs v2.0 - Quick Reference Guide

## 🚀 Quick Start (Copy-Paste Ready)

### Start Development Servers

```bash
# Terminal 1 - Backend (Port 5000)
cd backend && npm run dev

# Terminal 2 - Frontend (Port 3000)
cd frontend && npm run dev
```

### URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

---

## 📝 API Endpoints at a Glance

### Jobs
```bash
GET    /api/jobs                          # List all jobs
POST   /api/jobs                          # Create new job
GET    /api/jobs/:id                      # Get job details
PUT    /api/jobs/:id                      # Update job
DELETE /api/jobs/:id                      # Delete job
PATCH  /api/jobs/:id/complete             # Complete & calculate costs
POST   /api/jobs/:id/team-members         # Add team member
DELETE /api/jobs/:jobId/team-members/:memberId  # Remove team member
```

### Materials
```bash
GET    /api/materials                     # List materials
POST   /api/materials                     # Create material
POST   /api/materials/allocate/:jobId     # Allocate to job
PATCH  /api/materials/allocate/:id/usage  # Update usage
POST   /api/materials/returns/:jobId      # Record return/damage
GET    /api/materials/pending-approvals   # Get pending approvals
PATCH  /api/materials/returns/:id/approve # Approve return
POST   /api/materials/purchase            # Purchase stock
```

### Reports
```bash
GET    /api/reports/job-cost/:jobId       # Job cost breakdown
GET    /api/reports/dashboard/all-jobs    # All jobs summary
GET    /api/reports/materials/consumption/:jobId
GET    /api/reports/analysis/by-type      # Profitability by type
GET    /api/reports/team/performance      # Team metrics
```

### Plugins
```bash
GET    /api/plugins                       # List plugins
POST   /api/plugins/install               # Install plugin
PATCH  /api/plugins/:id/enable            # Enable
PATCH  /api/plugins/:id/disable           # Disable
PATCH  /api/plugins/:id/config            # Configure
DELETE /api/plugins/:id                   # Delete
GET    /api/plugins/:id/logs              # Audit logs
```

---

## 📱 Frontend Components Map

| Route | Component | Purpose |
|-------|-----------|---------|
| `/moving-jobs` | MovingJobsManager | Job CRUD & team assignments |
| `/materials` | MaterialsManager | Inventory & purchases |
| `/reports` | JobReportsDashboard | Cost & profit analysis |
| `/plugins` | PluginSystemManager | Plugin management |

---

## 🗄️ Database Models Quick Reference

### Core Models
```
MovingJob
  ├─ id, jobNumber (JOB-001)
  ├─ title, jobType (LOCAL|INTERNATIONAL|PACKING_ONLY)
  ├─ clientName, clientPhone, clientEmail
  ├─ fromAddress, toAddress
  ├─ scheduledDate, actualStartDate, actualEndDate
  ├─ teamLeaderId (FK → User)
  ├─ estimatedCost, actualCost
  ├─ sellingPrice, totalProfit
  └─ status (SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED)

JobTeamMember
  ├─ id
  ├─ jobId (FK → MovingJob)
  ├─ userId (FK → User)
  ├─ role (LEAD|DRIVER|LABOR|HELPER|PACKER)
  ├─ hoursWorked
  ├─ hourlyRate
  └─ totalEarnings

Material
  ├─ id, code (UNIQUE)
  ├─ name (TAPE, BOX, BUBBLE_WRAP, FOAM, etc.)
  ├─ unit (PCS|ROLL|SHEET|BOX|KG)
  ├─ quantityInStock
  ├─ costPerUnit
  ├─ sellingPrice
  └─ minStockLevel

JobMaterial
  ├─ id
  ├─ jobId (FK)
  ├─ materialId (FK)
  ├─ quantityAllocated, quantityUsed, quantityReturned, quantityDamaged
  ├─ unitPrice, sellingPrice
  └─ totalCost, totalSellingValue

MaterialReturn
  ├─ id
  ├─ jobId (FK)
  ├─ quantityReturned, quantityDamaged
  ├─ damagePhotos (JSON)
  ├─ status (PENDING_APPROVAL|APPROVED|REJECTED)
  ├─ approvedBy (FK → User)
  └─ approvalNotes

JobCostReport
  ├─ jobId (UNIQUE)
  ├─ totalMaterialCost
  ├─ totalMaterialSelling
  ├─ totalLaborCost
  ├─ totalCost
  ├─ estimatedRevenue
  ├─ profitLoss
  └─ profitMargin (%)

PluginFeature
  ├─ id
  ├─ pluginName, featureName
  ├─ version
  ├─ isActive, isCore
  ├─ configData (JSON)
  └─ apiEndpoints (JSON array)
```

---

## 💰 Cost Calculation Examples

### Material Cost
```
Unit Cost × Quantity Used = Total Material Cost
Example: 0.5 KWD × 85 rolls = 42.5 KWD
```

### Labor Cost
```
Hourly Rate × Hours Worked = Total Labor Cost
Example: 5 KWD/hr × 20 hrs = 100 KWD
```

### Job Profitability
```
Total Cost = Material Cost + Labor Cost + Other Costs
Profit = Revenue - Total Cost
Profit Margin = (Profit / Revenue) × 100

Example:
- Material: 217.5 KWD
- Labor: 280 KWD
- Other: 50 KWD
- Total Cost: 547.5 KWD
- Revenue: 1000 KWD
- Profit: 452.5 KWD
- Margin: 45.25%
```

---

## 🔐 Authentication & Headers

```bash
# All API requests need Authorization header:
Authorization: Bearer YOUR_JWT_TOKEN

# Example with curl:
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:5000/api/jobs
```

---

## 🛠️ Common Tasks

### Create a Job
```bash
POST /api/jobs
{
  "title": "House Packing",
  "jobType": "LOCAL",
  "clientName": "Akif Ahmed",
  "clientPhone": "1234567890",
  "fromAddress": "Old House",
  "toAddress": "New House",
  "estimatedCost": 500,
  "sellingPrice": 1000,
  "scheduledDate": "2025-10-25",
  "companyId": "company-123"
}
```

### Assign Team Member
```bash
POST /api/jobs/:jobId/team-members
{
  "userId": "user-123",
  "role": "LABOR",
  "hourlyRate": 3
}
```

### Allocate Material
```bash
POST /api/materials/allocate/:jobId
{
  "materialId": "material-123",
  "quantityAllocated": 100,
  "unitPrice": 0.5,
  "sellingPrice": 1.0
}
```

### Complete Job
```bash
PATCH /api/jobs/:jobId/complete
{
  "actualEndDate": "2025-10-25T18:00:00Z",
  "notes": "Job completed successfully"
}
```

### Get Job Cost
```bash
GET /api/reports/job-cost/:jobId
# Returns:
{
  "jobNumber": "JOB-001",
  "totalMaterialCost": 217.5,
  "totalMaterialSelling": 435,
  "totalLaborCost": 280,
  "totalCost": 547.5,
  "profitLoss": 452.5,
  "profitMargin": 45.25
}
```

---

## 📊 Dashboard Metrics

All visible on JobReportsDashboard:

```
┌─────────────────┬──────────────┐
│ Total Jobs      │ 25           │
│ Total Cost      │ 13,687.50    │
│ Total Revenue   │ 25,000.00    │
│ Total Profit    │ 11,312.50    │
│ Profit Margin   │ 45.25%       │
└─────────────────┴──────────────┘

Top by Profitability:
1. INTERNATIONAL - 48% margin
2. LOCAL - 45% margin
3. PACKING_ONLY - 42% margin
```

---

## 🐛 Debugging Tips

### Backend Issues
```bash
# Check backend running
curl http://localhost:5000/api/jobs

# Check logs
cd backend && npm run dev
# Look for errors in console

# Reset database if needed
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

### Frontend Issues
```bash
# Check frontend running
curl http://localhost:3000

# Open browser console (F12)
# Look for API errors and network requests

# Check .env.local
cat frontend/.env.local
# Should have: VITE_API_URL=http://localhost:5000/api
```

### API Connection
```bash
# Test API endpoint directly
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/jobs

# Check CORS is enabled in backend
# Check .env files for correct ports
```

---

## 📁 File Locations

```
backend/
  ├─ src/routes/
  │  ├─ moving-jobs.ts        (Job CRUD, team members)
  │  ├─ materials.ts          (Material allocation, returns)
  │  ├─ reports.ts            (Cost calculations)
  │  └─ plugins.ts            (Plugin management)
  ├─ prisma/
  │  ├─ schema.prisma         (Database models)
  │  └─ migrations/           (Migration history)
  └─ index.ts                 (Express app)

frontend/
  ├─ src/components/moving-jobs/
  │  ├─ MovingJobsManager.tsx
  │  ├─ MaterialsManager.tsx
  │  ├─ JobReportsDashboard.tsx
  │  └─ PluginSystemManager.tsx
  ├─ App.tsx                  (Route definitions)
  └─ .env.local               (API URL config)
```

---

## ✅ Quick Checklist Before Production

- [ ] Backend running without errors
- [ ] Frontend loads all components
- [ ] Can create a job
- [ ] Can assign team members
- [ ] Can allocate materials
- [ ] Can complete job and view costs
- [ ] Can approve material returns
- [ ] Can install and enable plugins
- [ ] All cost calculations correct
- [ ] Reports show correct data
- [ ] Database backed up
- [ ] .env files configured
- [ ] JWT tokens working

---

## 🚨 Common Errors & Solutions

| Error | Solution |
|-------|----------|
| CORS error | Check backend CORS enabled, frontend API URL correct |
| 401 Unauthorized | Missing or invalid JWT token in Authorization header |
| 404 Not Found | Check API endpoint URL spelling and HTTP method |
| Database connection failed | Check DATABASE_URL in .env, ensure SQLite file exists |
| "Port already in use" | Change PORT in .env or kill existing process |
| TypeScript errors | Run `npm install`, verify all imports |
| Material allocation fails | Check stock available >= quantity requested |
| Return approval fails | Check material has pending approval status |

---

## 📞 Quick Contact Points

```
Backend API: http://localhost:5000/api
Frontend App: http://localhost:3000

Main Documentation: MOVING-JOBS-V2-DOCUMENTATION.md
Integration Guide: FRONTEND-INTEGRATION-GUIDE.md
Implementation Checklist: MOVING-JOBS-V2-IMPLEMENTATION-CHECKLIST.md
```

---

## 🎯 Next 30 Seconds

1. Open 2 terminals
2. Terminal 1: `cd backend && npm run dev`
3. Terminal 2: `cd frontend && npm run dev`
4. Open `http://localhost:3000` in browser
5. Navigate to `/moving-jobs`
6. Create first job
7. Watch real-time cost calculations
8. Check reports dashboard

---

**Status**: ✅ Production Ready  
**Last Updated**: October 24, 2025  
**Version**: 2.0.0

**تیار ہے استعمال کے لیے! 🚀**
