# 🔄 How to Switch Between Parse & Prisma

## ⚡ Quick Switch (2 minutes)

### Option 1: Use Git Branch (SAFEST)
```powershell
# Switch to stable Prisma
git checkout stable/prisma-mysql-production
git pull

# Switch back to Parse development
git checkout feature/parse-migration
git pull
```

### Option 2: Keep Both, Switch Backend Directory
Current setup:
- `backend/` = Parse version (for docker-compose)
- `BACKUP-PRISMA-MYSQL/backend/` = Prisma backup (untouched)

To swap:
```powershell
# 1. Backup current Parse work
Copy-Item backend backend-parse-latest -Recurse

# 2. Restore Prisma
Copy-Item BACKUP-PRISMA-MYSQL/backend . -Recurse -Force

# 3. Restart docker
docker-compose restart backend

# 4. Test login at http://localhost (should work immediately)
```

To switch back to Parse:
```powershell
# 1. Restore Parse
Copy-Item backend-parse-latest backend -Recurse -Force

# 2. Restart docker
docker-compose restart backend
```

---

## 📋 Checklist: Verify System is Running

### After switching, test these:

**Login Test:**
```powershell
$body = @{email='qa@example.com'; password='StrongPass123'} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST -Body $body -ContentType "application/json"
```

**Dashboard Test:**
```powershell
$token = "eyJhbGc..." # from login response
Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard/stats" `
  -Headers @{Authorization="Bearer $token"}
```

**Shipments Test:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/shipments" `
  -Headers @{Authorization="Bearer $token"}
```

---

## 🎯 Development Workflow

### When Building Parse Endpoints:

1. **Create endpoint in `backend/src/routes-parse/`**
   ```typescript
   // Example: warehouse.ts
   router.post('/warehouse/intake', authenticateToken, async (req, res) => {
     // Your logic here
   });
   ```

2. **Test it:**
   ```powershell
   docker-compose restart backend
   # Wait 5 seconds
   # Test the endpoint
   ```

3. **If broken, instant rollback:**
   ```powershell
   # Switch to Prisma
   Copy-Item BACKUP-PRISMA-MYSQL/backend . -Recurse -Force
   docker-compose restart backend
   ```

4. **Go back to Parse, fix it, try again**
   ```powershell
   Copy-Item backend-parse-latest backend -Recurse -Force
   docker-compose restart backend
   ```

---

## 💾 Backup Strategy

Every endpoint you build should be committed:

```powershell
# After creating warehouse.ts endpoint
git add backend/src/routes-parse/warehouse.ts
git commit -m "Parse: Add warehouse intake endpoint"
git push
```

This way you have:
- **Git history** = All your work preserved
- **BACKUP-PRISMA-MYSQL/** = Working production fallback
- **stable/prisma-mysql-production branch** = Complete Prisma snapshot
- **backend-parse-latest/** = Your current Parse progress

---

## ⚠️ NEVER DO THIS

❌ Don't delete `BACKUP-PRISMA-MYSQL/` folder  
❌ Don't force-push to `stable/prisma-mysql-production`  
❌ Don't edit Prisma code while building Parse  
❌ Don't commit Parse code to `stable/prisma-mysql-production` branch

---

## 🚀 When Parse is Ready for Production

1. **All critical endpoints built & tested** (Phase 1 complete)
2. **Full end-to-end test passes** (intake → release → invoice)
3. **Performance benchmarked** (Parse vs Prisma response times)
4. **Failover tested** (switch to Prisma, switch back, no data loss)

Then:
```powershell
# Create production branch from Parse work
git checkout feature/parse-migration
git checkout -b release/parse-production
git push

# Keep feature/parse-migration for continued development
# Keep stable/prisma-mysql-production as permanent fallback
```

---

## Emergency: System Completely Broken?

```powershell
# 1. Stop everything
docker-compose down

# 2. Restore Prisma fully
rm -r backend
cp -r BACKUP-PRISMA-MYSQL/backend .

# 3. Restart
docker-compose up -d

# System online again in ~30 seconds
# Your team can work while you debug Parse
```

---

## Questions?

Before asking "why isn't Parse working?":
1. Check if Parse is the active backend: `git branch` → should show `feature/parse-migration`
2. Check logs: `docker logs wms-backend-dev`
3. Try Prisma: `git checkout stable/prisma-mysql-production` → does system work?
4. If yes, then issue is Parse-specific
5. If no, then issue is shared (database, docker, config, etc.)

Good luck! Build carefully, test thoroughly, keep Prisma safe. 🎯
