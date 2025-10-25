# 🧪 COMPLETE TESTING GUIDE - Template System

## ✅ What We Just Implemented

1. **Logo File Upload** - Users can upload logo files from their computer
2. **QR Code on Documents** - Scannable QR codes on invoices and release notes
3. **Template Settings System** - 30+ customization options for both documents

---

## 🚀 START TESTING NOW

### Step 1: Start Frontend

```powershell
cd "c:\Users\USER\Videos\NEW START\frontend"
npm run dev
```

Then open: **http://localhost:3000**

---

## 📋 TEST SUITE

### TEST 1: Logo File Upload ⬆️

**Objective**: Upload a logo file and see it on documents

1. **Prepare a test image**:
   - Find any image file (PNG, JPG, GIF, SVG)
   - Make sure it's under 5MB

2. **Upload process**:
   - Navigate to: **Settings → Invoice & Templates → Open Template Settings**
   - **Company Info tab**
   - Click **"Choose File"** under Company Logo
   - Select your image
   - Click **"Upload"** button
   - ✅ Should see: "Logo uploaded successfully!" message
   - ✅ Should see: Logo preview appears immediately

3. **Click "Save Settings"**

4. **Verify on Invoice**:
   - Go to **Invoices** section
   - Click any invoice
   - ✅ Should see: Your uploaded logo at the top

5. **Verify on Release Note**:
   - Go to **Shipments** section
   - Find a RELEASED shipment
   - Click **"Print Release Note"**
   - ✅ Should see: Your uploaded logo at the top

**Expected Results**:
- ✅ Logo uploads successfully
- ✅ Preview shows immediately
- ✅ Logo appears on both invoice and release note
- ✅ Logo persists after page refresh

---

### TEST 2: QR Code on Documents 📱

**Objective**: Enable QR codes and scan them

1. **Enable QR Codes**:
   - **Settings → Template Settings → Advanced tab**
   - Check **"Show QR Code on Documents"**
   - Set **Position**: "Top Right"
   - Set **Size**: 100px
   - Click **"Save Settings"**

2. **Test on Invoice**:
   - Go to **Invoices** section
   - Click any invoice
   - ✅ Should see: QR code in top right corner
   - **Scan with your phone's camera**:
     - ✅ Should read: "INV-[invoice number]"

3. **Test on Release Note**:
   - Go to **Shipments** section
   - Print a release note
   - ✅ Should see: QR code in top right corner
   - **Scan with your phone**:
     - ✅ Should read: "SHIPMENT-[shipment number]"

4. **Test Different Positions**:
   - Change **Position** to: "Bottom Left"
   - Save and check invoice
   - ✅ QR code should move to bottom left

5. **Test Different Sizes**:
   - Change **Size** to: 150
   - Save and check
   - ✅ QR code should be larger

**Expected Results**:
- ✅ QR codes appear when enabled
- ✅ QR codes are scannable with phone
- ✅ QR codes show correct invoice/shipment number
- ✅ Position changes work
- ✅ Size changes work

---

### TEST 3: Complete Template Customization 🎨

**Objective**: Test all customization options together

1. **Company Branding** (Company Info tab):
   ```
   Company Name: "My Test Company"
   Company Address: "123 Test Street, Test City"
   Phone: "+965 1234 5678"
   Email: "test@company.com"
   Website: "www.testcompany.com"
   ```
   - Upload a logo or paste URL
   - Click **Save**

2. **Invoice Customization** (Invoice Template tab):
   ```
   Invoice Title: "TAX INVOICE"
   ```
   - Uncheck: "Show Footer"
   - Add custom terms: "Payment due within 30 days. Late payments subject to fees."
   - Click **Save**

3. **Release Note Customization** (Release Note tab):
   - Uncheck: "Show Charges & Payment"
   - Add custom footer: "Thank you for using our service!"
   - Click **Save**

4. **Colors** (Colors & Styling tab):
   ```
   Invoice Primary Color: #dc2626 (Red)
   Release Primary Color: #16a34a (Green)
   ```
   - Click **Save**

5. **Currency** (Advanced tab):
   ```
   Currency Symbol: $
   ```
   - Click **Save**

6. **Verify All Changes**:

   **On Invoice**:
   - ✅ Logo: Your logo appears
   - ✅ Company: "My Test Company" shows
   - ✅ Contact: Address, phone, email display
   - ✅ Title: "TAX INVOICE" in red color
   - ✅ Currency: All amounts show "$"
   - ✅ Terms: Custom terms appear
   - ✅ Footer: Hidden (as unchecked)
   - ✅ QR Code: Appears in set position

   **On Release Note**:
   - ✅ Logo: Your logo appears
   - ✅ Company: "My Test Company" shows
   - ✅ Headings: Green color
   - ✅ Charges: Hidden (as unchecked)
   - ✅ Footer: Custom footer text shows
   - ✅ QR Code: Appears in set position

---

### TEST 4: Show/Hide Toggles ⚡

**Objective**: Test all visibility toggles

1. **Invoice Toggles** (Invoice Template tab):
   - Uncheck **ALL** toggles:
     - [ ] Show Company Logo
     - [ ] Show Company Address
     - [ ] Show Company Phone
     - [ ] Show Company Email
     - [ ] Show Footer
   - Save

2. **Check Invoice**:
   - ✅ Logo should be hidden
   - ✅ Address should be hidden
   - ✅ Phone should be hidden
   - ✅ Email should be hidden
   - ✅ Footer should be hidden

3. **Release Note Toggles** (Release Note tab):
   - Uncheck these:
     - [ ] Show Charges & Payment
     - [ ] Show Terms & Conditions
     - [ ] Show Authorization Signatures
   - Save

4. **Check Release Note**:
   - ✅ Charges section hidden
   - ✅ Terms section hidden
   - ✅ Signatures section hidden

5. **Re-enable All**:
   - Check all toggles back
   - Save
   - ✅ Everything should reappear

---

### TEST 5: Date & Time Formats 📅

**Objective**: Test date/time formatting

1. **Change Formats** (Advanced tab):
   - **Date Format**: "dd/MM/yyyy" (13/10/2025)
   - **Time Format**: "HH:mm" (24-hour)
   - Save

2. **Check Release Note**:
   - ✅ Dates show as: 13/10/2025
   - ✅ Time shows as: 15:30 (not 3:30 PM)

3. **Try Different Format**:
   - **Date Format**: "dd MMMM yyyy" (13 October 2025)
   - Save
   - ✅ Dates show full month name

---

### TEST 6: Persistence & Refresh 🔄

**Objective**: Ensure settings persist

1. **Make changes to multiple settings**
2. **Click Save**
3. **Close browser completely**
4. **Re-open and login**
5. **Go to Template Settings**
   - ✅ All settings should still be there

6. **View Invoice**:
   - ✅ All customizations still apply

7. **View Release Note**:
   - ✅ All customizations still apply

---

### TEST 7: Print & PDF 🖨️

**Objective**: Test print output

1. **Print Invoice**:
   - Open any invoice
   - Click **"Print"** or press Ctrl+P
   - ✅ Logo appears in print preview
   - ✅ QR code appears in print preview
   - ✅ Colors appear correctly
   - ✅ All customizations visible

2. **Print Release Note**:
   - Click **"Print Release Note"**
   - ✅ All customizations appear in print

---

### TEST 8: Error Handling 🛡️

**Objective**: Test edge cases

1. **Invalid Logo URL**:
   - Paste: "https://invalid-url-xyz.com/logo.png"
   - Save
   - View invoice
   - ✅ Should show placeholder or nothing (no broken image icon)

2. **Large File Upload**:
   - Try uploading 10MB image
   - ✅ Should show: "File too large. Maximum size is 5MB."

3. **Invalid File Type**:
   - Try uploading .txt or .pdf file
   - ✅ Should show: "Only image files are allowed"

4. **Empty Settings**:
   - Click **"Reset to Defaults"** (if available)
   - ✅ Should restore all default values

---

## 📊 FINAL CHECKLIST

Before calling it complete, verify:

- [ ] Logo upload works
- [ ] Logo displays on invoice
- [ ] Logo displays on release note
- [ ] QR code shows on invoice when enabled
- [ ] QR code shows on release note when enabled
- [ ] QR codes are scannable
- [ ] QR position changes work
- [ ] Company info updates everywhere
- [ ] Colors apply correctly
- [ ] Currency changes work (all locations)
- [ ] Date formats work
- [ ] Time formats work
- [ ] Show/hide toggles work
- [ ] Custom terms/footer text shows
- [ ] Settings persist after refresh
- [ ] Print output looks good
- [ ] Invalid inputs handled gracefully

---

## 🐛 COMMON ISSUES & FIXES

### Issue: "Logo doesn't show after upload"
**Fix**: 
- Check browser console for errors
- Verify backend is running on port 5000
- Try refreshing the page
- Check the logo URL in settings (should be http://localhost:5000/uploads/logos/...)

### Issue: "QR code not appearing"
**Fix**:
- Make sure "Show QR Code" is checked in Advanced tab
- Click Save Settings
- Refresh the invoice/release note page
- Check browser console for errors

### Issue: "Settings not saving"
**Fix**:
```powershell
# Check backend is running
netstat -ano | findstr :5000

# If not running, restart:
cd "c:\Users\USER\Videos\NEW START\backend"
npm run dev
```

### Issue: "Upload says 'Failed to upload logo'"
**Fix**:
- Check file is under 5MB
- Check file is an image (JPG, PNG, GIF, SVG, WebP)
- Check backend console for errors
- Verify uploads folder exists: `backend/public/uploads/logos`

---

## 🎯 SUCCESS CRITERIA

**You're done when**:
1. ✅ You can upload a logo and see it on both documents
2. ✅ QR codes appear and can be scanned
3. ✅ All 30+ customization options work
4. ✅ Settings persist between sessions
5. ✅ Print output looks professional
6. ✅ No console errors

---

## 📸 TAKE SCREENSHOTS

For documentation, capture:
1. Template Settings page (all 5 tabs)
2. Invoice with customizations
3. Release note with customizations
4. QR code being scanned on phone
5. Print preview of both documents

---

## ⏭️ WHAT'S NEXT

After all tests pass:

1. **PDF Generation** - Make PDFs match customizations
2. **Email Templates** - Send branded emails
3. **Template Themes** - Pre-made professional themes
4. **Multi-language** - Arabic support
5. **Watermarks** - Add watermarks to documents

---

**Current Status**: 🟢 **READY FOR TESTING**

**Start Here**: Open frontend, login, go to Settings → Template Settings

**Report Issues**: Check browser console and backend logs for error details
