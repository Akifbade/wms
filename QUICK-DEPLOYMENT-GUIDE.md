# ⚡ QUICK START: STAGING vs PRODUCTION

## 🎯 Simple Explanation

```
STAGING          PRODUCTION
(Testing)        (LIVE)
────────────────────────────
Port 8080   →    Port 80/443
Port 5001   →    Port 5000
Port 3308   →    Port 3307
Fresh DB    →    Real Data
```

---

## 🚀 3-Step Deployment

### Step 1: Test on Staging
```powershell
.\deploy.ps1 staging
```
- Opens: http://localhost:8080
- Login: admin@demo.com / demo123
- Test everything
- Make more changes if needed

### Step 2: Approve Production
```powershell
.\deploy.ps1 production
```
- Type: CONFIRM
- System goes LIVE
- Backup created automatically

### Step 3: Verify Live
- Check: https://qgocargo.cloud
- Monitor: docker logs

---

## 📱 Access Points

### STAGING (Testing)
```
Frontend:  http://localhost:8080
Backend:   http://localhost:5001
Database:  localhost:3308
```

### PRODUCTION (Live)
```
Frontend:  https://qgocargo.cloud
           http://148.230.107.155
Backend:   http://localhost:5000
Database:  localhost:3307
```

---

## ⚙️ What Gets Backed Up?

Before each production deployment:
```
✅ Complete database dump
✅ File: backups/production-backup-20251028_091234.sql
✅ Can rollback anytime
```

---

## 🔄 If Something Goes Wrong

### Emergency Rollback
```powershell
.\deploy.ps1 rollback
# Enter the timestamp from backup filename
```

**Done!** Production restored to working state instantly.

---

## 💡 Pro Tips

1. **Test thoroughly on staging first**
   - Don't rush to production
   - Find bugs here, not there

2. **Keep backups**
   - They're created automatically
   - Use for rollback if needed

3. **Monitor logs after deploy**
   ```bash
   docker logs wms-production-backend -f
   ```

4. **Git commits are automatic**
   - Each deploy commits changes
   - Easy to track history

---

## 📊 Checklist Before Production

- [ ] Tested on staging (http://localhost:8080)
- [ ] Login works (admin@demo.com / demo123)
- [ ] Uploads working
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] No errors in staging logs
- [ ] Ready for PRODUCTION?

If YES → Run: `.\deploy.ps1 production`

---

## 🎓 Learning Resources

Full Guide: `STAGING-PRODUCTION-GUIDE.md`
- Architecture details
- Troubleshooting
- Advanced commands

---

**Bhai, ab tu completely safe hai!** ✅

Local → Staging (test) → Production (live)

Kabhi live system ko break nahi karega! 🚀
