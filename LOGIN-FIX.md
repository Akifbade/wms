                                                                                                                                                                                                                                                                                                a# 🔧 Login Issue - Quick Fix

## 🐛 Problem
Frontend can't reach backend API - "Failed to fetch" error

## ✅ Solution

### Step 1: Verify Both Servers Running
```powershell
# Check ports
netstat -ano | findstr ":3000"  # Should show frontend
netstat -ano | findstr ":5000"  # Should show backend
```

### Step 2: Hard Refresh Browser
**This is the most common fix!**

1. Open browser at http://localhost:3000
2. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
3. This clears cache and forces reload

### Step 3: If Still Not Working - Restart Everything

```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start Backend
cd "c:\Users\USER\Videos\NEW START\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Wait 3 seconds for backend to start
Start-Sleep -Seconds 3

# Start Frontend
cd "c:\Users\USER\Videos\NEW START\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Wait 3 seconds for frontend to start
Start-Sleep -Seconds 3

Write-Host "✅ Both servers should be running now!" -ForegroundColor Green
Write-Host "Open: http://localhost:3000" -ForegroundColor Cyan
```

### Step 4: Test Login
1. Open: **http://localhost:3000**
2. **Hard refresh:** Ctrl + Shift + R
3. Login:
   - Email: `admin@demo.com`
   - Password: `demo123`

---

## 🎯 Quick One-Command Fix

Copy and paste this entire block:

```powershell
# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\USER\Videos\NEW START\backend'; npm run dev"
Start-Sleep -Seconds 3

# Start frontend in new window  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\USER\Videos\NEW START\frontend'; npm run dev"
Start-Sleep -Seconds 3

# Open browser
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Servers Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:5000 ✅" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000 ✅" -ForegroundColor White
Write-Host ""
Write-Host "Login with:" -ForegroundColor Cyan
Write-Host "Email: admin@demo.com" -ForegroundColor White
Write-Host "Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+Shift+R in browser to hard refresh!" -ForegroundColor Yellow
```

---

## 🔍 Debugging

### Check if Backend is Responding:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

**Expected:** Should return status info

### Check if Frontend Proxy Works:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```

**Expected:** Should return same as backend (proxied)

### Test Login Directly:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@demo.com","password":"demo123"}'
```

**Expected:** Should return token

---

## ✅ Verification Steps

After running the one-command fix:

1. Wait for both PowerShell windows to open
2. Backend window should show: "🚀 Server is running on http://localhost:5000"
3. Frontend window should show: "➜ Local: http://localhost:3000/"
4. Browser should open automatically
5. **Press Ctrl + Shift + R** in browser
6. Login page should load
7. Login with admin@demo.com / demo123
8. Should work!

---

## 🎨 Then Test Branding

Once logged in:
1. Go to **Settings** → **Branding & Appearance**
2. Upload logo
3. Change colors
4. Save
5. Logout
6. See branded login page!

---

**Run the one-command fix above and it should work! 🚀**
