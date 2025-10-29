# Development Workflow - Local → Staging → Production

## ✅ ALWAYS FOLLOW THIS ORDER:

### STEP 1: LOCAL DEVELOPMENT
```bash
cd "C:\Users\USER\Videos\NEW START\backend"
npm run dev

# Test features locally at http://localhost:5000
# Test frontend locally at http://localhost:5173 (Vite dev server)
```

### STEP 2: BUILD FRONTEND
```bash
cd "C:\Users\USER\Videos\NEW START\frontend"
npm run build
# Creates dist/ folder with optimized files
```

### STEP 3: DEPLOY TO STAGING
```bash
# Copy built frontend to staging container
scp -r "dist" root@148.230.107.155:"/tmp/dist-staging"
ssh root@148.230.107.155 "docker cp /tmp/dist-staging/. wms-staging-frontend:/usr/share/nginx/html/"

# Apply database migrations to staging
ssh root@148.230.107.155 "docker exec wms-staging-backend npx prisma db push"

# Restart staging backend
ssh root@148.230.107.155 "docker restart wms-staging-backend"

# Wait 5 seconds
sleep 5

# TEST STAGING: http://148.230.107.155:8080
```

### STEP 4: USER APPROVAL
**Wait for your confirmation that staging works perfectly!**

### STEP 5: DEPLOY TO PRODUCTION
```bash
# When approved, run production deployment
scp -r "dist" root@148.230.107.155:"/tmp/dist-prod"
ssh root@148.230.107.155 "docker cp /tmp/dist-prod/. wms-frontend:/usr/share/nginx/html/"

# Apply migrations
ssh root@148.230.107.155 "docker exec wms-backend npx prisma db push"

# Restart
ssh root@148.230.107.155 "docker restart wms-backend"

# TEST PRODUCTION: https://qgocargo.cloud
```

---

## 📋 CURRENT STATUS:

- ✅ Staging Frontend: **FIXED** (permissions corrected)
- ✅ Staging Backend: **RUNNING** (admin user synced)
- ✅ Staging Database: **READY** (production data copied, rack fields added)
- ⏳ Rack Features: **READY TO TEST** on staging

---

## 🎯 NEXT: Test Rack Features on Staging

Go to: **http://148.230.107.155:8080**

**Login:** admin@demo.com / demo123

**Check:**
1. Can you see **Category filter buttons** on Racks page?
2. Can you **Create new Rack** with category + dimensions?
3. Can you **Edit existing rack** with new fields?

**Tell me YES/NO for each!**
