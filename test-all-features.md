# Feature Testing Checklist - Production VPS

## Test Date: October 15, 2025
## VPS: https://72.60.215.188
## Login: admin@demo.com / admin123

---

## ✅ WORKING FEATURES

### 1. Authentication ✅
- [ ] Login page loads
- [ ] Admin login works
- [ ] JWT token stored
- [ ] Auto-redirect after login

### 2. Dashboard ✅
- [ ] Dashboard loads
- [ ] Statistics cards show data
- [ ] Charts render
- [ ] Recent activity visible

### 3. Shipments ✅
- [ ] Shipments page loads
- [ ] Can view shipment list
- [ ] Can create new shipment
- [ ] Can edit shipment
- [ ] Can delete shipment
- [ ] Status filters work
- [ ] Search works

### 4. Racks ✅
- [ ] Racks page loads
- [ ] Can view rack list
- [ ] Can create new rack
- [ ] Can edit rack
- [ ] Can delete rack
- [ ] Capacity calculation correct

### 5. Scanner ✅
- [ ] Scanner page loads
- [ ] Camera access works
- [ ] QR code scanning works
- [ ] Manual input works
- [ ] Pending shipments list loads
- [ ] Can assign shipment to rack

---

## ❌ POTENTIALLY BROKEN FEATURES

### 6. User Management (Settings → User Management) ❌
**Location:** Settings → User Management Tab
**Issues to Test:**
- [ ] Can load user list
- [ ] Can create new user
- [ ] Can edit user details
- [ ] Can delete user
- [ ] Can toggle user active/inactive status
- [ ] Can change user role
- [ ] Skills management works

**Backend API:** `/api/users`
- GET /api/users - List all users
- POST /api/users - Create user
- PUT /api/users/:id - Update user
- DELETE /api/users/:id - Delete user
- PUT /api/users/:id/toggle-status - Toggle status

### 7. Role Management (Admin → Roles) ❌
**Location:** /admin/roles
**Issues to Test:**
- [ ] Page loads without errors
- [ ] Can view all roles (ADMIN, MANAGER, WORKER)
- [ ] Can view permissions for each role
- [ ] Can assign/remove permissions for MANAGER
- [ ] Can assign/remove permissions for WORKER
- [ ] Cannot modify ADMIN permissions (full access)
- [ ] Save changes persists to database

**Backend API:** `/api/permissions`
- GET /api/permissions - Get all permissions
- GET /api/permissions/role/:role - Get role permissions
- PUT /api/permissions/role/:role - Update role permissions
- GET /api/permissions/my - Get current user permissions

### 8. Moving Jobs ❌
**Location:** /moving-jobs
**Issues to Test:**
- [ ] Page loads
- [ ] Can view job list
- [ ] Can create new job
- [ ] Can assign workers to job
- [ ] Can update job status
- [ ] Can mark job complete
- [ ] Worker assignment works

**Backend API:** `/api/jobs`

### 9. Invoices ❌
**Location:** /invoices
**Issues to Test:**
- [ ] Invoice list loads
- [ ] Can create invoice from shipment
- [ ] Can view invoice details
- [ ] Can edit invoice
- [ ] Can mark invoice as paid
- [ ] PDF generation works
- [ ] Email sending works (if configured)

**Backend API:** `/api/billing` (or invoice endpoints)

### 10. Expenses ❌
**Location:** /expenses
**Issues to Test:**
- [ ] Expenses page loads
- [ ] Can create new expense
- [ ] Can categorize expenses
- [ ] Can attach receipts
- [ ] Can approve/reject expenses (if manager)
- [ ] Expense reports work

**Backend API:** `/api/expenses`

### 11. Invoice Settings ❌
**Location:** Settings → Invoice Settings
**Issues to Test:**
- [ ] Settings load correctly
- [ ] Can update company details
- [ ] Can update invoice prefix/number
- [ ] Logo upload works
- [ ] Tax settings save correctly
- [ ] Payment terms update

**Backend API:** `/api/invoice-settings`

### 12. Warehouse Map ❌
**Location:** /warehouse (if exists)
**Issues to Test:**
- [ ] Warehouse map loads
- [ ] Can visualize rack locations
- [ ] Interactive map works
- [ ] Can click racks to view details

**Backend API:** `/api/warehouse`

### 13. Template Settings ❌
**Location:** Settings → Templates
**Issues to Test:**
- [ ] Template editor loads
- [ ] Can edit invoice template
- [ ] Can edit email templates
- [ ] Preview works
- [ ] Save updates database

**Backend API:** `/api/template-settings`

### 14. Custom Fields ❌
**Location:** Settings → Custom Fields (if exists)
**Issues to Test:**
- [ ] Can create custom fields
- [ ] Can assign to entities (shipments, etc.)
- [ ] Custom fields appear in forms
- [ ] Data saves correctly

**Backend API:** `/api/custom-fields`

### 15. Notifications ❌
**Issues to Test:**
- [ ] Notification preferences load
- [ ] Can enable/disable notifications
- [ ] Email notifications work
- [ ] In-app notifications show

**Backend API:** `/api/notification-preferences`

### 16. File Uploads ❌
**Issues to Test:**
- [ ] Image upload works
- [ ] File size validation
- [ ] File type validation
- [ ] Files accessible via URL

**Backend API:** `/api/upload`

### 17. Withdrawals ❌
**Location:** (Need to find)
**Issues to Test:**
- [ ] Withdrawals page exists
- [ ] Can create withdrawal request
- [ ] Can approve/reject withdrawals

**Backend API:** `/api/withdrawals`

### 18. Company Settings ❌
**Location:** Settings → Company
**Issues to Test:**
- [ ] Company details load
- [ ] Can update company info
- [ ] Logo upload works
- [ ] Settings save

**Backend API:** `/api/company`

---

## 🔍 TESTING METHODOLOGY

### Step 1: Quick Visual Test
1. Login to https://72.60.215.188
2. Navigate to each menu item
3. Note any pages that:
   - Don't load (blank page)
   - Show errors in UI
   - Missing data

### Step 2: Browser Console Check
1. Open DevTools (F12)
2. Go to Console tab
3. Navigate to each feature
4. Note any errors:
   - 404 Not Found errors
   - 500 Server errors
   - JavaScript errors
   - Failed API calls

### Step 3: Backend API Test
```bash
# Test each API endpoint
TOKEN="<your-jwt-token>"

# Users API
curl -H "Authorization: Bearer $TOKEN" https://72.60.215.188/api/users

# Permissions API
curl -H "Authorization: Bearer $TOKEN" https://72.60.215.188/api/permissions

# Jobs API
curl -H "Authorization: Bearer $TOKEN" https://72.60.215.188/api/jobs

# And so on...
```

### Step 4: Create Test Document
After testing, create a file with:
- ✅ Working features
- ❌ Broken features with error details
- 🔧 Fixes needed for each broken feature

---

## 📋 COMMON ISSUES TO CHECK

1. **Missing Frontend Pages**
   - Check if page component file exists
   - Check if route is registered in App.tsx

2. **API Path Issues**
   - Hardcoded localhost URLs
   - Missing /api prefix
   - Wrong HTTP method

3. **Backend Route Issues**
   - Route not registered in index.ts
   - Middleware blocking requests
   - Database query errors

4. **Database Issues**
   - Missing tables
   - Missing relationships
   - Missing seed data

5. **Permission Issues**
   - User lacks required role
   - Permission middleware blocking
   - RolePermission table empty

6. **File Upload Issues**
   - Upload directory doesn't exist
   - Wrong permissions on upload folder
   - Nginx not serving /uploads

---

## 🚨 PRIORITY FIXES

**P0 - Critical (Blocks main workflow):**
- User Management (can't add users)
- Role Management (can't assign permissions)

**P1 - High (Important features):**
- Moving Jobs (core business feature)
- Invoices (billing)
- Expenses (financial tracking)

**P2 - Medium (Nice to have):**
- Template Settings
- Custom Fields
- Warehouse Map

**P3 - Low (Optional):**
- Notification preferences
- Company settings customization
