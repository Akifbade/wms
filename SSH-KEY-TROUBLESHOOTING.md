# SSH Key Troubleshooting Guide

## The Problem
Workflow keeps failing with: `Load key: error in libcrypto` → `Permission denied`

This means the SSH key in GitHub Secrets does NOT match what's on the VPS.

---

## Solution: Delete Old Key and Start Fresh

### Step 1: Delete old keys on VPS
```bash
ssh root@148.230.107.155
rm -f /root/.ssh/gha_deploy*
rm -f /root/.ssh/authorized_keys  # Start fresh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### Step 2: Create brand new SSH key
```bash
# On VPS, run:
ssh-keygen -t ed25519 -N '' -f /root/.ssh/gha_deploy
# This creates TWO files:
# - /root/.ssh/gha_deploy (PRIVATE KEY - goes in GitHub)
# - /root/.ssh/gha_deploy.pub (PUBLIC KEY - stays on VPS)

# Add public key to authorized_keys
cat /root/.ssh/gha_deploy.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### Step 3: Display the PRIVATE key
```bash
# Copy this entire output:
cat /root/.ssh/gha_deploy
```

### Step 4: Update GitHub Secrets
Go to: https://github.com/Akifbade/wms/settings/secrets/actions

Click **STAGING_VPS_SSH_KEY** (pencil icon):
- Delete old value completely
- Paste the entire private key from Step 3
- Click **Update secret**

Click **PROD_VPS_SSH_KEY** (pencil icon):
- Delete old value completely  
- Paste the same private key
- Click **Update secret**

### Step 5: Test Manually First
Before running the workflow, test the key manually:

```bash
# Get the private key value (from Step 3) and save it locally as ~/gha_deploy_test
# Then test:
ssh -i ~/gha_deploy_test -o StrictHostKeyChecking=no root@148.230.107.155 "whoami"
# Should print: root
```

If this works, the GitHub secrets will work too.

---

## Why This Happens

1. **Windows line endings (CRLF)** in secret → OpenSSH can't parse it → libcrypto error
2. **Copy/paste added spaces/newlines** → Key is truncated/invalid
3. **Old key not in authorized_keys** → Even if valid, permission denied
4. **Public/private key mixed up** → Pasted public key instead of private key

This fresh setup eliminates all those issues.

---

## Next: Re-run Workflow

After updating secrets, go to: https://github.com/Akifbade/wms/actions

Run workflow again - it should show verbose SSH debug output this time to help diagnose any remaining issues.
