# 🔐 LOGIN CREDENTIALS

## Default Admin Account

```
📧 Email:    admin@wms.com
🔑 Password: admin123
👤 Role:     ADMIN
🏢 Company:  WMS Admin Company
```

---

## How to Login

1. Open browser and go to: **http://localhost:3000**
2. Click on "Login" or go to login page
3. Enter credentials:
   - **Email**: `admin@wms.com`
   - **Password**: `admin123`
4. Click "Login"

---

## Access Levels

### ADMIN
- ✅ Full system access
- ✅ Can manage users
- ✅ Can view all reports
- ✅ Can manage materials & categories
- ✅ Can configure settings

### MANAGER
- ✅ Most features
- ✅ Can manage shipments
- ✅ Can manage materials
- ❌ Cannot manage users (admin only)

### WORKER
- ✅ Limited access
- ✅ Can view assigned tasks
- ✅ Can update shipment status
- ❌ Cannot access admin features

---

## Creating New Users

1. Login as ADMIN
2. Go to "Users" section (if available in sidebar)
3. Click "Add User"
4. Fill in details:
   - Email
   - Password
   - Name
   - Role (ADMIN/MANAGER/WORKER)
5. Save

---

## Reset Password (If Needed)

Run this command in backend directory:

```powershell
cd "c:\Users\USER\Videos\NEW START\backend"
npx ts-node create-admin.ts
```

This will create/reset the admin user with default credentials.

---

## Database Access (Prisma Studio)

To view/edit database directly:

```powershell
cd "c:\Users\USER\Videos\NEW START\backend"
npx prisma studio
```

Opens at: **http://localhost:5555**

---

## Test the Material Category System

1. **Login** with admin credentials
2. **Navigate** to "Materials" in sidebar
3. **Create Categories**:
   - Go to "Categories" tab
   - Click "Add Category"
   - Add root: "Packing Materials"
   - Add children: "Boxes", "Tape", "Labels"
4. **Add Materials**:
   - Go to "Materials" tab
   - Click "Add Material"
   - Fill SKU, Name, select Category
   - Set min stock level
5. **Manage Stock**:
   - Go to "Stock" tab
   - Add stock batches

---

## Troubleshooting

### Can't Login?
- Check servers are running (backend: 5000, frontend: 3000)
- Verify email/password are correct
- Check browser console for errors

### "Invalid credentials" error?
- Run `npx ts-node create-admin.ts` to reset admin user
- Clear browser cache and try again

### No data showing?
- Login first as admin
- Check JWT token in localStorage (F12 → Application → Local Storage)
- Verify backend is connected to database

---

**Last Updated**: 2025-10-25
**System Status**: ✅ READY
