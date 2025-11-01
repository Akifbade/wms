# Update GitHub Secrets - DO THIS NOW

## Fresh SSH Private Key (Copy Below)

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

## Step-by-Step Instructions

### Step 1: Open GitHub
Go to: https://github.com/Akifbade/wms/settings/secrets/actions

### Step 2: Update `STAGING_VPS_SSH_KEY`
1. Click on **STAGING_VPS_SSH_KEY** (existing secret)
2. Click **Update secret**
3. Clear the value field completely (select all, delete)
4. Paste the fresh key above (entire block from `-----BEGIN` to `-----END`)
5. Click **Update secret**

### Step 3: Update `PROD_VPS_SSH_KEY`
1. Click on **PROD_VPS_SSH_KEY** (existing secret)
2. Click **Update secret**
3. Clear the value field completely
4. Paste the same fresh key (entire block)
5. Click **Update secret**

---

## Done! ✅

Now re-run the workflow:
1. Go to: https://github.com/Akifbade/wms/actions
2. Click: **Three-Stage Deployment**
3. Click: **Run workflow** button
4. Select branch: **stable/prisma-mysql-production**
5. Click: **Run workflow**

The deployment should now work! 🚀

---

## If It Still Fails

Share the new error screenshot and I'll debug further.
