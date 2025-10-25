# Inventory Management System - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│              /var/www/wms/frontend (localhost:5173)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    JWT Token in Header
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (Express.js)                     │
│              /var/www/wms/backend (Port 5000)               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware (JWT Validation)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│  ┌──────▼────────┐ ┌──────▼────────┐ ┌─────▼────────┐     │
│  │  Consumables  │ │  Inventory    │ │   Auth &     │     │
│  │  Routes       │ │  Config       │ │   Other      │     │
│  │               │ │  Routes       │ │   Routes     │     │
│  │ • Get all     │ │               │ │              │     │
│  │ • Get by rack │ │ • Get config  │ │ • Shipments  │     │
│  │ • Add new     │ │ • Create      │ │ • Racks      │     │
│  │ • Transfer    │ │ • Update      │ │ • Billing    │     │
│  │ • Dispose     │ │ • Delete      │ │ • Users      │     │
│  │ • Sell        │ │               │ │              │     │
│  │ • Report      │ │               │ │              │     │
│  └──────┬────────┘ └──────┬────────┘ └──────┬───────┘     │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐  │
│  │   Prisma ORM (TypeScript Database Access Layer)      │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                MySQL Database (wms_production)               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Consumable Tables:                                  │   │
│  │ ├─ rack_consumables (Stock Tracking)               │   │
│  │ ├─ consumable_movements (Audit Trail)              │   │
│  │ ├─ consumable_disposals (Waste Tracking)           │   │
│  │ ├─ consumable_sales (Revenue Tracking)             │   │
│  │ └─ inventory_configurations (Company Settings)     │   │
│  │                                                     │   │
│  │ Existing Tables:                                   │   │
│  │ ├─ companies                                       │   │
│  │ ├─ racks                                           │   │
│  │ ├─ users                                           │   │
│  │ ├─ shipments                                       │   │
│  │ ├─ invoices                                        │   │
│  │ └─ ... (other WMS tables)                          │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

## API Endpoint Hierarchy

```
/api/
├── /auth (Authentication)
├── /shipments (Shipment Management)
├── /racks (Warehouse Racks)
├── /jobs (Moving Jobs)
├── /billing (Invoices & Payments)
├── /users (User Management)
├── /company (Company Settings)
├── /warehouse (Warehouse Info)
│
├── /consumables ✅ NEW - Inventory Management
│   ├── GET /company/all
│   ├── GET /rack/:rackId
│   ├── POST / (Add consumable)
│   ├── POST /transfer/stock (Transfer between racks)
│   ├── POST /dispose/item (Mark as waste)
│   ├── POST /sell/material (Sell old material)
│   └── GET /sales/report/:companyId (Revenue report)
│
└── /inventory-config ✅ NEW - Configuration
    ├── GET /:companyId (Get config)
    ├── POST / (Create config)
    └── PUT /:companyId (Update config)
```

## Data Flow Examples

### Example 1: Adding Stock to Warehouse
```
User clicks "Add Stock" in Frontend
         │
         ▼
POST /api/consumables
{
  rackId: "rack_001",
  itemType: "Boxes",
  quantity: 100,
  unit: "pcs"
}
         │
         ▼
Backend validates JWT token
         │
         ▼
Backend validates request with Zod schema
         │
         ▼
Generate unique ID: "consumable_1729610892345_abc123"
         │
         ▼
INSERT INTO rack_consumables
    (id, rackId, companyId, itemType, quantity, unit, ...)
         │
         ▼
Response: { success: true, id: "consumable_..." }
         │
         ▼
Frontend shows success notification
```

### Example 2: Transferring Stock Between Racks
```
User selects "From Rack", "To Rack", quantity
         │
         ▼
POST /api/consumables/transfer/stock
         │
         ▼
Get source consumable (check quantity available)
         │
         ▼
If destination consumable doesn't exist, create it
         │
         ▼
UPDATE source: quantity -= transfer_quantity
UPDATE destination: quantity += transfer_quantity
         │
         ▼
INSERT INTO consumable_movements (audit trail)
         │
         ▼
Response: { success: true, message: "Stock transferred" }
         │
         ▼
Both racks now show updated quantities
```

### Example 3: Selling Old Material
```
User enters: quantity=20, unitPrice=$5.50, description
         │
         ▼
POST /api/consumables/sell/material
         │
         ▼
Check consumable quantity >= 20
         │
         ▼
Calculate: totalPrice = 20 * 5.50 = $110
         │
         ▼
UPDATE rack_consumables: quantity -= 20
INSERT INTO consumable_sales: (revenue record)
         │
         ▼
Response: { success: true, revenue: 110.00 }
         │
         ▼
Optional: Can link to Invoice for billing
```

## Security Features

### Authentication
- JWT tokens required for all routes
- Tokens expire (configurable)
- User ID and Company ID extracted from token

### Authorization (Role-Based Access Control)
```typescript
GET    /api/consumables/company/all       - Any authenticated user
GET    /api/consumables/rack/:id          - Any authenticated user
POST   /api/consumables                   - ADMIN, MANAGER only
POST   /api/consumables/transfer/stock    - ADMIN, MANAGER only
POST   /api/consumables/dispose/item      - ADMIN, MANAGER only
POST   /api/consumables/sell/material     - ADMIN, MANAGER only
GET    /api/consumables/sales/report/*    - Any authenticated user
GET    /api/inventory-config/*            - Any authenticated user
POST   /api/inventory-config              - ADMIN only
PUT    /api/inventory-config/*            - ADMIN only
```

### Data Isolation
- All queries filter by `companyId` from JWT token
- Users can only see data for their company
- Multi-tenant safe

## Database Relationships

```
companies
    │
    ├──── racks
    │       │
    │       └──── rack_consumables
    │               │
    │               ├──── consumable_movements (audit)
    │               ├──── consumable_disposals (waste)
    │               └──── consumable_sales (revenue)
    │
    └──── inventory_configurations (settings per company)
```

## Deployment Architecture

```
Rocky Linux 10.0 (VPS)
│
├─ Port 22 (SSH)
├─ Port 80 (HTTP)
├─ Port 443 (HTTPS)
│
├─ Nginx (Reverse Proxy)
│   ├─ Frontend → localhost:5173
│   └─ Backend API → localhost:5000
│
├─ Node.js (Backend)
│   └─ PM2 Process Manager
│       └─ wms-backend process (running TypeScript compiled JS)
│
└─ MySQL 8.0+
    └─ Database: wms_production
```

## Performance Considerations

### Indexing
- `rack_consumables`: Indexed on (rackId, itemType, companyId)
- `consumable_movements`: Indexed on (companyId, createdAt)
- `consumable_disposals`: Indexed on (companyId, disposalType)
- `consumable_sales`: Indexed on (companyId, createdAt)

### Query Optimization
- All raw SQL uses parameterized queries (Prisma)
- LEFT JOINs include rack codes for user display
- No N+1 query problems (bulk operations)

### Scalability
- Can handle thousands of consumables per warehouse
- Audit trail prevents data loss
- Movements table provides full history for compliance

## Monitoring & Logging

### Current
- PM2 process monitoring (restart on crash)
- PM2 logs available via `pm2 logs`
- Backend logs to console (via Docker/PM2)

### Recommended Additions
- Database query logging
- API request/response logging
- Performance metrics
- Error tracking (e.g., Sentry)

---

**System Deployed:** October 22, 2025
**Estimated Load:** Small warehouse (100-1000 items)
**Scalability:** Can grow to medium warehouse (10,000+ items) with indexing optimizations
