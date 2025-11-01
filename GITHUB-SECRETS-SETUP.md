# GitHub Actions Secrets Setup

## ✅ SSH Key Generated Successfully

The deployment key has been created on your VPS and is ready to use.

### Private Key (COPY THIS)

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACD0TSsAwpGi3/07DPHcIx7BeKFmjoGD/J2s624aPiiHcQAAAKDE6pegxOqX
oAAAAAtzc2gtZWQyNTUxOQAAACD0TSsAwpGi3/07DPHcIx7BeKFmjoGD/J2s624aPiiHcQ
AAAEDtYqZtI8cUCDyGhMFejmdLFs9FT9UDVKsTvoWtVcmYvvRNKwDCkaLf/TsM8dwjHsF4
oWaOgYP8nazrbho+KIdxAAAAG3Jvb3RAc3J2MTA3ODg2NC5oc3Rnci5jbG91ZAEC
-----END OPENSSH PRIVATE KEY-----
```

---

## How to Add to GitHub

### Step 1: Go to GitHub Repository Settings
1. Open: https://github.com/Akifbade/wms
2. Go to: **Settings** → **Secrets and variables** → **Actions**

### Step 2: Create Secret `STAGING_VPS_SSH_KEY`
- Click: **New repository secret**
- Name: `STAGING_VPS_SSH_KEY`
- Value: Paste the entire private key above (starting with `-----BEGIN` and ending with `-----END`)
- Click: **Add secret**

### Step 3: Create Secret `PROD_VPS_SSH_KEY`
- Click: **New repository secret**
- Name: `PROD_VPS_SSH_KEY`
- Value: Paste the same private key again
- Click: **Add secret**

---

## ✅ Verification

After adding the secrets:
1. Go to GitHub Actions
2. Click: **Three-Stage Deployment**
3. Click: **Run workflow**
4. Select branch: `stable/prisma-mysql-production`
5. Click: **Run workflow**

The deployment should now:
- ✅ Setup SSH correctly
- ✅ Copy frontend build to VPS
- ✅ Copy backend code to VPS
- ✅ Deploy to staging containers
- ✅ Run health checks

---

## Key Details

- **Key Type**: ed25519 (secure, modern)
- **Passphrase**: None (required for CI/CD)
- **Public Key**: Added to `/root/.ssh/authorized_keys` on VPS
- **Private Key**: Stored securely in GitHub Secrets

---

## If It Still Fails

If the workflow still shows errors:
1. Check GitHub Secrets are added correctly
2. Verify the private key starts with `-----BEGIN OPENSSH PRIVATE KEY-----`
3. Check that there are no extra spaces or newlines when copying
4. Make sure both `STAGING_VPS_SSH_KEY` and `PROD_VPS_SSH_KEY` are set

---

**Status**: ✅ Ready to deploy!
