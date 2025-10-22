# 🔍 Debug Token Issue - 403 Forbidden Error

## Problem
Scanner shows error: **"403 Forbidden - You do not have permission to perform this action"**

## Root Cause
The token in browser's localStorage might be:
- Expired
- Missing ADMIN role
- Different from the test token

## Solution: Check & Update Token

### Step 1: Check Current Token in Browser
1. Open browser (where app is running)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Type and press Enter:
```javascript
localStorage.getItem('authToken')
```
5. Copy the token value

### Step 2: Decode Token to Check Role
Paste this in Console:
```javascript
const token = localStorage.getItem('authToken');
const payload = token.split('.')[1];
const decoded = JSON.parse(atob(payload));
console.log('Token Info:', decoded);
console.log('Role:', decoded.role);
console.log('Email:', decoded.email);
console.log('Expires:', new Date(decoded.exp * 1000));
```

### Step 3: Check If Token is Expired
```javascript
const token = localStorage.getItem('authToken');
const payload = JSON.parse(atob(token.split('.')[1]));
const expiry = new Date(payload.exp * 1000);
const now = new Date();
if (now > expiry) {
  console.log('❌ TOKEN IS EXPIRED!');
} else {
  console.log('✅ Token is valid');
}
```

### Step 4: Use Valid Token (If Needed)
If token is expired or invalid, use this valid ADMIN token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ3BjcWEwNTAwMDJ2NjNuZGc5bDBsMWwiLCJlbWFpbCI6ImFkbWluQGRlbW8uY29tIiwicm9sZSI6IkFETUlOIiwiY29tcGFueUlkIjoiY21ncGNxOXV6MDAwMHY2M244ZGZoajM1eCIsImlhdCI6MTc2MDM3MzIwMSwiZXhwIjoxNzYwOTc4MDAxfQ.tMgjk-O9GCCdKX9ZcX84NmuC3bk0iOIUrBvY4RqfGTk
```

**Valid until:** October 20, 2025 (6 days remaining)

In browser Console, run:
```javascript
localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZ3BjcWEwNTAwMDJ2NjNuZGc5bDBsMWwiLCJlbWFpbCI6ImFkbWluQGRlbW8uY29tIiwicm9sZSI6IkFETUlOIiwiY29tcGFueUlkIjoiY21ncGNxOXV6MDAwMHY2M244ZGZoajM1eCIsImlhdCI6MTc2MDM3MzIwMSwiZXhwIjoxNzYwOTc4MDAxfQ.tMgjk-O9GCCdKX9ZcX84NmuC3bk0iOIUrBvY4RqfGTk');
console.log('✅ Token updated! Refresh page now (Ctrl+R)');
```

Then press **Ctrl + R** to refresh the page.

### Step 5: Test Again
1. Go to Pending List tab
2. Click "Choose Rack" on a shipment
3. Select a rack from the map
4. Enter box quantity (1-3)
5. Click "Confirm Assignment"
6. Should work now! ✅

## Alternative: Re-login
If token keeps expiring, just log out and log in again:
- Email: `admin@demo.com`
- Password: _(check your setup - might be "Admin@123" or "admin123")_

---

**Status**: Token is valid for 6 more days. Issue might be browser has different/old token in localStorage.
