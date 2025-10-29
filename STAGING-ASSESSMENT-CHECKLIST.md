# 🧪 STAGING ASSESSMENT CHECKLIST
## Complete Testing Guide for Staging Environment

---

## 📋 BEFORE YOU DEPLOY TO STAGING:

### Pre-Deployment Checks:
```
✓ Code changes committed locally
✓ No uncommitted changes in git
✓ Docker running properly
✓ Enough disk space available
✓ No port conflicts (8080, 5001, 3308 should be free)
```

---

## 🚀 HOW TO DEPLOY TO STAGING:

```powershell
# Step 1: Go to project folder
cd "C:\Users\USER\Videos\NEW START"

# Step 2: Deploy staging
.\deploy.ps1 staging

# Wait 15-20 seconds for containers to start
# Output will show:
# ✓ Building staging services...
# ✓ Starting staging containers...
# ✓ Testing endpoints...
```

---

## 🧪 AFTER STAGING STARTS - TEST EVERYTHING:

### 1. **Check if Staging Is Running:**

```powershell
# Command:
docker ps | findstr staging

# You should see:
# staging-frontend    Port 8080
# staging-backend     Port 5001
# staging-database    Port 3308

# If all 3 showing = ✅ Staging is UP
# If any missing = ❌ Problem - check logs
```

---

## 🌐 TEST 1: FRONTEND (Web Interface)

### Open Browser:
```
URL: http://localhost:8080
```

### What to Check:
```
✓ Page loads without errors
✓ No 500 errors
✓ CSS styles working (not blank page)
✓ All buttons visible
✓ No console errors (F12 → Console)
```

### If It Works:
```
✅ Frontend staging is good!
```

### If It Doesn't:
```bash
# Check frontend logs:
docker logs staging-frontend --tail 50

# Or:
docker logs staging-frontend -f  (live logs)
```

---

## 🔑 TEST 2: LOGIN (Authentication)

### Step 1: Try Login
```
URL: http://localhost:8080
Email: admin@demo.com
Password: demo123
```

### What Should Happen:
```
✓ Login button works
✓ No error messages
✓ Redirects to dashboard
✓ Your name shows in sidebar/header
✓ Session persists (refresh page - still logged in)
```

### If Login Works:
```
✅ Backend authentication is working!
```

### If Login Fails:
```bash
# Check backend logs:
docker logs staging-backend --tail 50

# Check database connection:
docker logs staging-database --tail 20

# Or check API directly:
curl http://localhost:5001/health
```

---

## 📊 TEST 3: DATABASE (Data Operations)

### Try These Operations:

#### Create Something:
```
✓ Click "Add New" button
✓ Fill form fields
✓ Click "Save" button
✓ See success message
✓ Item appears in list
```

#### Read Data:
```
✓ See existing data on list pages
✓ Click on item to view details
✓ All fields display correctly
✓ No loading loops
```

#### Update Something:
```
✓ Edit existing item
✓ Change a field
✓ Click "Update"
✓ See updated value
```

#### Delete Something:
```
✓ Click delete button
✓ Item removed from list
✓ No error message
```

### If All Works:
```
✅ Database staging is perfect!
```

### If Fails:
```bash
# Check database logs:
docker logs staging-database --tail 20

# Check backend logs:
docker logs staging-backend --tail 50

# Connect to database directly:
mysql -h 127.0.0.1 -P 3308 -u staging_user -p
# Password: stagingpass123
```

---

## 📁 TEST 4: FILE UPLOADS (Images, Documents)

### Try Upload Feature:
```
✓ Find upload button
✓ Select image/file
✓ Click "Upload"
✓ See upload progress
✓ File appears in list
✓ Can view/download file
```

### Check Upload Folder:
```bash
# See uploaded files:
docker exec staging-backend ls -lah /app/uploads/

# Expected folders:
# logos/
# documents/
# damages/
# temp/
# job-files/
# shipments/
```

### If Uploads Work:
```
✅ File system staging is working!
```

### If Fails:
```bash
# Check uploads folder exists:
docker exec staging-backend mkdir -p /app/uploads/{logos,documents,damages,temp,job-files,shipments}

# Set permissions:
docker exec staging-backend chmod -R 777 /app/uploads

# Check backend logs:
docker logs staging-backend --tail 50
```

---

## ⚡ TEST 5: API ENDPOINTS (Backend)

### Check Backend Health:
```bash
# Health check:
curl http://localhost:5001/health

# Should return: 200 OK

# Get version info:
curl http://localhost:5001/api/version

# Should return JSON with version info
```

### Test API Directly:
```bash
# Get users:
curl http://localhost:5001/api/users

# Create user:
curl -X POST http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Get specific user:
curl http://localhost:5001/api/users/1
```

### If API Responds:
```
✅ Backend API staging is working!
```

### If API Fails:
```bash
# Check backend status:
docker ps | grep staging-backend

# Check logs:
docker logs staging-backend --tail 100

# Restart backend:
docker restart staging-backend

# Wait 5 seconds then test again
```

---

## 🔍 TEST 6: PERFORMANCE (Speed & Stability)

### Measure Response Times:
```bash
# Frontend load time:
time curl http://localhost:8080

# Should be < 2 seconds

# API response time:
time curl http://localhost:5001/health

# Should be < 500ms
```

### Memory Usage:
```bash
# Check container sizes:
docker stats staging-frontend staging-backend staging-database

# Should see reasonable memory usage
# If sky-high = performance problem
```

### Load Test (Optional):
```bash
# Install Apache Bench:
# Then run:
ab -n 100 -c 10 http://localhost:8080/

# Results show if site can handle traffic
```

---

## 🛡️ TEST 7: ERROR HANDLING

### Try to Break It (Intentionally):

```
✓ Try invalid login (wrong password)
  Expected: Error message

✓ Try create with missing fields
  Expected: Validation error

✓ Try upload oversized file
  Expected: Size error

✓ Try SQL injection in search
  Expected: No database error shown

✓ Try accessing admin page as user
  Expected: Permission denied (not error page)
```

### If Errors Handled Well:
```
✅ Error handling staging is good!
```

---

## 📝 TESTING FORM: Fill This Out

```
DATE: _______________
TESTER: _______________

Frontend Loads?          [ ] YES  [ ] NO
Login Works?             [ ] YES  [ ] NO
Data CRUD Operations?    [ ] YES  [ ] NO
File Uploads?            [ ] YES  [ ] NO
API Endpoints?           [ ] YES  [ ] NO
Performance OK?          [ ] YES  [ ] NO
Error Handling?          [ ] YES  [ ] NO

Issues Found:
1. _____________________________________
2. _____________________________________
3. _____________________________________

Ready for Production?    [ ] YES  [ ] NO

Approved By: _____________  Date: _______
```

---

## 🚨 COMMON STAGING ISSUES & FIXES:

### Issue 1: "Cannot GET http://localhost:8080"
```
Cause: Frontend container not running
Fix:
  docker restart staging-frontend
  Wait 5 seconds
  Refresh browser
```

### Issue 2: Login Page Shows but Login Fails
```
Cause: Backend not connected to database
Fix:
  docker logs staging-backend --tail 50
  docker logs staging-database --tail 20
  docker restart staging-backend staging-database
```

### Issue 3: "Connection Refused" Error
```
Cause: Port 8080/5001/3308 already in use
Fix:
  # Kill process on that port:
  netstat -ano | findstr :8080
  taskkill /PID <PID> /F
  
  Or restart Docker completely:
  docker-compose -f docker-compose-dual-env.yml down
  docker-compose -f docker-compose-dual-env.yml up -d staging-frontend staging-backend staging-database
```

### Issue 4: Database Schema Mismatch
```
Cause: Schema not synced
Fix:
  docker exec staging-backend npx prisma db push --accept-data-loss
  docker restart staging-backend
```

### Issue 5: File Upload Fails
```
Cause: Permissions issue
Fix:
  docker exec staging-backend chmod -R 777 /app/uploads
  Retry upload
```

---

## ✅ COMPLETE STAGING TEST CHECKLIST:

### Functionality:
- [ ] Frontend loads on http://localhost:8080
- [ ] Login successful with admin@demo.com / demo123
- [ ] Dashboard displays without errors
- [ ] Can create new records
- [ ] Can read/view records
- [ ] Can update records
- [ ] Can delete records
- [ ] File uploads working
- [ ] API endpoints responding

### Performance:
- [ ] Frontend loads in < 2 seconds
- [ ] API responses in < 500ms
- [ ] No memory leaks
- [ ] No CPU spike

### Stability:
- [ ] No 500 errors
- [ ] No console errors (F12)
- [ ] Session stays active
- [ ] Can refresh page without issues

### Security:
- [ ] Login validation working
- [ ] Only authenticated users can access
- [ ] Role-based permissions enforced
- [ ] No sensitive data in console

---

## 🎯 DECISION POINT:

### If ALL Tests Pass ✅
```
✅ STAGING IS PERFECT!
Next: Deploy to PRODUCTION

Command:
.\deploy.ps1 production

Type: CONFIRM
```

### If Some Tests Fail ❌
```
❌ FIX STAGING FIRST!

Steps:
1. Check error logs
2. Fix the issue locally
3. Commit changes to git
4. Re-deploy to staging
5. Test again
6. Repeat until all pass
```

### Never Deploy Broken Code to Production!

---

## 🔄 STAGING → PRODUCTION WORKFLOW:

```
Make Code Change
     ↓
Deploy to Staging: .\deploy.ps1 staging
     ↓
Run Complete Tests (use this checklist)
     ↓
All Tests Pass?
     ├─ YES → Deploy to Production
     │        .\deploy.ps1 production
     │        Type: CONFIRM
     │
     └─ NO → Fix Issues
              Go back to "Make Code Change"
```

---

## 📊 ASSESSMENT CRITERIA:

### GOOD Staging (Ready for Production):
```
✅ All tests pass
✅ No errors in logs
✅ Performance acceptable
✅ All features working
✅ User approves
```

### BAD Staging (Keep Testing):
```
❌ Any test fails
❌ Errors in logs
❌ Performance poor
❌ Any feature broken
❌ User reports issues
```

---

## 🎓 KEY LEARNING:

```
Staging is YOUR TEST GROUND!

It's safe to:
- Find bugs
- Test features
- Break things
- Learn what works

DO NOT test in PRODUCTION!
```

---

## 🚀 Ready to Test Staging?

**Command to Start:**
```powershell
.\deploy.ps1 staging
```

**Then Visit:**
```
http://localhost:8080
```

**Login With:**
```
Email: admin@demo.com
Password: demo123
```

**Then Use This Checklist!** ✅

---

**Created:** October 28, 2025
**Purpose:** Complete Staging Assessment Guide
**Status:** READY TO USE
