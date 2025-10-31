# 🔍 Browser Debug Guide - Production Backend Error

## Issue: "Internal Fetch Error" when Moving Shipments to Rack

Since backend is running (health check ✅), the issue is likely:
1. **Authentication/Token Issue** 
2. **CORS Problem**
3. **Wrong API Request Format**
4. **Missing Request Headers**

---

## Step 1: Open Browser Developer Tools

1. Open production site: **http://qgocargo.cloud**
2. Press **F12** (or Right-click → Inspect)
3. Go to **Console** tab
4. Go to **Network** tab

---

## Step 2: Reproduce the Error

1. Login to production
2. Go to **Pending Shipments** page
3. Try to **move shipment to rack**
4. **Watch Console and Network tabs**

---

## Step 3: Check Console Tab

### Look for these errors:

#### ❌ CORS Error:
```
Access to fetch at 'http://qgocargo.cloud/api/...' has been blocked by CORS policy
```
**Fix:** Backend CORS configuration issue

#### ❌ 401 Unauthorized:
```
Error: Request failed with status code 401
```
**Fix:** Token expired or not being sent

#### ❌ 404 Not Found:
```
Error: Request failed with status code 404
```
**Fix:** Wrong API endpoint URL

#### ❌ 500 Internal Server Error:
```
Error: Request failed with status code 500
```
**Fix:** Backend code error or database issue

#### ❌ Network Error:
```
TypeError: Failed to fetch
```
**Fix:** Backend not reachable or nginx proxy issue

---

## Step 4: Check Network Tab

### Find the failing request:

1. **Click on the red/failed request**
2. **Check "Headers" tab:**
   - Request URL: Should be `http://qgocargo.cloud/api/...`
   - Request Method: POST or PUT
   - Status Code: Look for 4xx or 5xx
   
3. **Check "Request" section:**
   - Look for `Authorization: Bearer <token>`
   - Look for `Content-Type: application/json`
   - Check request body

4. **Check "Response" tab:**
   - Look for error message
   - Check if response is HTML (wrong) or JSON (correct)

5. **Check "Timing" tab:**
   - If request takes 0ms and fails = Network/CORS issue
   - If request takes long time = Backend processing issue

---

## Step 5: Common Fixes Based on Error

### Fix 1: Token Not Being Sent
**Error:** `401 Unauthorized` or `Access token required`

**Check:**
```javascript
// In Console tab, type:
localStorage.getItem('token')
```

**If null:**
```javascript
// Re-login or set token manually
localStorage.setItem('token', 'your-token-here')
// Refresh page
location.reload()
```

**Permanent Fix:** Check `frontend/src/contexts/AuthContext.tsx`
- Ensure token is saved after login
- Ensure token is sent with API requests

---

### Fix 2: CORS Error
**Error:** `blocked by CORS policy`

**SSH Fix:**
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

# Check backend .env
cat backend/.env | grep FRONTEND_URL

# Should be:
# FRONTEND_URL=http://qgocargo.cloud

# If wrong, fix it:
nano backend/.env
# Update: FRONTEND_URL=http://qgocargo.cloud

# Restart backend
docker restart wms-backend

# Wait 10 seconds
sleep 10

# Test
curl http://qgocargo.cloud/api/health
```

---

### Fix 3: Wrong API URL
**Error:** 404 or request going to wrong URL

**Check frontend build:**
```bash
ssh root@148.230.107.155

# Check what API URL frontend is using
docker exec wms-frontend grep -r "api" /usr/share/nginx/html/*.js | head -5

# Should see: http://qgocargo.cloud/api or relative /api
```

**If wrong, rebuild frontend:**
```bash
# On local machine
cd frontend

# Create .env.production if not exists
echo "VITE_API_URL=/api" > .env.production

# Build
npm run build

# Deploy to production
scp -r dist/* root@148.230.107.155:"/root/NEW START/frontend/dist/"

# SSH and update
ssh root@148.230.107.155
docker cp "/root/NEW START/frontend/dist/." wms-frontend:/usr/share/nginx/html/
docker exec wms-frontend nginx -s reload
```

---

### Fix 4: Request Format Issue
**Error:** 400 Bad Request or 422 Unprocessable Entity

**In Console, check the exact request:**
```javascript
// Right-click on failed request in Network tab
// Copy → Copy as fetch

// Paste in Console to see exact request
// Example:
fetch("http://qgocargo.cloud/api/shipments/assign-rack", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + localStorage.getItem('token'),
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    shipmentId: "cmxxxx",
    rackId: "A1"
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Check response for validation errors**

---

### Fix 5: Backend Code Error (500)
**Error:** `500 Internal Server Error`

**Check backend logs:**
```bash
ssh root@148.230.107.155

# Real-time logs
docker logs -f wms-backend

# Or last 100 lines
docker logs --tail 100 wms-backend | grep -A 10 -B 5 -i error
```

**Look for:**
- Stack traces
- Database errors
- Validation errors
- Unhandled exceptions

**Common causes:**
1. Database connection lost
2. Missing table/column
3. Type mismatch (expecting number, got string)
4. Null reference error

---

## Step 6: Compare with Working Staging

### Staging endpoint (working):
```
http://148.230.107.155:8080/api/shipments/assign-rack
```

### Production endpoint (not working):
```
http://qgocargo.cloud/api/shipments/assign-rack
```

### In Browser Console, test both:

```javascript
// Test staging (should work)
fetch("http://148.230.107.155:8080/api/health")
  .then(r => r.json())
  .then(console.log)

// Test production (check if works)
fetch("http://qgocargo.cloud/api/health")
  .then(r => r.json())
  .then(console.log)
```

### If staging works but production doesn't:
- **Environment variables are different**
- **Database state is different**
- **Code version is different**

---

## Quick Commands to Run NOW

### 1. Check Browser Console:
```
F12 → Console → Look for red errors
```

### 2. Check Network Tab:
```
F12 → Network → Try action → Click failed request → Response tab
```

### 3. Get exact error message:
```javascript
// In Console:
localStorage.getItem('token')  // Check if token exists
```

### 4. SSH and check backend logs:
```bash
ssh root@148.230.107.155
docker logs --tail 50 wms-backend
```

### 5. Compare backend .env files:
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

echo "=== Production Backend .env ==="
cat backend/.env

echo ""
echo "=== Staging Backend .env ==="
cat staging-backend/.env 2>/dev/null || echo "Staging .env not found"
```

---

## Immediate Action Plan

**Do this RIGHT NOW:**

1. **Open production in browser**: http://qgocargo.cloud

2. **Open Console (F12)**

3. **Try to move shipment to rack**

4. **Copy EXACT error message from Console**

5. **Send me the error message** so I can give you exact fix

---

## Most Likely Issues (Based on Symptoms):

### 90% Probability: Authentication Token Issue
- Token not saved properly after login
- Token not sent with request
- Token format wrong

### 5% Probability: CORS Configuration
- Backend not allowing production origin
- Missing CORS headers

### 3% Probability: Database State
- Production database missing data
- Rack IDs don't match

### 2% Probability: Code Difference
- Production has old code
- Missing migration

---

**Next Step:** Run this and send me output:

```bash
ssh root@148.230.107.155
docker logs --tail 30 wms-backend
```

And also browser console error screenshot!
