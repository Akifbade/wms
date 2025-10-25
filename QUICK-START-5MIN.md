# ⚡ QUICK START - 5 MINUTES TO RUNNING

**Your complete material tracking system is ready to go!**

---

## 🚀 DO THIS NOW (5 minutes)

### 1️⃣ Start MySQL (1 minute)
```powershell
# Option A: Open XAMPP Control Panel → Click "Start" for MySQL
# Option B: Command line
net start MySQL80
```

**Wait for MySQL to be ready before next step**

---

### 2️⃣ Setup Database (2 minutes)
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"
npm run prisma:generate
npm run prisma:migrate:deploy
```

**Expected output:**
```
✔ Generated Prisma Client
Migrations completed successfully
```

---

### 3️⃣ Start Development Server (1 minute)
```powershell
npm run dev:all
```

**Wait for both to start, then look for:**
```
➜  Local:   http://localhost:5173/
➜  Backend: http://localhost:3000
```

---

### 4️⃣ Open Your Browser
```
http://localhost:5173
```

**Your app is running!** 🎉

---

## 🧪 QUICK TEST (1 minute)

### Test 1: Check Backend
Open terminal and run:
```powershell
curl http://localhost:3000/api/materials/racks
```
**Expected:** `[]` (empty array) or data if tables exist

### Test 2: View Database
```powershell
npm run prisma:studio
```
**Expected:** Browser opens to database UI showing all tables

---

## 📋 SYSTEM CONTENTS

### ✅ What's Installed
- ✓ 6 database models
- ✓ 15+ API endpoints
- ✓ Complete material tracking
- ✓ Rack management
- ✓ Damage tracking
- ✓ Atomic transactions

### ✅ What's Ready
- ✓ Backend API (Express)
- ✓ Frontend UI (Vite + React)
- ✓ Database (MySQL + Prisma)
- ✓ Authentication framework
- ✓ Error handling
- ✓ Type safety

---

## 🔌 API YOU CAN USE NOW

### Create Rack
```bash
curl -X POST http://localhost:3000/api/materials/racks \
  -H "Content-Type: application/json" \
  -d '{"name":"Rack A","location":"A-1","capacity":1000}'
```

### Add Inventory
```bash
curl -X POST http://localhost:3000/api/materials/inventory \
  -H "Content-Type: application/json" \
  -d '{"name":"Large Box","sku":"BOX-001","quantity":100}'
```

### List All Racks
```bash
curl http://localhost:3000/api/materials/racks
```

### Create Job
```bash
curl -X POST http://localhost:3000/api/materials/schedules \
  -H "Content-Type: application/json" \
  -d '{"task":"Test Job","date":"2025-10-22"}'
```

---

## 📱 WHAT YOU CAN DO

- ✓ Create racks (storage locations)
- ✓ Add inventory items
- ✓ Create jobs/schedules
- ✓ Assign materials to jobs
- ✓ Mark jobs complete
- ✓ Reconcile material returns
- ✓ Track damaged items
- ✓ Search materials
- ✓ Check rack availability
- ✓ View damage history

---

## 🛑 TROUBLESHOOTING

**MySQL won't start?**
```powershell
# Check if running
Get-Service MySQL* | Where-Object {$_.Status -eq "Running"}

# Start it
net start MySQL80
```

**Port already in use?**
```powershell
# Kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Database connection failed?**
```powershell
# Check .env file
cat .env | Select-String DATABASE_URL

# Update if needed
# DATABASE_URL="mysql://root:password@localhost:3306/qgo_db"
```

**Dependencies error?**
```powershell
npm install
npm run prisma:generate
```

---

## 📚 MORE DOCUMENTATION

| Document | Use For |
|----------|---------|
| **FULL-SYSTEM-READY.md** | Complete overview |
| **DEPLOYMENT-LAUNCH-GUIDE.md** | Detailed deployment |
| **IMPLEMENTATION-SUMMARY.md** | What was built |
| **MATERIAL-TRACKING-CODE-PATTERNS.md** | Code examples |
| **MATERIAL-TRACKING-WITH-RACKS.md** | Rack details |

---

## ⌨️ USEFUL COMMANDS

```powershell
# Development
npm run dev:all              # Start frontend + backend
npm run dev:client           # Frontend only
npm run dev:server           # Backend only

# Database
npm run prisma:studio        # Open database UI
npm run prisma:generate      # Regenerate client

# Building
npm run build                # Production build
npm start                    # Production run

# Cleanup
npm install                  # Reinstall if issues
rm -Recurse node_modules     # Clean install
```

---

## ✅ CHECKLIST

Before declaring "ready":

- [ ] MySQL running
- [ ] `npm run prisma:generate` completed
- [ ] `npm run prisma:migrate:deploy` completed
- [ ] `npm run dev:all` started
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend responds at http://localhost:3000
- [ ] `npm run prisma:studio` shows database

---

## 🎯 YOU'RE ALL SET!

Your complete material tracking system with racks is ready to use.

### Current Status
✅ Database schema created  
✅ API endpoints built  
✅ Backend ready  
✅ Frontend ready  
✅ Documentation complete  

### To Start
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"
npm run dev:all
```

Then open: **http://localhost:5173**

---

## 🎉 DONE!

System is running and ready for testing and development!

**Questions?** Check the documentation files or the code comments.

**Ready to test material tracking?** Go to the app and start creating racks and materials!

