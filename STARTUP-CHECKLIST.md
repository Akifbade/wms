# 🚀 STARTUP CHECKLIST - GET EVERYTHING RUNNING

**Last Updated:** October 22, 2025  
**Status:** Ready to Deploy

---

## ✅ Pre-Flight Checks (Do These First)

### 1. Check Node & Dependencies
```powershell
# Check if Node is installed
node -v
npm -v

# Navigate to project
cd "c:\Users\USER\Videos\NEW START\qgo"

# Check if node_modules exists
ls node_modules | Measure-Object
```

**Expected:** Node v18+, npm v9+, node_modules folder exists

---

### 2. Check Database Connection
```powershell
# Check if MySQL is running
# Either XAMPP is running OR MySQL service is running

# Test database access
# Open phpmyadmin or MySQL CLI and verify

Get-Service mysql* | Where-Object {$_.Status -eq "Running"}
```

**Expected:** MySQL service running, can connect to database

---

## 🔧 Setup Steps (One Time Only)

### Step 1: Install Dependencies (if not already done)
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"
npm install
```
**Duration:** 2-3 minutes  
**Expected:** `added X packages` message

---

### Step 2: Setup Prisma (if not already done)
```powershell
# Generate Prisma client
npm run prisma:generate

# Create/update database schema
npm run prisma:migrate:deploy
```
**Duration:** 1-2 minutes  
**Expected:** Schema synced with database

---

### 3: Verify Database Tables
```powershell
# Connect to MySQL
mysql -u root -p

# In MySQL client:
USE qgo;
SHOW TABLES;
DESCRIBE schedules;
```

**Expected:** Tables exist: `users`, `schedules`, `inventory`, etc.

---

## 🎯 Daily Startup (Quick - 30 seconds)

### Option A: Development Mode (Recommended for testing)
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"

# Start frontend + backend together
npm run dev:all
```

**Expected output:**
```
➜  Local:   http://localhost:5173/
  ➜  press h to show help
  ➜  Backend running on http://localhost:3000
```

---

### Option B: Frontend Only (if backend already running)
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"
npm run dev:client
```

**Expected output:**
```
➜  Local:   http://localhost:5173/
```

---

### Option C: Production Mode (After building)
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"
npm start
```

**Expected output:**
```
Server listening on port 3000
Frontend serving on port 3000
```

---

## 📊 Access the Application

### After starting dev:all:

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | http://localhost:5173 | UI interface |
| **Backend** | http://localhost:3000 | API endpoints |
| **Database** | phpMyAdmin | See/edit data |

**Login:**
- Email: `admin@qgo.local` (or your admin email)
- Password: Check database or use default

---

## 🔌 API Endpoints (Backend Running)

```powershell
# Check if backend is responding
curl http://localhost:3000/api/health

# List all jobs
curl http://localhost:3000/api/jobs

# List all inventory
curl http://localhost:3000/api/inventory

# Create new job (POST)
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"task":"Test Job","date":"2025-10-22"}'
```

---

## 🛑 Troubleshooting

### Problem: Port 5173 already in use
```powershell
# Kill process on port
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port
PORT=5174 npm run dev:client
```

---

### Problem: Database connection failed
```powershell
# Check if MySQL is running
Get-Service -Name MySQL* | Where-Object {$_.Status -eq "Running"}

# Start MySQL (if using XAMPP)
# Open XAMPP Control Panel and click "Start" for MySQL

# Test connection
mysql -u root -p -h 127.0.0.1
```

---

### Problem: Prisma client not found
```powershell
# Regenerate Prisma client
npm run prisma:generate

# Or reinstall everything
rm -Recurse node_modules
npm install
npm run prisma:generate
```

---

### Problem: Tables don't exist
```powershell
# Push schema to database
npm run prisma:migrate:deploy

# Or reset database (WARNING: deletes data)
npx prisma migrate reset
```

---

## 📝 Before First Launch - Verify Files

```powershell
# Check if these key files exist:
ls "c:\Users\USER\Videos\NEW START\qgo\server\index.ts"
ls "c:\Users\USER\Videos\NEW START\qgo\src\main.tsx"
ls "c:\Users\USER\Videos\NEW START\qgo\.env"
ls "c:\Users\USER\Videos\NEW START\qgo\prisma\schema.prisma"
```

---

## 🎓 Project Structure Quick Tour

```
qgo/
├─ src/                      ← React Frontend
│  ├─ main.tsx              (Entry point)
│  ├─ components/           (React components)
│  ├─ pages/                (Pages like Jobs, Inventory)
│  └─ App.tsx               (Main app)
│
├─ server/                   ← Express Backend
│  ├─ index.ts              (Server entry)
│  ├─ routes/               (API endpoints)
│  │  ├─ jobs.ts
│  │  ├─ inventory.ts
│  │  └─ ...
│  └─ middleware/           (Auth, validation)
│
├─ prisma/                   ← Database
│  ├─ schema.prisma         (Database schema)
│  └─ migrations/           (Schema changes)
│
├─ package.json             (Dependencies)
├─ tsconfig.json            (TypeScript config)
├─ vite.config.ts           (Frontend build config)
└─ .env                     (Environment variables)
```

---

## 🎯 Material Tracking Quick Features

Once running, test these features:

### 1. Create a Job ✓
```
Navigate to: /jobs
Click: "Create New Job"
Fill: task, date, crew
Click: "Save"
```

### 2. Add Materials ✓
```
Click: "Add Materials"
Search: "box" or item name
Select: Item and quantity
Click: "Confirm"
Inventory updates immediately
```

### 3. Mark Complete ✓
```
Click: "Mark as Complete"
Status: "Pending Confirmation"
```

### 4. Confirm Returns (Supervisor) ✓
```
Click: "Confirm Material Returns"
Enter: Good qty, damaged qty
Upload: Photo
Notes: What happened
Click: "Finish Job"
Inventory returns updated
```

---

## 📚 Documentation Reference

| File | Purpose | Read Time |
|------|---------|-----------|
| **README-MATERIAL-TRACKING.md** | System overview | 5 min |
| **MATERIAL-TRACKING-DEEP-ANALYSIS.md** | Complete technical details | 20 min |
| **MATERIAL-TRACKING-VISUAL-GUIDE.md** | Diagrams and examples | 15 min |
| **MATERIAL-TRACKING-CODE-PATTERNS.md** | Code implementations | 10 min |
| **MATERIAL-TRACKING-WITH-RACKS.md** | Rack integration | 15 min |
| **CHEAT-SHEET.md** | One-page quick ref | 2 min |

---

## ⚡ Quick Commands Reference

```powershell
# Development
npm run dev:all              # Start frontend + backend

# Build
npm run build               # Build frontend + backend

# Database
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate:deploy # Sync schema
npm run prisma:studio       # Open database UI

# Testing
npm run dev:client          # Frontend only
npm run dev:server          # Backend only
npm run preview             # Preview built app

# Production
npm start                   # Production start
```

---

## ✅ System Ready Checklist

Before declaring "ready to use", verify:

- [ ] Node.js and npm installed
- [ ] MySQL service running
- [ ] `npm install` completed
- [ ] `npm run prisma:migrate:deploy` completed
- [ ] Database tables exist
- [ ] `npm run dev:all` starts without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend responds at http://localhost:3000/api/health
- [ ] Can login with admin credentials
- [ ] Can create a job
- [ ] Can add materials to job
- [ ] Can mark job complete
- [ ] Inventory updates correctly

---

## 🎉 You're Ready!

Once all checks pass, you have:
✓ Full material tracking system  
✓ Job management with crew assignment  
✓ Inventory management with racks  
✓ Material reconciliation  
✓ Damage tracking  
✓ Complete audit trail  

**Next steps:** Start `npm run dev:all` and test the system!

---

## 📞 Quick Help

- **Frontend issues?** Check browser console (F12)
- **Backend issues?** Check terminal output where npm started
- **Database issues?** Use phpMyAdmin to inspect
- **Build issues?** Run `npm install` again and `npm run prisma:generate`

**Everything documented in:**
- Material Tracking docs
- This startup guide
- Code patterns file

Happy building! 🚀
