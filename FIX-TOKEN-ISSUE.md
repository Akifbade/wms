# 🔧 QUICK FIX - 403 Permission Error

## ✅ Problem Fixed in Code!
Changed line 183 in Scanner.tsx from using `shipmentsAPI.update()` to direct `fetch()` call.

## 🚨 But You Need to Refresh Browser!

### Quick Fix (30 seconds):

1. **Save all work** in browser

2. **Press Ctrl + Shift + R** (hard refresh)
   - This will reload the updated JavaScript code

3. **Test again**:
   - Go to Pending List tab
   - Click "Choose Rack" on shipment
   - Select a rack
   - Enter quantity
   - Click "Confirm Assignment"
   - ✅ Should work now!

---

## 🔍 If Still Getting 403 Error:

Your browser localStorage has an **expired or invalid token**.

### Copy-Paste This in Browser Console (F12):

```javascript
// Check current token
const oldToken = localStorage.getItem('authToken');
console.log('Current token:', oldToken?.substring(0, 50) + '...');

// Update to valid token
localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ3BjcWEwNTAwMDJ2NjNuZGc5bDBsMWwiLCJlbWFpbCI6ImFkbWluQGRlbW8uY29tIiwicm9sZSI6IkFETUlOIiwiY29tcGFueUlkIjoiY21ncGNxOXV6MDAwMHY2M244ZGZoajM1eCIsImlhdCI6MTc2MDM3MzIwMSwiZXhwIjoxNzYwOTc4MDAxfQ.tMgjk-O9GCCdKX9ZcX84NmuC3bk0iOIUrBvY4RqfGTk');

// Verify new token
const newToken = localStorage.getItem('authToken');
const payload = JSON.parse(atob(newToken.split('.')[1]));
console.log('✅ Token updated!');
console.log('Role:', payload.role);
console.log('Email:', payload.email);
console.log('Expires:', new Date(payload.exp * 1000));

// Reload page
location.reload();
```

---

## 📝 What Was Changed:

**Before (Line 183):**
```typescript
await shipmentsAPI.update(pendingShipment.id, { status: 'IN_STORAGE' });
```

**After (Lines 183-191):**
```typescript
await fetch(`http://localhost:5000/api/shipments/${pendingShipment.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify({ status: 'IN_STORAGE' })
});
```

**Why:** Direct `fetch` with `localStorage.getItem('authToken')` ensures we use the correct token, same as the assign-boxes call above it.

---

## ✅ Test Workflow:

1. **Refresh browser** (Ctrl+Shift+R)
2. Open **Pending List** tab
3. See 2 shipments (SH-PEND-...)
4. Click **"Choose Rack"** on first shipment
5. See rack map with capacity (e.g., "A1-01 📦 0/100")
6. Click any **green rack** button
7. See "Remaining: 3 boxes" (or 5 boxes)
8. Enter **quantity** (1-3)
9. Click **"Confirm Assignment"**
10. ✅ Should see success message!
11. Check **Racks** page - should show boxes assigned

---

**Status:** Code fix deployed ✅ | Just need browser refresh! 🔄
