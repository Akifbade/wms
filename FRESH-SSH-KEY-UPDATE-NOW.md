# Fresh SSH Key - Update GitHub Secrets NOW

## New Private Key (COPY EVERYTHING BELOW)

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAM1o8KOWgxvpVwJcf64zNHZ6m9jIJhSTSVxwcPIBXDjAAAAKD+1yWg/tcl
oAAAAAtzc2gtZWQyNTUxOQAAACAM1o8KOWgxvpVwJcf64zNHZ6m9jIJhSTSVxwcPIBXDjA
AAAEB5Sculb82Xdm1sROxy3qjy/GmVezQvIDyaDsJWkUwnxwzWjwo5aDG+lXAlx/rjM0dn
qb2MgmFJNJXHBw8gFcOMAAAAG3Jvb3RAc3J2MTA3ODg2NC5oc3Rnci5jbG91ZAEC
-----END OPENSSH PRIVATE KEY-----
```

---

## Steps to Update GitHub Secrets

### Step 1: Go to GitHub Secrets
https://github.com/Akifbade/wms/settings/secrets/actions

### Step 2: Update STAGING_VPS_SSH_KEY
1. Click on **STAGING_VPS_SSH_KEY** (pencil icon)
2. **Clear the entire old value**
3. Paste the fresh key above (from `-----BEGIN` to `-----END`)
4. Click **Update secret**

### Step 3: Update PROD_VPS_SSH_KEY  
1. Click on **PROD_VPS_SSH_KEY** (pencil icon)
2. **Clear the entire old value**
3. Paste the **SAME key** (both staging & production use same key)
4. Click **Update secret**

### Step 4: Run Workflow
Go to: https://github.com/Akifbade/wms/actions
- Click **Three-Stage Deployment**
- Click **Run workflow**
- Select branch: `stable/prisma-mysql-production`
- Click **Run workflow**

---

## ✅ This Should Work Now!

- Fresh key created on VPS
- Public key added to authorized_keys
- Both staging and production use the same key (same VPS)

If it still fails, check the verbose SSH debug output in the workflow logs.
