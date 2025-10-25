# Moving Jobs v3.0 - Implementation Guide

## System Architecture

The Moving Jobs v3.0 system is a complete rebuild featuring:
- **Multi-tenant warehousing management** with company-level isolation
- **Real-time material tracking** from purchase through job allocation to returns
- **Automated cost calculation** with profit/loss analysis
- **Approval workflow** for damages and special materials
- **Plugin ecosystem** with audit logging

## Core Workflows

### 1. Moving Job Creation & Management
```
Create Job → Assign Workers → Allocate Materials → Complete Job → Process Returns
```

**Related Components:**
- `MovingJobsManager.tsx` - Job CRUD
- `/api/moving-jobs` - Job endpoints

### 2. Material Procurement & Allocation
```
Purchase Stock → Record Batch → Allocate to Job → Apply Costs → Track Returns
```

**Related Components:**
- `MaterialsManager.tsx` - Materials UI (3 tabs)
- `/api/materials` - All material endpoints

### 3. Financial Tracking & Reporting
```
Record Material Costs → Track Labor Hours → Report Damage Loss → Calculate Profit
```

**Related Components:**
- `JobReportsDashboard.tsx` - Reports UI
- `/api/reports` - Financial endpoints

### 4. Material Return & Damage Processing
```
Job Completion → Return Materials → Split Good/Damaged → Request Approval → Restock/Claim
```

**Related Endpoints:**
- `POST /api/materials/returns` - Record returns
- `POST /api/materials/approvals` - Request approval
- `PATCH /api/materials/approvals/:id` - Process approval

### 5. Plugin Management
```
Install Plugin → Activate → Use Features → View Logs → Deactivate/Uninstall
```

**Related Components:**
- `PluginSystemManager.tsx` - Plugin UI
- `/api/plugins` - Plugin endpoints
- All actions logged automatically

## Database Entity Relationships

### Job Context
```
MovingJob
├── JobAssignment[] → (Worker, Role, Hours)
├── MaterialIssue[] → (Material, Quantity, Cost)
├── MaterialReturn[] → (Good/Damaged quantities)
├── MaterialDamage[] → (Damage details)
├── JobCostSnapshot[] → (Financial snapshots)
└── MaterialApproval[] → (Approval requests)
```

### Material Context
```
PackingMaterial
├── StockBatch[] → (Purchase records with unit cost)
├── RackStockLevel[] → (Warehouse location inventory)
├── MaterialIssue[] → (Job allocations)
├── MaterialReturn[] → (Job returns)
└── MaterialApproval[] → (Approval requests)
```

## API Endpoint Summary

### Moving Jobs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/moving-jobs` | List all jobs |
| GET | `/api/moving-jobs/:jobId` | Get job details |
| POST | `/api/moving-jobs` | Create job |
| PATCH | `/api/moving-jobs/:jobId` | Update job |

### Materials
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/materials` | List all materials |
| POST | `/api/materials` | Create material |
| GET | `/api/materials/batches` | List purchase batches |
| POST | `/api/materials/batches` | Record purchase |
| POST | `/api/materials/issues` | Allocate to job |
| POST | `/api/materials/returns` | Record return |
| GET | `/api/materials/approvals` | List approvals |
| POST | `/api/materials/approvals` | Request approval |
| PATCH | `/api/materials/approvals/:id` | Process decision |

### Reports
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/reports/cost-snapshot` | Calculate job costs |
| GET | `/api/reports/job/:jobId/costs` | Get cost history |
| GET | `/api/reports/profitability` | Company totals |
| GET | `/api/reports/material-costs` | Material spend breakdown |

### Plugins
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/plugins` | List installed plugins |
| POST | `/api/plugins` | Install plugin |
| PATCH | `/api/plugins/:id/activate` | Activate plugin |
| PATCH | `/api/plugins/:id/deactivate` | Disable plugin |
| DELETE | `/api/plugins/:id` | Uninstall plugin |
| GET | `/api/plugins/:id/logs` | View audit logs |

## Frontend Routes

| Route | Component | Roles | Purpose |
|-------|-----------|-------|---------|
| `/jobs-management` | MovingJobsManager | ADMIN, MANAGER | Job CRUD |
| `/materials-management` | MaterialsManager | ADMIN, MANAGER | Material workflows |
| `/job-reports` | JobReportsDashboard | ADMIN, MANAGER | Financial reporting |
| `/approvals` | ApprovalManager | ADMIN, MANAGER | Approval workflow |
| `/plugin-system` | PluginSystemManager | ADMIN | Plugin management |

## Cost Calculation Formula

### Job Cost Snapshot
```
Total Materials Cost = Sum of all MaterialIssue.cost for job
Total Labor Cost = Sum of (JobAssignment.hourlyRate × hourlyWorked)
Total Damage Loss = Sum of (MaterialDamage.quantity × unitCost)
Total Costs = Materials + Labor + Damage

Net Profit = Revenue - Total Costs
Profit Margin = (Net Profit / Revenue) × 100%
```

## Data Flow Examples

### Creating a Job and Allocating Materials
```
1. POST /api/moving-jobs
   → Creates MovingJob with status="PLANNED"

2. POST /api/materials/issues
   → Creates MaterialIssue (quantity, cost)
   → Associates with job

3. POST /api/reports/cost-snapshot
   → Calculates total cost
   → Stores in JobCostSnapshot
```

### Processing Material Return
```
1. POST /api/materials/returns
   → Records quantity returned (good & damaged)
   → Creates MaterialReturn entry

2. Auto-restock (if quantityGood > 0):
   → Updates RackStockLevel
   → Adds back to warehouse inventory

3. POST /api/materials/approvals (if damage)
   → Creates approval request
   → Awaits manager decision

4. PATCH /api/materials/approvals/:id
   → Records decision
   → Updates approval status
```

## Error Handling

All endpoints follow consistent error response pattern:

```json
{
  "error": "Descriptive error message"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `500` - Server error

## Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

Token payload includes:
- `id` - User ID
- `email` - User email
- `role` - User role (ADMIN, MANAGER, WORKER)
- `companyId` - Company multi-tenant scope

## Database Schema Highlights

### Key Fields

**MovingJob**
- `jobCode` - Unique job identifier
- `jobTitle` - Job name/description
- `status` - PLANNED, DISPATCHED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
- `clientName`, `clientPhone` - Customer info
- `jobDate` - Scheduled date
- `companyId` - Multi-tenant scope

**MaterialIssue**
- `jobId` - Associated job
- `materialId` - Material reference
- `quantity` - How many allocated
- `unitCost` - Cost per unit at allocation time
- `recordedBy` - Audit trail

**JobCostSnapshot**
- `jobId` - Associated job
- `materialsCost` - Calculated sum
- `laborCost` - Calculated sum
- `damageLoss` - Damage amount
- `revenue` - Job revenue
- `profit` - Net profit
- `profitMargin` - Percentage

**MaterialApproval**
- `jobId` - Associated job
- `approvalType` - DAMAGE, PREMIUM_MATERIAL, QUANTITY_VARIATION
- `status` - PENDING, APPROVED, REJECTED
- `requestedBy` / `decisionBy` - Audit trail
- `decisionNotes` - Decision details

## Performance Considerations

1. **Batch Operations**: Material costs summed via database queries
2. **Multi-tenant Scoping**: All queries filtered by companyId
3. **Indexing**: Recommended on `companyId`, `jobId`, `materialId`, `status`
4. **Pagination**: Ready to implement if needed (use `skip`/`take` in Prisma)

## Security Features

1. **JWT Authentication**: All endpoints secured
2. **Role-based Access**: ADMIN/MANAGER/WORKER separation
3. **Multi-tenant Isolation**: Data access scoped by companyId
4. **Audit Logging**: Plugin actions tracked
5. **Type Safety**: Full TypeScript implementation

## Development Workflow

### Local Setup
```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Production Build
```bash
# Backend
npm run build

# Frontend
npm run build
# Output in dist/
```

## Future Enhancement Ideas

1. **Real-time Updates**: WebSocket for live material tracking
2. **Mobile App**: React Native companion app
3. **Advanced Analytics**: Trend analysis, forecasting
4. **Document Management**: Receipt/invoice storage
5. **Integration APIs**: Connect to accounting software
6. **Mobile Scanner**: Barcode scanning for materials
7. **Email Notifications**: Approval alerts
8. **Role Customization**: Custom permission roles

## Support & Debugging

### Common Issues

**Prisma Migration Fails**
```bash
# Reset and retry
npx prisma migrate reset
npx prisma migrate dev
```

**Stale Type Information**
```bash
# Regenerate Prisma client
npx prisma generate
```

**Frontend Build Issues**
```bash
# Clear and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

**Documentation Version**: 1.0  
**Last Updated**: December 2024  
**Maintained By**: Development Team
