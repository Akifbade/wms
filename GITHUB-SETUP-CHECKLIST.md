# 🔐 GitHub CI/CD Setup Checklist

## Step 1: Add GitHub Secrets (CRITICAL!)

### Go to: GitHub → Repository → Settings → Secrets and variables → Actions

### 1.1 Add Staging VPS Secrets

Click "New repository secret" and add:

**Secret Name:** `STAGING_VPS_HOST`
**Value:** `148.230.107.155` (or your staging VPS IP)

**Secret Name:** `STAGING_VPS_USER`
**Value:** `staging` (SSH username for staging)

**Secret Name:** `STAGING_VPS_PORT`
**Value:** `22`

**Secret Name:** `STAGING_VPS_SSH_KEY`
**Value:** (Run this in terminal first, then paste output)
```bash
cat ~/.ssh/id_rsa
```

### 1.2 Add Production VPS Secrets

**Secret Name:** `PROD_VPS_HOST`
**Value:** `148.230.107.155` (or your production VPS IP)

**Secret Name:** `PROD_VPS_USER`
**Value:** `root` (SSH username for production)

**Secret Name:** `PROD_VPS_PORT`
**Value:** `22`

**Secret Name:** `PROD_VPS_SSH_KEY`
**Value:** (Paste your SSH private key - same as staging if same VPS)

### 1.3 (Optional) Add Slack Webhook

**Secret Name:** `SLACK_WEBHOOK`
**Value:** (Your Slack webhook URL from your Slack app settings)

---

## Step 2: Setup Branch Protection Rules

### Go to: GitHub → Repository → Settings → Branches

### 2.1 Protect `main` Branch

Click "Add rule"

**Branch name pattern:** `main`

Check these boxes:
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - Wait for "test-build" to pass
  - Wait for "build-images" to pass
- ✅ Require branches to be up to date before merging
- ✅ Include administrators

Click "Create"

### 2.2 Protect `staging` Branch

Click "Add rule"

**Branch name pattern:** `staging`

Check these boxes:
- ✅ Require status checks to pass before merging
  - Wait for "test-build" to pass
- ✅ Require branches to be up to date before merging

Click "Create"

### 2.3 Protect `develop` Branch

Click "Add rule"

**Branch name pattern:** `develop`

Check these boxes:
- ✅ Require status checks to pass before merging

Click "Create"

---

## Step 3: Commit CI/CD Files to Git

```bash
# Make sure all new files are tracked
git add .github/
git add scripts/
git add CI-CD-*.md
git add QUICK-DEPLOYMENT-REFERENCE.md

# Commit
git commit -m "feat: add CI/CD pipeline setup"

# Push to develop first (for testing)
git push origin develop

# Check GitHub Actions to verify workflow is detected
```

---

## Step 4: Verify SSH Access

### 4.1 Generate SSH Key (if needed)

```bash
# Check if key exists
ls ~/.ssh/id_rsa

# If not, generate
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### 4.2 Copy Public Key to VPS

**Staging:**
```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub staging@148.230.107.155
```

**Production:**
```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub root@148.230.107.155
```

### 4.3 Test SSH Connection

```bash
# Test staging
ssh -i ~/.ssh/id_rsa staging@148.230.107.155 "echo Connected to staging"

# Test production
ssh -i ~/.ssh/id_rsa root@148.230.107.155 "echo Connected to production"
```

If both work, you're good!

---

## Step 5: Test the Pipeline

### 5.1 Create Test Branch

```bash
git checkout develop
git checkout -b test/ci-cd-pipeline

# Make a simple change
echo "# Test" >> README.md

git add README.md
git commit -m "test: verify CI/CD pipeline"
git push origin test/ci-cd-pipeline
```

### 5.2 Create Pull Request

1. Go to GitHub
2. Create PR: `test/ci-cd-pipeline` → `develop`
3. Watch the Actions tab
4. Should see workflow running:
   - ✅ test-build job
   - ✅ build-images job

### 5.3 Check Results

1. Go to "Actions" tab
2. Click on the workflow run
3. Check each job's logs
4. All should pass ✅

### 5.4 Merge to Develop

1. If all checks pass, click "Merge Pull Request"
2. Watch for:
   - ✅ deploy-staging job starts
   - ✅ SSH to staging VPS
   - ✅ Deployment completes

### 5.5 Verify Staging Deployment

```bash
# SSH to staging VPS
ssh staging@148.230.107.155

cd /root/NEW\ START

# Check logs
docker compose logs -n 20 backend

# Health check
curl http://localhost:8080

# Check if latest code is there
git log -1
```

---

## Step 6: Test Emergency Rollback

### 6.1 Trigger a Failure (Optional - for testing)

```bash
# On your local machine
git checkout test/rollback-test
# Break something intentionally
# Push
# Watch rollback happen
```

### 6.2 Manual Rollback (If needed)

```bash
# SSH to staging
ssh staging@148.230.107.155

cd /root/NEW\ START

# List backups
ls -lh ./backups/

# Rollback to specific backup
bash scripts/rollback.sh staging ./backups/backup_staging_LATEST.tar.gz

# Verify
curl http://localhost:8080
```

---

## Step 7: Document & Train Team

### 7.1 Share with Team

1. Send: `CI-CD-SETUP-GUIDE.md`
2. Send: `QUICK-DEPLOYMENT-REFERENCE.md`
3. Schedule training session

### 7.2 Key Training Points

- ✅ How to create feature branches
- ✅ How to create PRs
- ✅ How CI/CD works
- ✅ Where to find deployment logs
- ✅ How to rollback in emergency
- ✅ When to request approvals

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All GitHub Secrets added
- [ ] SSH keys configured and tested
- [ ] Branch protection rules enabled
- [ ] Test deployment completed successfully
- [ ] Staging is accessible after test deployment
- [ ] Rollback procedure tested
- [ ] Team trained
- [ ] Documentation shared
- [ ] Emergency contacts documented

---

## 🚀 You're Ready!

Once all checkboxes above are checked, your CI/CD pipeline is:
- ✅ Configured
- ✅ Tested
- ✅ Ready for production use

### Next Steps

1. Merge this setup to `main` branch
2. Start using for all feature deployments
3. Monitor first few deployments
4. Adjust as needed

---

## 🆘 Troubleshooting

### Issue: Secret not found in workflow

**Solution:**
- Verify secret name is correct (case-sensitive)
- Wait 5 minutes after adding secret
- Refresh GitHub page

### Issue: SSH connection fails in GitHub Actions

**Solution:**
```bash
# Verify SSH key format
cat ~/.ssh/id_rsa | base64 | wc -c  # Should output ~2700 for RSA key

# Update secret with properly formatted key
cat ~/.ssh/id_rsa | xargs -0 -I {} echo "{}"
```

### Issue: Branch protection blocking merges

**Solution:**
- Check if all status checks passed
- Wait for CI/CD to complete (might take 10-15 mins)
- Check Actions tab for failures

### Issue: Deployment script not executable

**Solution:**
```bash
chmod +x scripts/deploy.sh
chmod +x scripts/rollback.sh
git add scripts/
git commit -m "Make scripts executable"
git push
```

---

## 📞 Quick Reference

- **GitHub Actions Docs:** https://docs.github.com/actions
- **SSH Setup Help:** https://github.com/settings/keys
- **Secrets Help:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Docker Docs:** https://docs.docker.com/

---

**Status:** 🔴 Not Started → 🟡 In Progress → 🟢 Complete

Track your progress above and mark items as you complete them!
