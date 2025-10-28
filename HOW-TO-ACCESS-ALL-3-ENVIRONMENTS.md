# 🌐 HOW TO ACCESS ALL 3 ENVIRONMENTS
## Complete Guide - Production, Local, and Staging

---

## 📍 YOUR 3 ENVIRONMENTS EXPLAINED:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION (Live)                        │
│                                                             │
│  Access From:    Anywhere in world (browser/mobile)        │
│  URL:            https://qgocargo.cloud                    │
│  Location:       VPS Server (148.230.107.155)              │
│  Who Uses:       Real customers/users                      │
│  Data:           Real data (warehouse_wms DB)              │
│  Status:         LIVE NOW ✅                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 LOCAL (Your Computer)                       │
│                                                             │
│  Access From:    Only your computer                         │
│  URL:            http://localhost                          │
│  Location:       Your Windows machine                       │
│  Who Uses:       You for development                        │
│  Data:           Your test data                            │
│  Status:         Running in Docker                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 STAGING (Your Computer)                     │
│                                                             │
│  Access From:    Only your computer                         │
│  URL:            http://localhost:8080                     │
│  Location:       Your Windows machine                       │
│  Who Uses:       You for testing before production          │
│  Data:           Separate test data                        │
│  Status:         Ready to deploy ⏳                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 VISUAL DIAGRAM:

```
┌──────────────────────────────────────────────────────┐
│            YOUR WINDOWS COMPUTER                      │
│                                                      │
│  ┌─────────────────┐      ┌─────────────────┐      │
│  │  Local Docker   │      │  Staging Docker │      │
│  │  (Prod Copy)    │      │  (Test Copy)    │      │
│  │                 │      │                 │      │
│  │ localhost       │      │ localhost:8080  │      │
│  │ (Port 80)       │      │ (Port 8080)     │      │
│  │                 │      │                 │      │
│  │ Database:       │      │ Database:       │      │
│  │ Port 3307       │      │ Port 3308       │      │
│  │                 │      │                 │      │
│  │ Backend:        │      │ Backend:        │      │
│  │ Port 5000       │      │ Port 5001       │      │
│  └─────────────────┘      └─────────────────┘      │
└──────────────────────────────────────────────────────┘
           ↓                          ↓
    Click to Access           Click to Test
           ↓                          ↓
    http://localhost        http://localhost:8080


┌──────────────────────────────────────────────────────┐
│           VPS SERVER (148.230.107.155)               │
│                                                      │
│  ┌─────────────────────────────────────────┐        │
│  │  Production Docker                      │        │
│  │  (Real Live System)                     │        │
│  │                                         │        │
│  │  Frontend: Port 80/443 (HTTPS)          │        │
│  │  Backend: Port 5000                     │        │
│  │  Database: Port 3307                    │        │
│  │                                         │        │
│  └─────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
           ↓
    Access from anywhere
           ↓
    https://qgocargo.cloud
    (Already live)
```

---

## 🔑 ACCESS CREDENTIALS (Same for All):

```
Email:    admin@demo.com
Password: demo123

Role: ADMIN (Full access)
```

---

## 📱 HOW TO ACCESS EACH ONE:

### 1️⃣ PRODUCTION (Live Website - Already Running)

**From Your Computer:**
```
Open Browser → Type:
https://qgocargo.cloud

Or direct IP:
http://148.230.107.155
```

**From Mobile Phone:**
```
Open Browser → Type:
https://qgocargo.cloud

(Works from anywhere - cafes, home, office)
```

**From Another Person's Computer:**
```
Any browser, any device, any location:
https://qgocargo.cloud

(This is LIVE for everyone!)
```

---

### 2️⃣ LOCAL (Your Computer - Development Copy)

**Only From Your Windows Machine:**
```
Open Browser → Type:
http://localhost

Or:
http://127.0.0.1
```

**To Access From Another Computer:**
```
❌ YOU CANNOT ACCESS!

Why? Because "localhost" means:
"Only this computer"

It's not on internet, only local Docker.
```

**To Make It Accessible (Optional):**
```
# Find your computer's IP:
ipconfig

Look for: "IPv4 Address: 192.168.X.X"

Then from another computer:
http://192.168.X.X

(But frontend service needs port 80 exposed)
```

---

### 3️⃣ STAGING (Testing Environment - Your Computer)

**Only From Your Windows Machine:**
```
Open Browser → Type:
http://localhost:8080

(Notice the :8080 port number!)
```

**Ports for Staging:**
```
Frontend:   http://localhost:8080
Backend:    http://localhost:5001
Database:   localhost:3308 (mysql client)
```

**To Access From Another Computer:**
```
❌ ALSO CANNOT ACCESS!

Why? Same reason as Local:
- Port 8080 is only local
- Not on public internet
- Protected by firewall

Unless you expose it:
http://192.168.X.X:8080

(But requires network config)
```

---

## 🔄 YOUR TYPICAL WORKFLOW:

```
┌─────────────────────────────────────────────────────┐
│ Step 1: MAKE CODE CHANGES                           │
│                                                     │
│ Open VS Code locally                               │
│ Edit files (backend/frontend/database)             │
│ Commit to git: git commit -m "Changed..."          │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: DEPLOY TO STAGING                           │
│                                                     │
│ Command:  .\deploy.ps1 staging                     │
│ Wait:     15-20 seconds                            │
│ Access:   http://localhost:8080                    │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: TEST ON STAGING                             │
│                                                     │
│ Open:     http://localhost:8080                    │
│ Test:     All features                             │
│ Check:    No errors (F12 console)                  │
│ Verify:   Everything works                         │
└─────────────────────────────────────────────────────┘
                          ↓
         All Tests Pass?
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ✅ YES                      ❌ NO
            │                           │
            ↓                           ↓
     ┌──────────────┐          ┌──────────────────┐
     │Step 4:       │          │Fix Issues        │
     │Deploy to     │          │Commit Changes    │
     │PRODUCTION    │          │Re-test on Staging│
     │              │          │(Go back to Step 2)
     │Command:      │          │                  │
     │.\deploy.ps1  │          │Repeat until      │
     │production    │          │all tests pass!   │
     └──────────────┘          └──────────────────┘
            ↓
     ┌──────────────────────┐
     │Step 5: VERIFY LIVE   │
     │                      │
     │Open Browser:         │
     │https://qgocargo.cloud│
     │                      │
     │Verify changes        │
     │visible on production │
     └──────────────────────┘
```

---

## 📊 COMPARISON TABLE:

| Feature | Production | Local | Staging |
|---------|-----------|-------|---------|
| **URL** | https://qgocargo.cloud | http://localhost | http://localhost:8080 |
| **Location** | VPS (Internet) | Your Computer | Your Computer |
| **Access From** | Anywhere | Only your PC | Only your PC |
| **Data** | Real data | Test data | Separate test data |
| **Users** | Real customers | Only you | Only you |
| **Purpose** | LIVE | Development | Testing before live |
| **Port** | 80/443 | 80 | 8080 |
| **Database Port** | 3307 | 3307 | 3308 |
| **Backend Port** | 5000 | 5000 | 5001 |
| **Status** | ✅ Running now | Running locally | Ready to start |

---

## 🎯 EXACT STEPS TO ACCESS NOW:

### To Access PRODUCTION (Already Live):
```
Step 1: Open any browser
Step 2: Type: https://qgocargo.cloud
Step 3: Login with admin@demo.com / demo123
Step 4: Done! You're using LIVE system
```

### To Access LOCAL (Your Dev Copy):
```
Step 1: Open PowerShell in your project folder
Step 2: Run: docker-compose up -d
Step 3: Wait 10 seconds
Step 4: Open browser
Step 5: Type: http://localhost
Step 6: Login with admin@demo.com / demo123
Step 7: You're using LOCAL copy
```

### To Access STAGING (Test Before Production):
```
Step 1: Make code changes
Step 2: Commit to git
Step 3: Open PowerShell
Step 4: Run: .\deploy.ps1 staging
Step 5: Wait 15-20 seconds
Step 6: Open browser
Step 7: Type: http://localhost:8080
Step 8: Login with admin@demo.com / demo123
Step 9: Test everything
Step 10: If all good → Deploy to production
```

---

## ⚠️ IMPORTANT REMEMBER:

```
PRODUCTION (https://qgocargo.cloud)
├─ LIVE for real users
├─ Real data
├─ Change carefully!
└─ Always test on staging first!

LOCAL (http://localhost)
├─ Your development copy
├─ Test data
├─ Can break without worry
└─ Only you can access

STAGING (http://localhost:8080)
├─ Pre-production test
├─ Safe testing ground
├─ Exact copy of production setup
└─ Find bugs here, not in production!
```

---

## 🔐 PORT REFERENCE:

```
PRODUCTION (VPS):
├─ Frontend: 80 (HTTP) / 443 (HTTPS)
├─ Backend: 5000
└─ Database: 3307

LOCAL (Your Computer):
├─ Frontend: 80
├─ Backend: 5000
└─ Database: 3307

STAGING (Your Computer):
├─ Frontend: 8080
├─ Backend: 5001
└─ Database: 3308
```

---

## 🌍 WHICH ONE TO USE WHEN:

### Use PRODUCTION When:
```
✅ You need to show real data to users
✅ You need to access from phone/other device
✅ You need to show to client/boss
✅ Changes are tested and approved
```

### Use LOCAL When:
```
✅ You're developing new features
✅ You're fixing bugs
✅ You want isolated environment
✅ You don't want to affect real data
```

### Use STAGING When:
```
✅ You want to test before going LIVE
✅ You want to simulate production exactly
✅ You want to catch bugs before users see them
✅ You're ready to deploy to production
```

---

## 📝 BHAI YE SIMPLE HAI:

```
Production  = Real System (Live) = https://qgocargo.cloud ✅
Local       = Dev System (Your PC) = http://localhost
Staging     = Test System (Your PC) = http://localhost:8080

Want to test?
  → Deploy to http://localhost:8080

Everything works?
  → Go to https://qgocargo.cloud

Simple!
```

---

**Kuch samjh nahi aaya?**
**Puch bol! Main bata dunga!** 🤔

