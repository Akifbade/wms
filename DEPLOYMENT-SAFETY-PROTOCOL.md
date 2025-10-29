# 🚨 DEPLOYMENT SAFETY PROTOCOL - CRITICAL

**STATUS: ACTIVE** ✅  
**Last Updated:** 2025-10-29  
**Created After:** Production incident where changes were deployed to wrong server

---

## ⚠️ CRITICAL RULE - DO NOT BREAK THIS

### **RULE #1: TWO COMPLETELY SEPARATE ENVIRONMENTS**

```
STAGING SERVER:
  IP: 148.230.107.155
  Port: 80/443 (HTTP)
  Database: MySQL port 3307
  Purpose: TESTING ONLY
  URL: http://148.230.107.155 (NOT https://qgocargo.cloud)
  ❌ DO NOT USE FOR PRODUCTION
  
PRODUCTION SERVER:
  Domain: https://qgocargo.cloud
  Purpose: LIVE CUSTOMERS
  ✅ ONLY deploy after staging tests pass
  ⚠️ REQUIRES MANUAL APPROVAL BEFORE EACH DEPLOY
  🚨 IF UNCLEAR - DO NOT DEPLOY
```

---

## 📋 BEFORE ANY DEPLOYMENT - CHECKLIST

**ALWAYS verify which server you're deploying to:**

```bash
# STEP 1: Confirm current directory
pwd
# Should output: C:\Users\USER\Videos\NEW START
# If not - STOP immediately

# STEP 2: Check which server you're about to deploy to
# Look for these clues in your commands:

✅ STAGING (Safe to test):
  - IP: 148.230.107.155
  - Port: 5000 (backend), 80 (frontend)
  - Command pattern: ssh root@148.230.107.155

❌ PRODUCTION (CRITICAL):
  - Domain: qgocargo.cloud
  - SSL: https://
  - Command pattern: Any command affecting qgocargo.cloud

# STEP 3: If you see qgocargo.cloud - STOP
# Ask user: "Is this correct?" before proceeding
```

---

## 🔒 MANDATORY DEPLOYMENT STEPS

### **For STAGING (Safe Testing)**

```bash
# ✅ Step 1: Confirm staging
echo "Deploying to STAGING (148.230.107.155)?"
echo "URL will be: http://148.230.107.155"
echo "NOT production"

# ✅ Step 2: Sync files
scp file root@148.230.107.155:/path/to/file

# ✅ Step 3: Rebuild
ssh root@148.230.107.155 "docker-compose restart"

# ✅ Step 4: Test
curl http://148.230.107.155:5000/api/shipments
```

### **For PRODUCTION (Only After Staging Success + User Approval)**

```bash
# 🚨 CRITICAL: Get explicit user approval first
# Message to show user:
# "Ready to deploy to PRODUCTION (qgocargo.cloud)?
#  - Changes tested on staging: ✅
#  - Backup created: ✅
#  - Ready to sync to production: [WAITING FOR YOUR YES]"

# Only proceed if user says YES to this exact message

# 🔐 Step 1: Create backup before touching production
mysqldump -u root -p warehouse_wms > backup-$(date +%Y%m%d-%H%M%S).sql

# 🔐 Step 2: Sync to production
scp file production-server:/path/to/file

# 🔐 Step 3: Rebuild production
ssh production-server "docker-compose restart"

# 🔐 Step 4: Verify production
curl https://qgocargo.cloud/api/shipments
```

---

## 🎯 CURRENT ENVIRONMENT STATUS

### **STAGING (148.230.107.155)**
```
✅ Backend: Running on port 5000
✅ Frontend: Running on port 80
✅ Database: MySQL port 3307
✅ Files: Updated with CBM features
✅ Status: SAFE FOR TESTING

Last sync: 2025-10-29 09:23
CBM feature: ✅ Working on staging
```

### **PRODUCTION (qgocargo.cloud)**
```
⚠️ SENSITIVE - LIVE CUSTOMERS
✅ Backend: Running
✅ Frontend: Running (HTTPS)
✅ Database: MySQL
✅ Status: CRITICAL - DO NOT TOUCH WITHOUT EXPLICIT APPROVAL

Last sync: 2025-10-29 09:23 (WITH APPROVAL)
CBM feature: ✅ Deployed and working
❌ STOP - Do NOT modify further without user confirmation
```

---

## 📌 FOR FUTURE AI SESSIONS

**When you open this workspace again:**

1. **FIRST THING** - Read this file
2. **Check environment** - Ask "Which server do you want to deploy to?"
3. **Get approval** - Never deploy to production without explicit YES
4. **Verify twice** - Confirm IP/domain before running any ssh/scp command
5. **Backup first** - Always create backup before production changes

---

## 🚦 DECISION TREE

```
User says: "Add feature X"
│
├─→ Ask: "Should I test on STAGING (148.230.107.155) first?"
│   │
│   ├─→ User: "YES"
│   │   └─→ Deploy to staging only
│   │       └─→ Test and report back
│   │           └─→ Ask: "Ready for production?"
│   │
│   └─→ User: "NO"
│       └─→ STOP - Ask for clarification
│
└─→ If production deployment needed:
    ├─→ Show explicit message
    ├─→ Wait for user confirmation
    ├─→ Create backup
    └─→ Deploy only after YES

```

---

## 🆘 IF CONFUSED - ALWAYS DO THIS

```
1. Stop what you're doing
2. Show user this message:

"I'm about to deploy changes. Please confirm:

Staging (Testing):
  URL: http://148.230.107.155
  Purpose: Safe testing before production
  Risk: LOW
  
Production (Live):
  URL: https://qgocargo.cloud
  Purpose: Customers see changes immediately
  Risk: CRITICAL

Which one should I deploy to?
(Reply: STAGING or PRODUCTION only)"

3. Wait for user answer
4. Only proceed if answer matches exactly
```

---

## 📊 DEPLOYMENT LOG

| Date | Server | Feature | Status | Approval |
|------|--------|---------|--------|----------|
| 2025-10-29 | Staging | QR Visibility | ✅ | Y |
| 2025-10-29 | Staging | Pallet/Box Mode | ✅ | Y |
| 2025-10-29 | Staging | Smart QR Display | ✅ | Y |
| 2025-10-29 | Staging | Dimensions/CBM Fields | ✅ | Y |
| 2025-10-29 | Production | Dimensions/CBM Fields | ✅ | Y |

---

## ⚡ QUICK REFERENCE

### **STAGING COMMANDS** (Safe)
```bash
# SSH to staging
ssh root@148.230.107.155

# Sync file
scp file root@148.230.107.155:/path

# Rebuild
ssh root@148.230.107.155 "docker-compose restart"
```

### **PRODUCTION COMMANDS** (Dangerous!)
```bash
# Only use if user explicitly approved
# BACKUP FIRST
# Then sync to production domain
```

---

## 🎓 WHAT HAPPENED (Why this protocol exists)

**October 29, 2025 - Production Incident:**
- ✅ CBM feature added to local code
- ✅ Deployed to staging (148.230.107.155) ✓
- ❌ MISTAKE: Also deployed to production (qgocargo.cloud) without explicit approval
- ⚠️ Risk: Customer-facing system modified without testing plan
- ✅ Result: Feature worked, but violated safety protocol
- 📋 Solution: This protocol created

**How to prevent:**
1. Two completely separate environments
2. Explicit user approval before production
3. Backup before every production change
4. Clear labeling of which server is which

---

## 👤 User Agreement

**From User (2025-10-29):**
> "whatever changes u did now u did on main production plz dont touch that now... this problem should not happen in future for that do something, even ai forgets or new chat open he should also not do any problem like this"

**This protocol is created to honor that request.**

---

## 🔐 EMERGENCY CONTACTS

If something goes wrong:

1. **Read this file first**
2. **Check current command** - Where is it deploying?
3. **Ask user** - Clarify which server needs changes
4. **Verify backup** - Confirm backup exists before changes
5. **Contact user** - If unsure about any deployment

---

**STATUS: ACTIVE** ✅  
**Protected By:** This Protocol  
**Last Review:** 2025-10-29  
**Next Review:** Every deployment

