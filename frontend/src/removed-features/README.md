# 🗄️ Removed Features Archive

This folder contains **old/deprecated** features that were replaced with better implementations.

## ⚠️ DO NOT USE THESE COMPONENTS

These are kept for reference only. They are NOT connected to the app.

---

## 📂 Contents

### `/old-user-management/`
- **File:** `UserManagement.OLD.tsx`
- **Reason Removed:** Replaced with granular permission system
- **Replacement:** `frontend/src/pages/Admin/RoleManagement.tsx`
- **Date Archived:** December 18, 2025
- **Why Deprecated:**
  - Old system had simple role-based permissions (ADMIN/MANAGER/WORKER)
  - New system has 154 granular permissions across 47 resources
  - Old system used hardcoded permission checks in UI
  - New system uses backend permission API with dynamic checks
  - Old system couldn't handle page-level granularity (e.g., "hide Settings but show Company Profile")
  - New system allows admins to toggle individual permissions per role

### **Migration Guide:**
If you need user/role management features:
1. Use: `frontend/src/pages/Admin/RoleManagement.tsx`
2. Backend: `backend/src/routes/permissions.ts`
3. Database: `permissions` and `rolePermissions` tables
4. Access: Sidebar → "Role Management" OR Settings → "User Management" (redirects)

---

## 🚀 New Features Location

| Old Feature | New Location |
|------------|--------------|
| User Management (simple) | `pages/Admin/RoleManagement.tsx` (154 permissions) |
| Role Permissions | `backend/prisma/seed-permissions-granular.ts` |
| Permission Middleware | `backend/src/middleware/permissions.ts` |

---

## 📝 Notes for Future AI Agents

**DO NOT:**
- Import anything from this folder
- Use old permission logic
- Restore these components without understanding the new system

**DO:**
- Check `pages/Admin/RoleManagement.tsx` for current implementation
- Use granular permission system from backend
- Read `backend/prisma/seed-permissions-granular.ts` to understand available permissions

---

**Last Updated:** December 18, 2025  
**Maintained by:** Development Team
