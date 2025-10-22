# 🚀 RBAC System - Quick Integration Guide

**Time Required**: 10 minutes  
**Status**: Ready to integrate

---

## ✅ WHAT'S ALREADY DONE

✅ Database schema migrated  
✅ 84 permissions seeded  
✅ Backend API complete (12 endpoints)  
✅ Permission middleware ready  
✅ Frontend pages created  
✅ Permission context created  

---

## 🔌 3-STEP INTEGRATION

### STEP 1: Wrap App with Permission Provider (2 min)

**File**: `frontend/src/App.tsx`

```tsx
import { PermissionProvider } from './contexts/PermissionContext';

function App() {
  return (
    <PermissionProvider>
      <BrowserRouter>
        {/* Your existing app code */}
      </BrowserRouter>
    </PermissionProvider>
  );
}
```

---

### STEP 2: Add Navigation Routes (3 min)

**File**: `frontend/src/App.tsx` (in your router)

```tsx
import UserProfile from './pages/Profile/UserProfile';
import RoleManagement from './pages/Admin/RoleManagement';

// Add these routes:
<Route path="/profile" element={<UserProfile />} />
<Route path="/admin/roles" element={<RoleManagement />} />
```

---

### STEP 3: Add Menu Links (5 min)

**File**: Your navigation component (e.g., `Sidebar.tsx` or `Header.tsx`)

```tsx
import { usePermissions } from './contexts/PermissionContext';
import { User, Shield } from 'lucide-react';

function Navigation() {
  const { canManage } = usePermissions();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <nav>
      {/* User Profile Link */}
      <Link to="/profile">
        <User className="w-5 h-5" />
        My Profile
      </Link>

      {/* Admin Only: Role Management */}
      {currentUser.role === 'ADMIN' && (
        <Link to="/admin/roles">
          <Shield className="w-5 h-5" />
          Role Management
        </Link>
      )}
    </nav>
  );
}
```

---

## 🎯 USAGE EXAMPLES

### Example 1: Hide Button Based on Permission
```tsx
import { usePermissions } from './contexts/PermissionContext';

function ShipmentPage() {
  const { canCreate } = usePermissions();

  return (
    <div>
      <h1>Shipments</h1>
      {canCreate('SHIPMENTS') && (
        <button>+ Create New Shipment</button>
      )}
    </div>
  );
}
```

### Example 2: Conditional Rendering Component
```tsx
import { IfHasPermission } from './contexts/PermissionContext';

function InvoicePage() {
  return (
    <div>
      <h1>Invoice #123</h1>
      
      <IfHasPermission resource="INVOICES" action="EDIT">
        <button>Edit Invoice</button>
      </IfHasPermission>
      
      <IfHasPermission resource="INVOICES" action="DELETE">
        <button>Delete Invoice</button>
      </IfHasPermission>
    </div>
  );
}
```

### Example 3: Multiple Permission Check
```tsx
import { usePermissions } from './contexts/PermissionContext';

function ExpensePage() {
  const { hasPermission } = usePermissions();

  const canApprove = hasPermission('EXPENSES', 'APPROVE');
  const canExport = hasPermission('EXPENSES', 'EXPORT');

  return (
    <div>
      {canApprove && <button>Approve Expense</button>}
      {canExport && <button>Export to Excel</button>}
    </div>
  );
}
```

### Example 4: Protect Backend Route
```typescript
// backend/src/routes/shipments.ts
import { requirePermission } from '../middleware/permissions';
import { authenticateToken } from '../middleware/auth';

// Before: No permission check
router.post('/', authenticateToken, async (req, res) => {
  // Create shipment
});

// After: With permission check
router.post(
  '/',
  authenticateToken,
  requirePermission('SHIPMENTS', 'CREATE'),
  async (req, res) => {
    // Only users with SHIPMENTS:CREATE permission can access
  }
);
```

---

## 🧪 TESTING THE SYSTEM

### Test 1: View Your Permissions
1. Start backend: `cd backend && npm run dev`
2. Login to the app
3. Open browser console
4. Run:
```javascript
fetch('http://localhost:5000/api/permissions/my-permissions', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(console.log)
```

### Test 2: Access User Profile
1. Navigate to `/profile`
2. Should see your profile with 3 tabs
3. Try editing your name
4. Try changing password

### Test 3: Configure Roles (Admin Only)
1. Login as ADMIN
2. Navigate to `/admin/roles`
3. Click MANAGER tab
4. Toggle some permissions
5. Click Save Changes

### Test 4: Test Permission Hiding
1. Login as WORKER
2. Notice certain buttons/features are hidden
3. Login as MANAGER
4. More features should be visible
5. Login as ADMIN
6. Everything should be visible

---

## 🔒 PERMISSION RESOURCES

Available resources to check:
- `SHIPMENTS`
- `RACKS`
- `INVOICES`
- `PAYMENTS`
- `EXPENSES`
- `MOVING_JOBS`
- `USERS`
- `SETTINGS`
- `REPORTS`
- `DASHBOARD`
- `CUSTOM_FIELDS`
- `BILLING`

Available actions:
- `VIEW`
- `CREATE`
- `EDIT`
- `DELETE`
- `APPROVE`
- `EXPORT`
- `MANAGE`

---

## 🎨 UI COMPONENTS TO UPDATE

Apply permission checks to these areas:

### 1. Shipments Page
```tsx
{canCreate('SHIPMENTS') && <button>Create Shipment</button>}
{canEdit('SHIPMENTS') && <button>Edit</button>}
{canDelete('SHIPMENTS') && <button>Delete</button>}
{canExport('SHIPMENTS') && <button>Export</button>}
```

### 2. Racks Page
```tsx
{canCreate('RACKS') && <button>Add Rack</button>}
{canEdit('RACKS') && <button>Modify</button>}
```

### 3. Invoices Page
```tsx
{canCreate('INVOICES') && <button>New Invoice</button>}
{canExport('INVOICES') && <button>Download PDF</button>}
```

### 4. Users Page
```tsx
{canCreate('USERS') && <button>Add User</button>}
{canEdit('USERS') && <button>Edit Role</button>}
{canDelete('USERS') && <button>Remove</button>}
```

### 5. Settings Page
```tsx
{canManage('SETTINGS') && (
  <div>All settings visible</div>
)}
```

### 6. Reports Page
```tsx
{canView('REPORTS') && <ReportsList />}
{canExport('REPORTS') && <button>Export Report</button>}
```

---

## 📦 INSTALL MISSING PACKAGES

If you see errors about missing packages:

```bash
# In frontend directory
npm install lucide-react
# or
yarn add lucide-react
```

---

## 🔄 RE-SEED PERMISSIONS

If you need to reset permissions to defaults:

```bash
cd backend
npx ts-node prisma/seed-permissions.ts
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Permission context undefined"
**Solution**: Make sure `<PermissionProvider>` wraps your entire app

### Issue: "401 Unauthorized"
**Solution**: Check if user is logged in and token is valid

### Issue: "403 Forbidden"
**Solution**: User doesn't have required permission - expected behavior

### Issue: Permissions not loading
**Solution**: 
1. Check backend is running
2. Check token in localStorage
3. Try refreshing permissions: `refreshPermissions()`

---

## ✅ INTEGRATION CHECKLIST

- [ ] Wrap App with `<PermissionProvider>`
- [ ] Add `/profile` route
- [ ] Add `/admin/roles` route (admin only)
- [ ] Add navigation links to header/sidebar
- [ ] Apply permission checks to existing pages:
  - [ ] Shipments
  - [ ] Racks
  - [ ] Invoices
  - [ ] Payments
  - [ ] Expenses
  - [ ] Users
  - [ ] Settings
- [ ] Protect backend routes with `requirePermission()`
- [ ] Test with different user roles
- [ ] Verify admin can configure permissions
- [ ] Verify users can edit profiles

---

## 🎉 YOU'RE DONE!

Once integrated, you'll have:
- ✅ Complete role-based access control
- ✅ User profile management
- ✅ Permission configuration UI
- ✅ Secure API endpoints
- ✅ Permission-based frontend

**Time to integrate**: ~10 minutes  
**Benefit**: Complete control over who can do what!

---

**Need Help?** Check `RBAC-IMPLEMENTATION-COMPLETE.md` for full documentation.
