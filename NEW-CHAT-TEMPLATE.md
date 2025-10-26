# 🚀 TEMPLATE FOR NEW AI CHAT
**Copy-paste this when starting a new AI conversation!**

---

🎯 **PROJECT:** Warehouse Management System (WMS)  
📁 **LOCATION:** c:\Users\USER\Videos\NEW START\  
🌿 **BRANCH:** feature/staff-assignment

---

## ⚠️ CRITICAL INSTRUCTIONS FOR AI:

**READ THESE FILES IN ORDER:**

1. ✅ **AI-SESSION-CONTEXT.md** (MOST IMPORTANT - Full conversation history!)
2. ✅ **AI-MEMORY-SYSTEM.md** (How memory system works)
3. ✅ **HOW-TO-WORK-WITH-AI.md** (Workflow guidelines)
4. ✅ **WHY-DATABASE-BREAKS.md** (Database troubleshooting)

---

## 📊 QUICK STATUS:

**Docker:** Running ✅  
**Frontend:** http://localhost  
**Backend:** http://localhost:5000  
**Database:** MySQL on port 3307  
**Auto-Backup:** Running every 5 mins ✅

---

## 🎯 WHAT WE'RE WORKING ON:

**Current Feature:** Staff Assignment System

**Progress:**
- ✅ Database schema added (StaffAssignment model)
- ✅ Backend API created (CRUD routes)
- ✅ Frontend dialog created (Material UI)
- ✅ UI placement fixed (Separate tab beside Materials)
- ✅ Material UI installed
- ✅ Auto-fix script added
- ✅ AI Memory System added (THIS IS NEW!)
- 🔄 Testing in progress

**What Needs Testing:**
1. Staff Assignment tab (beside Materials in Job Details)
2. Green button: "Assign Staff to Job"
3. Material UI dialog functionality
4. Save/Cancel actions
5. Database persistence

---

## 🛠️ IMPORTANT SCRIPTS:

```powershell
# Save current conversation (MANUAL)
.\scripts\save-conversation.ps1

# Fix common problems
.\scripts\auto-fix.ps1

# Fix Prisma after schema changes
.\scripts\fix-prisma-after-db-change.ps1
```

---

## 🎨 USER PREFERENCES:

**Communication Style:** Hinglish (Hindi + English)  
**When Stressed:** Uses CAPS ("BHAI", "YAAR")  
**Prefers:** Step-by-step, simple explanations, emojis  
**Workflow:** Backup → Feature Branch → Small Changes → Test → Commit → Merge

---

## 🔍 DETAILED CONTEXT IN:

📄 **AI-SESSION-CONTEXT.md** ← READ THIS FIRST!

---

## 💬 CONVERSATION SUMMARY:

[This will be auto-filled by save-conversation.ps1]

**Recent Topics Discussed:**
- Staff Assignment feature development
- UI/UX improvements (moved to separate tab)
- Material UI integration
- Technical stack discussion (Prisma vs alternatives)
- Vite crash troubleshooting
- AI Memory System implementation (NEW!)

---

## 🚨 NEXT STEPS:

1. Check if frontend compiled successfully
2. Test Staff Assignment tab in browser
3. Verify Material UI dialog works
4. Test save functionality
5. If all working → Merge to master
6. If issues → Debug and fix

---

## 🛡️ SAFETY MEASURES:

✅ Backup tags created  
✅ Feature branch (not master)  
✅ Auto-backup running (every 5 min)  
✅ AI context saved automatically  
✅ Rollback possible anytime

**Emergency Rollback:**
```powershell
git tag -l "backup-*"
git reset --hard [backup-tag]
```

---

## 📞 HOW TO CONTINUE:

**AI, please:**

1. Read `AI-SESSION-CONTEXT.md` completely
2. Check Docker status: `docker ps`
3. Check frontend logs: `docker logs wms-frontend-dev --tail 20`
4. Continue from "Next Steps" above
5. Ask if anything unclear!

---

**🎯 USER IS WAITING FOR YOUR RESPONSE!**

Start by saying: "I've read the context. Let me check the current system status..."

---
