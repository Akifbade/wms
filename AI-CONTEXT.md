# PROJECT CONTEXT FILE - AI KO BATAO PROJECT KYA HAI
# Ye file har new chat mein AI ko share karna

## 🎯 PROJECT OVERVIEW
**Name:** Warehouse Management System (WMS)
**Type:** Full-stack web application
**Status:** PRODUCTION READY - DO NOT BREAK!

## ⚠️ CRITICAL RULES FOR AI

### 🔴 RULE #1: ALWAYS BACKUP BEFORE ANY CHANGE!
```powershell
# Har feature add karne se pehle YE COMMAND MANDATORY!
git tag backup-$(Get-Date -Format "yyyyMMdd-HHmmss")
git add -A
git commit -m "Backup before: [feature name]"
```

### 🔴 RULE #2: NEVER CHANGE DATABASE SCHEMA DIRECTLY!
```
Database changes sirf Prisma migrations se karo
NEVER edit schema.prisma without migration
```

### 🔴 RULE #3: TEST BEFORE COMMIT!
```powershell
# Feature add karne ke baad test karo
docker-compose -f docker-compose.dev.yml up -d
# Browser mein check karo
# Agar sab theek, tab hi commit
```

### 🔴 RULE #4: FEATURE BRANCHES MANDATORY!
```bash
# Main code kabhi directly edit mat karo
git checkout -b feature/[feature-name]
# Changes karo
# Test karo
# Merge karo
```

## 📁 PROJECT STRUCTURE (TOUCH CAREFULLY!)

### Backend (Node.js + Prisma + MySQL)
```
backend/
├── src/
│   ├── index.ts           ⚠️ Main entry - DON'T BREAK
│   ├── routes/           ✅ Add routes here
│   ├── controllers/      ✅ Add controllers here
│   └── middleware/       ⚠️ Auth logic - CAREFUL
├── prisma/
│   └── schema.prisma     🔴 ONLY via migrations!
└── package.json          ⚠️ Don't break dependencies
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

### Backend
- Node.js 18
- Express.js
- Prisma ORM (MySQL)
- TypeScript
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router v6
- Axios

### Database
- MySQL 8.0 (Docker)
- 40+ tables
- Complex relationships

### DevOps
- Docker Compose
- 4 containers (MySQL, Backend, Frontend, Git-watcher)
- Auto-commit system
- Volume mounts for development

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

### If database is corrupted:
```powershell
# 1. Stop containers
docker-compose down

# 2. Remove database volume
docker volume rm wms_mysql_data

# 3. Restart (will recreate DB)
docker-compose -f docker-compose.dev.yml up -d

# 4. Run migrations
docker exec wms-backend-dev npx prisma migrate deploy

# 5. Create admin user
docker exec wms-backend-dev npx ts-node create-admin.ts
```

## 📝 COMMON TASKS (SAFE WAYS)

### Add a new page in frontend:
```typescript
// 1. Create page: frontend/src/pages/NewFeature/NewFeature.tsx
// 2. Add route in: frontend/src/App.tsx
// 3. Add navigation in: frontend/src/components/Sidebar.tsx
// 4. Test before commit!
```

### Add a new API endpoint:
```typescript
// 1. Create controller: backend/src/controllers/newController.ts
// 2. Add route: backend/src/routes/newRoute.ts
// 3. Import in: backend/src/index.ts
// 4. Test with Postman/Thunder Client
// 5. Commit
```

### Add database field:
```bash
# 1. Edit: backend/prisma/schema.prisma
# 2. Create migration:
docker exec wms-backend-dev npx prisma migrate dev --name add_new_field
# 3. Test
# 4. Commit both schema.prisma AND migration files
```

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
- ❌ Edit schema.prisma without migration
- ❌ Delete files without asking
- ❌ Change Docker configuration without testing
- ❌ Modify auth system without careful review
- ❌ Make multiple big changes in one commit
- ❌ Skip testing

### What AI should ALWAYS do:
- ✅ Create backup before starting
- ✅ Use feature branches
- ✅ Commit frequently
- ✅ Test changes
- ✅ Ask user to verify
- ✅ Provide rollback instructions
- ✅ Document what was changed

## 📊 PROJECT STATUS

**Last Updated:** October 25, 2025
**Version:** 1.0.0 (Production Ready)
**Docker:** ✅ Working
**Database:** ✅ MySQL 8.0
**Auth:** ✅ Working
**All Features:** ✅ Working

**⚠️ THIS IS A WORKING PRODUCTION SYSTEM - HANDLE WITH CARE!**
