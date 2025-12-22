# 🔐 Permission System Architecture

## ✅ Current Active System (Use This)

### **Location:** `backend/prisma/seed-permissions-granular.ts`

### **Overview:**
- **154 Granular Permissions** across 47 resources
- **Role-based**: ADMIN, MANAGER, WORKER
- **Action-based**: VIEW, CREATE, EDIT, DELETE, EXPORT, etc.
- **Database-driven**: Stored in `permissions` and `rolePermissions` tables

### **Key Components:**

1. **Database Schema:**
   ```prisma
   model Permission {
     id          String   @id @default(cuid())
     resource    String   // e.g., "SHIPMENTS", "FINANCE", "MATERIALS"
     action      String   // e.g., "VIEW", "CREATE", "EDIT", "DELETE"
     description String?
   }
   
   model RolePermission {
     id           String     @id @default(cuid())
     role         String     // ADMIN, MANAGER, WORKER
     permissionId String
     companyId    String
   }
   ```

2. **Seeder File:** `prisma/seed-permissions-granular.ts`
   - Creates all 154 permissions
   - Assigns default permissions to each role
   - Run: `npx ts-node prisma/seed-permissions-granular.ts`

3. **API Routes:** `src/routes/permissions.ts`
   - `GET /api/permissions` - Get all permissions
   - `GET /api/permissions/role/:role` - Get role permissions
   - `PUT /api/permissions/role/:role` - Update role permissions

4. **Middleware:** `src/middleware/permissions.ts`
   - `checkPermission(resource, action)` - Check if user has permission
   - `requirePermission(resource, action)` - Route middleware
   - `getUserPermissions(userId)` - Get all user permissions

### **Resources with Permissions:**

| Category | Resources | Permissions Each |
|----------|-----------|------------------|
| **Dashboard** | Dashboard, Stats, Charts, Quick Actions | 4-6 |
| **Finance** | Finance Tab, Overview, Charts, Analytics, P&L | 6 |
| **Companies** | Companies List, Profile, Analytics | 8 |
| **Operations** | Shipments, Racks, Moving Jobs | 8-11 |
| **Finance Mgmt** | Invoices, Payments, Expenses, Billing | 5-9 |
| **Materials** | Materials, Reports, Customer Materials | 5-7 |
| **Tools** | Scanner, Analytics, Reports | 4-6 |
| **Admin** | Users, Settings (6 sub-sections), Role Mgmt | 2-8 |
| **System** | Backup, System Monitor, Profile | 3-4 |

### **Total Breakdown:**
- **ADMIN:** 154 permissions (full access)
- **MANAGER:** 113 permissions (operations + finance)
- **WORKER:** 32 permissions (basic operations)

---

## 🗄️ Old/Deprecated Systems

### ⚠️ **DO NOT USE:**

1. **Old User Management Component**
   - **Was:** `frontend/src/pages/Settings/components/UserManagement.tsx`
   - **Now:** Moved to `frontend/src/removed-features/old-user-management/`
   - **Why Removed:** Simple role-based system, no granularity

2. **Hardcoded Permission Checks**
   - **Old:** `if (user.role === 'ADMIN')` in components
   - **New:** `checkPermission('RESOURCE', 'ACTION')` from backend

---

## 🚀 Usage Examples

### **Frontend - Check Permission:**
```typescript
import { usePermissions } from '../contexts/PermissionContext';

const MyComponent = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <>
      {hasPermission('SHIPMENTS', 'VIEW') && <ShipmentsList />}
      {hasPermission('SHIPMENTS', 'CREATE') && <CreateButton />}
    </>
  );
};
```

### **Backend - Protect Route:**
```typescript
import { requirePermission } from '../middleware/permissions';

router.post('/shipments', 
  requirePermission('SHIPMENTS', 'CREATE'),
  async (req, res) => {
    // Create shipment
  }
);
```

### **Add New Permission:**
1. Edit `prisma/seed-permissions-granular.ts`
2. Add to `GRANULAR_PERMISSIONS` array:
   ```typescript
   { 
     resource: 'NEW_FEATURE', 
     action: 'VIEW', 
     description: 'View New Feature' 
   }
   ```
3. Add to role mappings (`ROLE_PERMISSIONS`)
4. Run seeder: `npx ts-node prisma/seed-permissions-granular.ts`

---

## 📝 Migration Notes

If you see old permission code:
- ❌ `user.role === 'ADMIN'`
- ❌ `UserManagement` component from Settings
- ❌ Hardcoded role checks

Replace with:
- ✅ `checkPermission('RESOURCE', 'ACTION')`
- ✅ `RoleManagement` from `pages/Admin/`
- ✅ Database-driven permission checks

---

**Last Updated:** December 18, 2025  
**System Version:** Granular Permission System v2.0
