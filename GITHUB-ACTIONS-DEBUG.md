# 🐛 GitHub Actions 3-Stage Deployment Debug Guide

## ❌ Issue: Deployment Action Failing

### Quick Checks:

#### 1. **Check GitHub Secrets (Most Common Issue)**
Go to: `https://github.com/Akifbade/wms/settings/secrets/actions`

Required secrets:
- ✅ `PROD_VPS_SSH_KEY` - Your SSH private key
- ✅ `PROD_VPS_HOST` - `148.230.107.155`
- ✅ `PROD_VPS_USER` - `root`

**Test SSH Key Locally:**
```powershell
# Save your key temporarily
$key = Get-Content "C:\path\to\your\ssh\key"
$key | Out-File -FilePath "$env:TEMP\test_key" -Encoding ascii

# Test connection
ssh -i "$env:TEMP\test_key" root@148.230.107.155 "echo 'SSH working!'"

# Cleanup
Remove-Item "$env:TEMP\test_key"
```

---

#### 2. **Check Staging Containers Exist**
```bash
ssh root@148.230.107.155
docker ps -a | grep staging
```

**Expected output:**
```
wms-staging-backend    Up
wms-staging-frontend   Up
wms-staging-db         Up
```

**If missing, create staging containers:**
```bash
cd "/root/NEW START"

# Create staging containers
docker-compose -f docker-compose.yml up -d wms-staging-backend wms-staging-frontend wms-staging-db
```

---

#### 3. **Check Directory Path (Space in Name)**
```bash
ssh root@148.230.107.155
cd "/root/NEW START"  # Note the quotes!
pwd
```

Should output: `/root/NEW START`

---

#### 4. **View Action Logs on GitHub**

Go to: `https://github.com/Akifbade/wms/actions`

Click on failed workflow → View failed step

**Common error messages:**

**Error: "Permission denied (publickey)"**
- ❌ SSH key not set in GitHub secrets
- ❌ Wrong SSH key format
- ❌ Key doesn't match server

**Fix:**
```powershell
# Re-add SSH key to GitHub
# 1. Get your SSH private key content
Get-Content "C:\Users\USER\.ssh\id_rsa"

# 2. Copy ENTIRE output including:
#    -----BEGIN OPENSSH PRIVATE KEY-----
#    ...content...
#    -----END OPENSSH PRIVATE KEY-----

# 3. Add to GitHub: Settings → Secrets → PROD_VPS_SSH_KEY
```

---

**Error: "No such file or directory: frontend/dist"**
- ❌ Frontend build failed
- ❌ Artifact upload/download issue

**Fix in workflow:**
Already fixed in line 85-91 (artifact upload/download)

---

**Error: "docker: Error response from daemon: No such container: wms-staging-backend"**
- ❌ Staging containers don't exist

**Fix:**
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

# Check docker-compose.yml has staging services
cat docker-compose.yml | grep -A 5 "wms-staging"

# Create if missing
docker-compose up -d wms-staging-backend wms-staging-frontend wms-staging-db
```

---

**Error: "rsync: command not found" or "scp: No such file"**
- ❌ GitHub runner missing rsync

**Fix in workflow - Line 150-157:**
Replace `rsync` with `scp`:
```yaml
# OLD (might fail)
rsync -avz --progress ...

# NEW (more reliable)
scp -i ~/.ssh/deploy_key -r backend/* ${VPS_USER}@${VPS_HOST}:"${{ env.PRODUCTION_PATH }}/backend/staging-temp/"
```

---

**Error: "npm install failed" or "npm ERR!"**
- ❌ Node.js version mismatch
- ❌ Package conflicts

**Fix:**
Already handled with `--legacy-peer-deps` flag

---

**Error: "Migration failed" or "Prisma error"**
- ❌ Database not accessible
- ❌ Failed migrations blocking

**Fix:**
Already handled in lines 178-191 (cleaning failed migrations)

---

#### 5. **Test Deployment Manually**

**Test if you can manually deploy to staging:**
```powershell
# From your local machine
ssh root@148.230.107.155

cd "/root/NEW START"

# Manual staging deployment
echo "Testing manual deployment..."

# 1. Pull latest code
git pull origin stable/prisma-mysql-production

# 2. Build frontend locally on server
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# 3. Copy to staging
docker cp frontend/dist/. wms-staging-frontend:/usr/share/nginx/html/
docker exec wms-staging-frontend nginx -s reload

# 4. Deploy backend
docker cp backend/. wms-staging-backend:/app/
docker exec wms-staging-backend sh -c "cd /app && npm install --legacy-peer-deps"
docker exec wms-staging-backend npx prisma generate
docker restart wms-staging-backend

# 5. Check logs
docker logs wms-staging-backend --tail 50
```

If manual deployment works but GitHub Actions fails → SSH key issue

---

#### 6. **Fix Common Workflow Issues**

**Issue A: Path with spaces breaks SCP**
```yaml
# ❌ WRONG
scp file.txt root@host:/root/NEW START/

# ✅ CORRECT
scp file.txt root@host:"/root/NEW START/"
```

**Issue B: SSH key format**
GitHub secret must be raw private key, not base64:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAA
... (actual key content)
-----END OPENSSH PRIVATE KEY-----
```

**Issue C: Container not running**
```bash
# Check status
docker ps -a | grep wms-staging

# If exited, check why
docker logs wms-staging-backend

# Restart
docker restart wms-staging-backend wms-staging-frontend wms-staging-db
```

---

## 🔧 Quick Fixes

### Fix 1: Re-create All Secrets
```powershell
# 1. Get SSH key
Get-Content "C:\Users\USER\.ssh\id_rsa"

# 2. Get VPS info
echo "Host: 148.230.107.155"
echo "User: root"

# 3. Add to GitHub:
# https://github.com/Akifbade/wms/settings/secrets/actions
# - PROD_VPS_SSH_KEY = (private key content)
# - PROD_VPS_HOST = 148.230.107.155
# - PROD_VPS_USER = root
```

### Fix 2: Test SSH from GitHub Actions
Add this step to workflow (temporarily for debugging):
```yaml
- name: Test SSH Connection
  env:
    VPS_HOST: ${{ secrets.PROD_VPS_HOST }}
    VPS_USER: ${{ secrets.PROD_VPS_USER }}
  run: |
    ssh -i ~/.ssh/deploy_key ${VPS_USER}@${VPS_HOST} "echo 'SSH works!' && docker ps"
```

### Fix 3: Simplify Workflow (Test Build Only)
Comment out deployment, test build first:
```yaml
# Temporarily disable deployment
# deploy-staging:
#   name: Deploy to Staging VPS (Full Stack)
#   needs: build
#   ...
```

Push and see if build succeeds. If yes, SSH issue. If no, build issue.

### Fix 4: Check Artifact Upload/Download
In GitHub Actions logs, verify:
- ✅ "Upload Build Artifact" - succeeds
- ✅ "Download Build Artifact" - succeeds
- ✅ `frontend/dist/` folder has files

---

## 📋 Systematic Debug Process

### Step 1: Check GitHub Action Log
```
1. Go to https://github.com/Akifbade/wms/actions
2. Click failed run
3. Click failed job (Build, Deploy-Staging, or Deploy-Production)
4. Find red ❌ step
5. Read error message
```

### Step 2: Identify Error Type

**Build Error?**
- ❌ npm install failed
- ❌ npm run build failed
→ Fix: Check `frontend/package.json` dependencies

**SSH Error?**
- ❌ Permission denied
- ❌ Host key verification failed
→ Fix: Re-add SSH key to GitHub secrets

**Deployment Error?**
- ❌ Container not found
- ❌ File not found
→ Fix: Create staging containers on server

**Migration Error?**
- ❌ Prisma migrate failed
- ❌ Database connection refused
→ Fix: Check database credentials in backend/.env

### Step 3: Test Each Component

**Test A: Build locally**
```powershell
cd "c:\Users\USER\Videos\NEW START\frontend"
npm install --legacy-peer-deps
npm run build
# Should create frontend/dist/ folder
```

**Test B: SSH to server**
```powershell
ssh root@148.230.107.155 "echo 'SSH works!'"
```

**Test C: Check containers**
```powershell
ssh root@148.230.107.155 "docker ps -a | grep wms"
```

**Test D: Manual deploy**
```powershell
ssh root@148.230.107.155
cd "/root/NEW START"
git pull
# ... manual deployment steps ...
```

---

## 🚨 Emergency: Skip CI/CD, Deploy Manually

If GitHub Actions keeps failing and you need to deploy NOW:

```powershell
# 1. SSH to server
ssh root@148.230.107.155

# 2. Pull latest code
cd "/root/NEW START"
git pull origin stable/prisma-mysql-production

# 3. Deploy to staging manually
.\deploy-vps-auto.ps1  # If exists
# OR
docker-compose up -d --build wms-staging-backend wms-staging-frontend

# 4. Test staging
curl http://148.230.107.155:8080

# 5. If good, deploy to production
docker cp wms-staging-frontend:/usr/share/nginx/html/. wms-frontend:/usr/share/nginx/html/
docker cp wms-staging-backend:/app/. wms-backend:/app/
docker restart wms-backend wms-frontend

# 6. Test production
curl http://qgocargo.cloud
```

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] GitHub secrets exist and are correct
- [ ] SSH works: `ssh root@148.230.107.155`
- [ ] Staging containers exist: `docker ps | grep staging`
- [ ] Directory path exists: `ls -la "/root/NEW START"`
- [ ] Frontend builds locally: `npm run build`
- [ ] Backend has no errors: `docker logs wms-backend`
- [ ] Push triggers action: Check GitHub Actions tab
- [ ] Action completes: All steps green ✅
- [ ] Staging works: http://148.230.107.155:8080
- [ ] Production manual trigger works

---

## 📞 Quick Commands

```bash
# 1. Check GitHub Actions status (in browser)
https://github.com/Akifbade/wms/actions

# 2. SSH to server
ssh root@148.230.107.155

# 3. Check containers
docker ps -a | grep wms

# 4. View logs
docker logs wms-staging-backend --tail 100

# 5. Restart staging
docker restart wms-staging-backend wms-staging-frontend

# 6. Manual deploy
cd "/root/NEW START" && git pull && docker-compose up -d --build

# 7. Test staging
curl http://148.230.107.155:8080

# 8. Test production
curl http://qgocargo.cloud
```

---

**Most Common Issue:** SSH key not set correctly in GitHub secrets (90% of cases)

**Fix:** Re-add `PROD_VPS_SSH_KEY` secret with complete private key content

---

**Created:** $(date)  
**Purpose:** Debug failed GitHub Actions 3-stage deployment
