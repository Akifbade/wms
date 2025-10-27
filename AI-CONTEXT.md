# PROJECT CONTEXT FILE - AI KO BATAO PROJECT KYA HAI
# ⚠️ Ye file har new chat mein AI ko share karna - MANDATORY!

## 🎯 PROJECT OVERVIEW
**Name:** Warehouse Management System (WMS)
**Type:** Full-stack web application
**Status:** 🟢 **LIVE IN PRODUCTION** - PROTECT DATA AT ALL COSTS!
**Production URL:** http://148.230.107.155 (qgocargo.cloud)
**Live Users:** 4 users, 1 company (REAL DATA - DON'T DELETE!)
**Last Updated:** October 27, 2025 - Logo upload system fixed + Auto-backups active

## 🚨 CRITICAL PRODUCTION RULES FOR AI - READ FIRST!

### 🔴 RULE #1: NEVER DELETE PRODUCTION DATA!
```bash
# ❌ ABSOLUTELY FORBIDDEN - WILL DELETE ALL USER DATA:
docker-compose down -v           # NEVER use -v flag!
docker volume rm newstart_mysql-data
npx prisma db push --accept-data-loss
npx prisma migrate reset

# ✅ SAFE COMMANDS:
docker-compose restart backend
docker-compose up -d --build backend
docker logs wms-backend
```

### 🔴 RULE #2: BACKUP BEFORE ANY DATABASE CHANGE!
```bash
# VPS pe automatic backups har 5 minutes:
ssh root@148.230.107.155 "/root/backup-wms-db.sh"

# Manual backup before changes:
ssh root@148.230.107.155 "docker exec wms-database mysqldump -u root -prootpassword123 warehouse_wms > /root/manual-backup-$(date +%Y%m%d_%H%M%S).sql"

# Verify backup created:
ssh root@148.230.107.155 "ls -lh /root/wms-backups/ | tail -5"
```

### 🔴 RULE #3: TEST LOCALLY FIRST - NEVER ON PRODUCTION!
```powershell
# Local testing required:
docker-compose -f docker-compose.dev.yml up -d
# Test thoroughly
# Only deploy if working perfectly
```

### 🔴 RULE #4: READ DATABASE-SAFETY-GUIDE.md BEFORE ANY WORK!
```
Location: DATABASE-SAFETY-GUIDE.md
Contains: Safe commands, backup procedures, restore steps
MANDATORY reading before database changes!
```

---

## 🌐 PRODUCTION DEPLOYMENT STATUS

### **Server Information:**
- **VPS IP:** 148.230.107.155
- **Domain:** qgocargo.cloud (DNS configured, HTTP only)
- **OS:** Rocky Linux 9
- **Access:** SSH root@148.230.107.155 (password: Qgocargo@123)
- **Project Path:** /root/NEW START/

### **Live Application:**
- **Frontend URL:** http://148.230.107.155 (port 80)
- **Backend API:** http://148.230.107.155:5000
- **Database:** MySQL 8.0 (port 3307 external, 3306 internal)
- **Status:** 🟢 LIVE with real user data

### **Production Data:**
- **Users:** 4 active users (admin@demo.com, manager@demo.com + 2 more)
- **Companies:** 1 company with branding configured
- **Database Size:** ~20KB (growing)
- **Last Backup:** Auto-backup every 5 minutes to /root/wms-backups/

### **Docker Containers:**
```bash
wms-frontend   - Nginx serving React app (port 80)
wms-backend    - Node.js Express API (port 5000)
wms-database   - MySQL 8.0 (port 3307)
git-watcher    - Auto git-pull on push (disabled on VPS)
```

### **Database Credentials:**
```
Host: wms-database (internal) / localhost:3307 (external)
Database: warehouse_wms
Root User: root / rootpassword123
App User: wms_user / wmspassword123
```

### **Backup System:**
```
Location: /root/wms-backups/
Frequency: Every 5 minutes (cron job)
Retention: Last 100 SQL backups
Volume Backup: Daily at 2 AM to /root/volume-backups/
Scripts:
  - /root/backup-wms-db.sh (SQL backup)
  - /root/backup-volume.sh (Volume backup)
  - /root/restore-wms-db.sh (Restore)
  - /root/check-backups.sh (Health check)
```

### **Recent Fixes Applied (Oct 27, 2025):**
1. ✅ **Nginx Upload Proxy Fixed** - Logo uploads now work correctly
   - Fixed location block ordering in nginx.conf
   - `/uploads` proxy now has priority over static file serving
   - Regex location excludes /uploads/* paths
   
2. ✅ **Auto-Backup System Deployed**
   - Cron job backing up database every 5 minutes
   - Daily volume backups at 2 AM
   - 100 SQL backups + 7 volume backups retention

3. ✅ **Database Safety Guide Created**
   - Comprehensive safety procedures
   - Safe vs dangerous commands documented
   - Restore procedures documented

### **Known Working Features:**
- ✅ User authentication (login/logout)
- ✅ Company branding (logo upload/display)
- ✅ Demo credentials on login page
- ✅ Input fields (fixed "0" stuck issue)
- ✅ File upload system (logos, damage photos)
- ✅ API proxying through Nginx
- ✅ Database persistence across restarts

---

## 📁 PROJECT STRUCTURE (Prisma + MySQL - PRODUCTION)

### Backend (Node.js + Parse Server + MongoDB)
```
backend/
├── src/
│   ├── index.ts              ⚠️ Main entry - USE_PARSE toggle
│   ├── routes-parse/        ✅ NEW: Parse SDK routes
│   │   ├── index.ts         → Registers all 43 model routes
│   │   ├── auth.ts          → Parse.User authentication
│   │   ├── upload.ts        → Parse.File uploads
│   │   └── [43 model routes] → Auto-generated CRUD
│   ├── models-parse/        ✅ NEW: Parse class definitions
│   │   └── [43 models].ts   → Auto-generated from Prisma
│   ├── routes/              ⚠️ OLD: Prisma routes (backup)
│   ├── scripts/
│   │   └── migrate-to-parse.js → Migration automation tool
│   └── middleware/          ⚠️ Auth logic - Updated for Parse
├── prisma/                  �️ DEPRECATED (backup only)
└── package.json            ✅ Updated: Added Parse SDK, axios
```

### Parse Server Configuration
```
Environment Variables:
- USE_PARSE=true              → Use Parse backend
- PARSE_SERVER_URL=http://parse:1337/parse
- PARSE_APP_ID=WMS_WAREHOUSE_APP
- PARSE_MASTER_KEY=MASTER_KEY_WAREHOUSE_2024
- MONGODB_URI=mongodb://mongoadmin:mongopass@mongodb:27017/warehouse_wms
```

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── App.tsx           ⚠️ Main router - DON'T BREAK
│   ├── pages/           ✅ Add pages here
│   ├── components/      ✅ Add components here
│   └── api/             ⚠️ API calls - CAREFUL
└── package.json         ⚠️ Don't break dependencies
```

## 🚀 KEY FEATURES (WORKING - DON'T BREAK!)

### ✅ Authentication System
- Login: admin@wms.com / admin123
- JWT tokens
- Protected routes
- Location: `backend/src/routes/auth.ts`

### ✅ Branding System
- Company logos
- Color customization
- Location: `frontend/src/pages/Settings/BrandingSettings.tsx`

### ✅ Material Management
- Stock tracking
- Issue/Return flow
- Location: `frontend/src/pages/Materials/`

### ✅ Fleet Management
- Vehicles
- Drivers
- Location: `frontend/src/pages/Fleet/`

### ✅ Reports & Analytics
- Material reports
- Job reports
- Location: `frontend/src/pages/Reports/`

## 🔧 TECHNOLOGY STACK

### Backend (MIGRATED TO PARSE!)
- Node.js 18
- Express.js
- **Parse Server** (MongoDB backend) ✅ NEW!
- **MongoDB 6.0** (replaced MySQL) ✅ NEW!
- ~~Prisma ORM~~ (Deprecated - kept in BACKUP-PRISMA-MYSQL/)
- ~~MySQL~~ (Deprecated - replaced with MongoDB)
- TypeScript
- JWT Authentication
- Parse.User for authentication
- Parse.File for file storage

### Parse Migration Status:
- ✅ All 43 models migrated to Parse classes
- ✅ All API routes converted to Parse SDK
- ✅ Authentication using Parse.User + JWT
- ✅ File uploads using Parse.File
- ✅ Frontend integration tested (zero changes needed)
- ✅ Dual-mode backend (USE_PARSE=true/false toggle)
- 📦 Old Prisma/MySQL backup: `BACKUP-PRISMA-MYSQL/`

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router v6
- Axios

### Database (MIGRATED!)
- **MongoDB 6.0** (Primary) ✅
- Parse Server Collections: _User, Company, MovingJob, Shipment, etc.
- ~~MySQL 8.0~~ (Deprecated - backed up)
- Port: 27017 (MongoDB)
- Database: warehouse_wms

### DevOps
- Docker Compose
- 5 containers: MongoDB, Parse Server, Parse Dashboard, Backend, Frontend
- Auto-commit system (every 5 minutes)
- Volume mounts for development
- Parse Dashboard: http://localhost:4040

## 🛡️ SAFETY CHECKLIST FOR NEW FEATURES

### Before Starting:
```powershell
# 1. Create backup
git tag backup-safe-$(Get-Date -Format "yyyyMMdd-HHmmss")

# 2. Create feature branch
git checkout -b feature/new-feature-name

# 3. Verify Docker is running
docker ps
```

### While Developing:
```powershell
# Commit frequently (every working change)
git add .
git commit -m "Feature: [what you did]"
```

### After Completing:
```powershell
# 1. Test thoroughly
docker-compose -f docker-compose.dev.yml up -d
# Open http://localhost and test

# 2. If working, merge
git checkout master
git merge feature/new-feature-name

# 3. If broken, rollback
git checkout master
git branch -D feature/new-feature-name
git reset --hard backup-safe-XXXXXXXX
```

## 🚨 EMERGENCY RECOVERY

### If AI breaks something:
```powershell
# 1. Check what changed
git status
git diff

# 2. See recent commits
git log --oneline -10

# 3. Restore from backup
git tag -l "backup-*"
git reset --hard backup-XXXXXXXX

# 4. Restart Docker
docker-compose down
docker-compose -f docker-compose.dev.yml up -d
```

### If database is corrupted (PARSE VERSION):
```powershell
# 1. Stop containers
docker-compose down

# 2. Remove MongoDB volume (CAREFUL!)
docker volume rm new-start_mongodb_data

# 3. Restart (will recreate DB)
docker-compose -f docker-compose.dev.yml up -d

# 4. NO MIGRATIONS NEEDED! Parse auto-creates schema

# 5. Create test users
docker exec wms-backend-dev node -e "
const Parse = require('parse/node');
Parse.initialize('WMS_WAREHOUSE_APP');
Parse.serverURL = 'http://parse:1337/parse';
const user = new Parse.User();
user.set('username', 'test@example.com');
user.set('password', 'Test123!');
user.set('email', 'test@example.com');
user.signUp().then(console.log);
"
```

## 🔑 PARSE SERVER ENDPOINTS

### Authentication (Parse.User)
```
POST   /api/auth/register  → Create Parse.User + Company
POST   /api/auth/login     → Parse REST API authentication
GET    /api/auth/me        → Get current user profile
POST   /api/auth/logout    → Clear JWT token
POST   /api/auth/change-password → Update password
```

### File Uploads (Parse.File)
```
POST   /api/upload/single      → Single file upload
POST   /api/upload/multiple    → Multiple files
POST   /api/upload/job-file    → Attach file to job
GET    /api/upload/job-files/:jobId → Get job files
DELETE /api/upload/job-file/:fileId → Delete file
POST   /api/upload/avatar      → User avatar
POST   /api/upload/company-logo → Company logo
```

### All 43 Models (Auto-generated CRUD)
```
GET    /api/[model]        → List all
GET    /api/[model]/:id    → Get by ID
POST   /api/[model]        → Create
PUT    /api/[model]/:id    → Update
DELETE /api/[model]/:id    → Delete

Models: MovingJob, Shipment, PackingMaterial, Box, Container, 
        Driver, Vehicle, Customer, Invoice, Payment, Expense,
        MaterialCategory, Material, MaterialTransaction,
        MaterialIssue, MaterialReturn, User, Role, Permission,
        Company, Rack, RackSection, Warehouse, Location,
        Template, Setting, Notification, ActivityLog,
        Report, Dashboard, Fleet, Route, Delivery,
        Tracking, Damage, Claim, Document, Attachment,
        Comment, Tag, CustomField, Integration, Webhook
```
```

## 📝 COMMON TASKS (SAFE WAYS)

### Add a new page in frontend:
```typescript
// 1. Create page: frontend/src/pages/NewFeature/NewFeature.tsx
// 2. Add route in: frontend/src/App.tsx
// 3. Add navigation in: frontend/src/components/Sidebar.tsx
// 4. Test before commit!
```

### Add a new API endpoint (PARSE VERSION):
```typescript
// 1. Create Parse class: backend/src/models-parse/NewModel.ts
export class NewModel extends Parse.Object {
  constructor() { super('NewModel'); }
  
  get field() { return this.get('field'); }
  set field(value) { this.set('field', value); }
}

// 2. Add route: backend/src/routes-parse/newModel.ts
import { Router } from 'express';
import Parse from 'parse/node';

const router = Router();

router.get('/', async (req, res) => {
  const query = new Parse.Query('NewModel');
  const results = await query.find({ useMasterKey: true });
  res.json({ success: true, data: results });
});

export default router;

// 3. Register in: backend/src/routes-parse/index.ts
import newModelRouter from './newModel';
router.use('/newmodel', newModelRouter);

// 4. NO DATABASE MIGRATION NEEDED! Parse auto-creates schema
// 5. Test with Postman
// 6. Commit
```

### Add database field (PARSE VERSION):
```typescript
// NO MIGRATIONS NEEDED! Just update the Parse class:

// backend/src/models-parse/MyModel.ts
export class MyModel extends Parse.Object {
  constructor() { super('MyModel'); }
  
  // Add new getter/setter
  get newField() { return this.get('newField'); }
  set newField(value) { this.set('newField', value); }
}

// Parse will auto-create the column on first save!
// No migration, no schema file, no npx commands!
```

## 🚀 PARSE MIGRATION SUMMARY

### What Changed:
- **Database**: MySQL → MongoDB
- **ORM**: Prisma → Parse SDK
- **Schema**: schema.prisma → Auto-generated from Parse classes
- **Migrations**: Manual SQL → Automatic (Parse handles it)
- **Auth**: Prisma User → Parse.User with JWT
- **Files**: Local storage → Parse.File

### Migration Process:
```bash
# Automated migration script generated:
- 43 Parse class files in backend/src/models-parse/
- 43 API route files in backend/src/routes-parse/
- Authentication system with Parse.User
- File upload system with Parse.File
- ~10,000 lines of code in 5 seconds!
```

### Toggle System:
```bash
# Backend supports BOTH systems:
USE_PARSE=true   → MongoDB + Parse (Active)
USE_PARSE=false  → MySQL + Prisma (Backup)

# Easy rollback if needed!
```

### Testing Status:
- ✅ All 43 models migrated
- ✅ All API endpoints working
- ✅ Frontend integration (zero changes)
- ✅ Authentication working
- ✅ File uploads working
- ✅ Login tested with test users
- 📦 Old system backed up in: BACKUP-PRISMA-MYSQL/

## 🎓 AI INSTRUCTIONS

### When user says "add feature X":
1. ✅ Ask user to confirm current code is working
2. ✅ Create backup tag automatically
3. ✅ Create feature branch
4. ✅ Make changes incrementally
5. ✅ Commit after each working change
6. ✅ Test before final commit
7. ✅ Ask user to test
8. ✅ Only merge if user confirms working

### What AI should NEVER do:
- ❌ Make changes without backup
- ❌ ~~Edit schema.prisma without migration~~ (NOT NEEDED ANYMORE - Parse auto-schema!)
- ❌ Delete files without asking
- ❌ Change Docker configuration without testing
- ❌ Modify auth system without careful review
- ❌ Make multiple big changes in one commit
- ❌ Skip testing
- ❌ Change USE_PARSE toggle without user confirmation

### What AI should ALWAYS do (PARSE VERSION):
- ✅ Create backup before starting
- ✅ Use feature branches
- ✅ Commit frequently with descriptive messages
- ✅ Test changes (especially Parse API endpoints)
- ✅ Ask user to verify
- ✅ Provide rollback instructions
- ✅ Document what was changed
- ✅ Use Parse SDK methods (useMasterKey: true for server-side)
- ✅ Check Parse Server logs if errors occur
- ✅ Remember: NO migrations needed, Parse auto-creates schema!

## 📊 PROJECT STATUS

**Last Updated:** October 27, 2025
**Version:** 2.0.0 (MIGRATED TO PARSE!)
**Docker:** ✅ Working (5 containers)
**Database:** ✅ MongoDB 6.0 + Parse Server
**Auth:** ✅ Parse.User + JWT Working
**All Features:** ✅ Working (43 models migrated)
**Frontend:** ✅ Zero changes needed
**Backend:** ✅ Dual-mode (Parse active, Prisma backup)

**🎉 PARSE MIGRATION COMPLETE - PRODUCTION READY!**

## 🔧 QUICK REFERENCE

### Start Development:
```powershell
docker-compose -f docker-compose.dev.yml up -d
# Frontend: http://localhost
# Backend: http://localhost:5000
# Parse Dashboard: http://localhost:4040
# MongoDB: localhost:27017
```

### Test Users:
```
Email: test@example.com
Password: Test123!

Email: admin@test.com
Password: Admin123!
```

### Check Logs:
```powershell
docker logs wms-backend-dev    # Backend logs
docker logs wms-parse-dev      # Parse Server logs
docker logs wms-mongodb-dev    # MongoDB logs
docker logs wms-frontend-dev   # Frontend logs
```

### Debug Login Issues:
```
Open: http://localhost/debug-login
- Shows auth status
- Test login without redirects
- Real-time logs
```
