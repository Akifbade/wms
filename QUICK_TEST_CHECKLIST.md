# ✅ QUICK TEST CHECKLIST

## 🎬 STEP-BY-STEP TEST FLOW

### **START HERE:**
```
http://148.230.107.155:8080
Login with your admin account
```

---

## 📋 CHECKLIST

### **TEST 1: Create Moving Job** ✅
- [ ] Click "Moving Jobs"
- [ ] Click "Create New Job"
- [ ] Fill in:
  - Customer Name: (any)
  - Job Type: (select one)
  - Pickup Address: (any)
  - Delivery Address: (any)
  - Scheduled Date: (today or tomorrow)
- [ ] Click "Create Job"
- [ ] ✅ Job created

---

### **TEST 2: Add Materials to Job** ✅
- [ ] Open the job you just created
- [ ] Click "Materials Used" tab
- [ ] Click "Add Material"
- [ ] Select a material
- [ ] Enter quantity used: 5
- [ ] Enter quantity damaged: 1
- [ ] Click "Add"
- [ ] ✅ Material added

---

### **TEST 3: Complete Job with Photo** ✅ ← THIS IS THE KEY TEST
- [ ] Scroll down to "Complete Job" section
- [ ] You should see a file upload field
- [ ] Click "Choose File"
- [ ] Select an image from your computer (JPG, PNG, etc.)
- [ ] Click "Complete Job"
- [ ] ✅ Job completed

---

### **TEST 4: Check Email** ✅
- [ ] Open your email inbox
- [ ] Look for email with subject: `🛡️ Approval Required - Job Completion Report`
- [ ] ✅ Email received

---

### **TEST 5: Click Button in Email** ✅
- [ ] Open the approval email
- [ ] Look for blue button: `👁️ VIEW PHYSICAL REPORTS`
- [ ] **CLICK THE BUTTON**
- [ ] ✅ Button should open image in new tab
- [ ] ✅ Image should display clearly

---

### **TEST 6: Check Approvals Page** ✅
- [ ] In WMS, click "Approvals Manager"
- [ ] Find your job in the pending approvals
- [ ] Click to view approval detail
- [ ] Look for physical reports section
- [ ] ✅ Physical reports should be visible

---

## ⚠️ TROUBLESHOOTING

### **"Email not received?"**
```
Check:
1. Admin email is set correctly
2. Email notifications are ENABLED
3. SMTP settings are correct
4. Check spam folder
5. Wait 2-3 minutes for delivery
```

### **"Button not visible in email?"**
```
Check:
1. Did you upload a file?
2. File actually saved to disk?
   → Run: docker exec wms-backend ls /app/uploads/physical-reports/
3. Check backend logs:
   → docker logs wms-backend --tail 50
```

### **"Button doesn't open image?"**
```
Try direct URL in browser:
http://148.230.107.155/uploads/physical-reports/FILENAME.jpg

If that doesn't work:
1. Check file exists in container
2. Check Express is running
3. Check file permissions
```

### **"Image shows but looks broken?"**
```
1. Check file size (> 0 bytes)
2. Check file type (JPG, PNG)
3. Try different image
4. Check browser console for errors
```

---

## ✅ SUCCESS INDICATORS

### **You'll know it works when:**

- ✅ Email arrives within 2-3 minutes
- ✅ Blue button is visible with eye icon
- ✅ Button text says "VIEW PHYSICAL REPORTS"
- ✅ Clicking button opens image
- ✅ Image displays clearly
- ✅ No broken image placeholders
- ✅ Shows correct count if multiple reports

---

## 📊 WHAT'S DIFFERENT

### **Old System (Broken):**
- Email template tried to embed image
- CID references but no actual CID data
- Image never appeared
- No button or link

### **New System (Working):**
- Email has ONE clear button
- Button links to direct image URL
- Click → opens in browser
- Simple and reliable

---

## 🎯 EXPECTED FLOW

```
You upload physical report
        ↓
File saved: /app/uploads/physical-reports/report-123.jpg
        ↓
Database: physicalReportUrl = "/uploads/physical-reports/report-123.jpg"
        ↓
Job completed
        ↓
Email sent with button
        ↓
Button href = "http://vps-ip/uploads/physical-reports/report-123.jpg"
        ↓
You click button
        ↓
Image opens in browser ✅
```

---

## 💡 KEY POINTS

1. **NO ATTACHMENTS** - No CID, no image embedding
2. **ONE BUTTON** - Clear call-to-action
3. **DIRECT URL** - Image served by Express
4. **BROWSER VIEW** - Opens in new tab
5. **WORKS EVERYWHERE** - Gmail, Outlook, all email clients

---

## 🚀 READY?

**Just test it now. Upload a file and check your email.**

If it doesn't work, tell me and I'll check the logs.

---

**System Live**: December 13, 2025 11:56 UTC
**Status**: ✅ READY FOR TESTING
