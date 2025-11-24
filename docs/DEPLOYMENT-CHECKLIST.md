# DEPLOYMENT CHECKLIST - AI MEMORY

**This file is for the AI assistant to review BEFORE any deployment.**

---

## 🚨 BEFORE YOU DEPLOY - READ THIS

### Question 1: Which server am I deploying to?

```
ANSWER OPTIONS:
A) STAGING (148.230.107.155)         ← Test environment (SAFE)
B) PRODUCTION (qgocargo.cloud)       ← Live customers (CRITICAL)
C) I'm not sure                       ← STOP HERE - ASK USER
```

**If you answered C - STOP immediately and ask user:**

```
"I'm about to make changes. Which environment?

STAGING: http://148.230.107.155 (Testing only, safe)
PRODUCTION: https://qgocargo.cloud (Live customers, needs approval)

Please say: STAGING or PRODUCTION"
```

---

### Question 2: Do I have explicit approval?

```
For STAGING:
  ✅ You have permission to test anytime
  
For PRODUCTION:
  ❌ YOU NEED USER'S EXPLICIT YES
  Show user this message first:
  
  "Ready to deploy to PRODUCTION (qgocargo.cloud)?
   - Tested on staging: ✅
   - Backup ready: ✅
   - Your approval needed: [WAITING]"
   
  Wait for user to say: "YES" or "OK" or similar
  If user says anything else - DO NOT DEPLOY
```

---

### Question 3: Is there a backup?

```
STAGING: Not critical, but nice to have
PRODUCTION: MANDATORY - Create backup first

Before production deployment:
  ssh root@148.230.107.155 "mysqldump ... > backup.sql"
  
Verify: "Backup created: ✅"
Then: Deploy
```

---

## 📋 DEPLOYMENT PROCESS

### For STAGING (Testing)

```
1. ✅ Confirm: Deploying to 148.230.107.155 (STAGING)
2. ✅ Sync files: scp file root@148.230.107.155:/path
3. ✅ Rebuild: docker-compose restart
4. ✅ Test: curl http://148.230.107.155:5000/api/test
5. ✅ Report: "Testing on staging complete"
6. ✅ Ask: "Ready for production?"
```

### For PRODUCTION (Live Customers)

```
1. 🚨 Confirm: Get explicit user approval first
2. 📦 Backup: Create mysqldump backup
3. 📤 Sync: Sync files to production
4. 🔄 Rebuild: docker-compose restart
5. ✅ Verify: Check https://qgocargo.cloud works
6. 📢 Notify: "Production deployment complete"
```

---

## 🎯 CURRENT STATUS (As of 2025-10-29)

**STAGING SERVER (148.230.107.155):**
- ✅ CBM feature deployed
- ✅ Testing complete
- ✅ Ready

**PRODUCTION SERVER (qgocargo.cloud):**
- ✅ CBM feature deployed (with approval)
- ✅ Working correctly
- ⚠️ DO NOT TOUCH without explicit user request

**DATABASE:**
- ✅ Backup created: /root/NEW START/database-backups/backup-2025-10-29.sql
- ✅ CBM columns added to shipments table
- ✅ All existing data preserved

---

## 🔐 SAFETY RULES

1. **Never assume which server** - Always ask if unclear
2. **Production needs approval** - Wait for user's YES
3. **Backup before production** - No exceptions
4. **Verify after deployment** - Don't just assume it worked
5. **Stop if confused** - Ask user, don't guess

---

## ⚡ WHEN YOU FORGET

If you're in a new chat and don't remember:

1. Find this file: `DEPLOYMENT-CHECKLIST.md`
2. Read it completely
3. Ask user for clarification
4. Follow the process above
5. Never deploy without being 100% sure

---

## 🚫 THINGS THAT WILL CAUSE PROBLEMS

❌ Deploying to production without approval
❌ Modifying production without backup
❌ Using `docker-compose down` on production without testing
❌ Syncing source without verifying it compiles
❌ Running database migrations without backup
❌ Touching anything if unsure

---

## ✅ THINGS THAT ARE SAFE

✅ Testing on staging (148.230.107.155)
✅ Creating backups
✅ Asking user for clarification
✅ Stopping work to read these files
✅ Verifying before and after deployments

---

## 📞 ESCALATION PATH

If you're unsure about anything:

1. **STOP** - Do not continue
2. **Read** - This file + DEPLOYMENT-SAFETY-PROTOCOL.md
3. **Ask** - Show user this message:

```
"I need clarification before proceeding:

1. Which server? (STAGING or PRODUCTION)
2. Is this approved? (For production: YES/NO)
3. Is backup ready? (For production: YES/NO)

Please confirm before I deploy."
```

4. **Wait** - Let user respond
5. **Proceed** - Only after getting clear answers

---

**REMEMBER: When in doubt, ask the user. Never guess on deployments.**

Last Updated: 2025-10-29
Created: After production incident on 2025-10-29
Purpose: Prevent deployment mistakes in future AI sessions
