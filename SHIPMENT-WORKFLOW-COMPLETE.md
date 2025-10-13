# 📦 QGO CARGO WMS - COMPLETE SHIPMENT WORKFLOW GUIDE

**Created**: October 13, 2025
**Status**: ✅ 100% WORKING - PRODUCTION READY

---

## 🎯 **COMPLETE SHIPMENT LIFECYCLE** (Start to Finish)

### **STEP 1: SHIPMENT INTAKE** 📥

**How to Create a New Shipment:**

1. Go to **Shipments** page
2. Click **"+ New Shipment"** button (top right)
3. Fill in the form:
   - **Client Information**:
     - Client Name ✅ (Required)
     - Client Phone ✅ (Required)
     - Client Email (Optional)
   - **Shipment Details**:
     - Description (Optional)
     - Total Box Count ✅ (Required)
     - Estimated Value (Optional)
     - Notes (Optional)
   - **Storage Assignment** (Optional):
     - Select Rack from dropdown
     - Can assign rack NOW or LATER via QR Scanner
   - **Custom Fields** ✨:
     - Any custom fields you created in Settings will appear here
     - Fill them based on your needs (Priority, Insurance, Customer Type, etc.)

4. Click **"Create Shipment"**
5. ✅ **Success!** Shipment created with:
   - Unique Reference ID: `SH-2024-XXXX`
   - QR Code: `QR-SH-timestamp`
   - Status: `PENDING` (if no rack) or `IN_STORAGE` (if rack assigned)
   - **Audit Trail**: Your User ID saved as `createdBy`

---

### **STEP 2: STORAGE & TRACKING** 🗄️

**View Shipment Status:**

1. **Status Tabs** (top of Shipments page):
   - **All Shipments** 📦 - Complete overview
   - **Pending** 🟡 - Not yet in storage
   - **In Storage** 🟢 - Currently in racks
   - **Released** 🔵 - Delivered/completed

2. **View Details** (Eye icon 👁️):
   - Click blue EYE icon on any shipment
   - See COMPLETE information:
     - ✅ Client Information
     - ✅ Storage Location (Rack Code + Location)
     - ✅ Description & Notes
     - ✅ Custom Fields (all values saved)
     - ✅ Withdrawal History
     - ✅ Audit Trail (Who created, who updated, when)

3. **QR Code Scanning**:
   - Go to **Scanner** page
   - Scan shipment QR code → Scan rack QR code → Assign instantly
   - Shipment status automatically changes to `IN_STORAGE`

---

### **STEP 3: PARTIAL WITHDRAWALS** (Optional) 📤

**If client wants to collect SOME boxes (not all):**

1. Find shipment in **In Storage** tab
2. Click **"Partial Withdrawal"** button
3. Enter:
   - Number of boxes to withdraw
   - Collected by (person's name)
   - Notes (optional)
4. ✅ **Result**:
   - Remaining boxes stay in rack
   - Rack capacity updated
   - Withdrawal history recorded
   - Shipment stays `IN_STORAGE` (until all boxes collected)

---

### **STEP 4: FULL RELEASE** 🚀

**When client collects all remaining boxes:**

1. Find shipment in **In Storage** tab
2. Click **"Release"** button (arrow icon)
3. **Enhanced Release Modal** shows:

   **📦 Current Status:**
   - Current Box Count
   - Assigned Rack
   - Rack Location
   - What happens after release

   **📊 Rack Capacity Impact:**
   - Visual capacity bar
   - How much space will be freed
   - Color-coded (Green/Yellow/Red)

   **💰 Storage Charges Section:**
   - **Auto-calculated charges**:
     - Storage Fee (per day × days stored)
     - Handling Fee
     - Any other charges marked "Apply on Release"
   - **Manual charges** (optional):
     - Add custom charges
     - Description + Amount
   - **Tax Calculation**:
     - Automatic tax based on settings
     - Shows subtotal + tax + total

4. **Release Options:**
   - **Full Release** - All boxes
   - **Partial Release** - Select quantity

5. Click **"Generate Invoice & Release"**

6. ✅ **What Happens:**
   - ✅ Shipment status → `RELEASED`
   - ✅ Removed from rack view
   - ✅ Rack capacity freed
   - ✅ **INVOICE GENERATED AUTOMATICALLY** 🎉
   - ✅ Release date recorded
   - ✅ Your User ID saved as `updatedBy`

---

### **STEP 5: INVOICE & PAYMENT** 💵

**After Release:**

1. Go to **Invoices** page
2. Find the invoice (linked to shipment reference)
3. **Invoice shows**:
   - Client information
   - Line items (all charges)
   - Subtotal, Tax, Total
   - Status: `UNPAID` / `PAID` / `OVERDUE`

4. **Record Payment**:
   - Click **"Record Payment"** button
   - Enter amount + payment method
   - Add notes (optional)
   - Click **"Record Payment"**
   - ✅ Invoice status updates to `PAID`

5. **Download PDF**:
   - Click **"Download PDF"** button
   - Professional invoice PDF generated
   - Give to client

---

## 🔍 **PROFESSIONAL FEATURES NOW WORKING**

### ✅ **Audit Tracking**
- **Every shipment tracks**:
  - `createdBy` - User ID who created
  - `updatedBy` - User ID who last updated
  - `createdAt` - Exact timestamp
  - `updatedAt` - Last modified timestamp
  - `releasedAt` - Release timestamp

### ✅ **Custom Fields**
- Define fields in **Settings → System Settings → Custom Fields**
- Choose section: **SHIPMENT**
- 5 field types available:
  - TEXT - Free text input
  - NUMBER - Numeric values
  - DATE - Date picker
  - DROPDOWN - Select from options
  - CHECKBOX - Yes/No
- **Fields automatically appear** in Create/Edit modals
- **Values saved** and **displayed** in View Details

### ✅ **Status Management**
- Clear visual separation:
  - 🟡 Pending - Waiting for storage
  - 🟢 In Storage - Currently in racks
  - 🔵 Released - Completed
- Tab badges show counts in real-time
- Search works across all tabs

### ✅ **Rack Integration**
- Released shipments **hidden** from rack views
- Accurate capacity tracking
- Only `IN_STORAGE` shipments shown
- Visual rack map available

### ✅ **Billing Integration**
- Auto-calculate storage charges
- Multiple charge types supported
- Tax calculation automatic
- Invoice generation on release
- PDF download available

---

## 🎓 **BEST PRACTICES**

### **When Creating Shipments:**
1. ✅ Always enter client name + phone (required)
2. ✅ Fill custom fields (helps with reporting)
3. ✅ Assign rack immediately if available
4. ✅ Add estimated value for insurance tracking
5. ✅ Use notes field for special instructions

### **During Storage:**
1. ✅ Use QR Scanner for quick rack assignments
2. ✅ Check "In Storage" tab for active inventory
3. ✅ Use View Details to see complete shipment info
4. ✅ Track partial withdrawals for accurate counts

### **On Release:**
1. ✅ Review storage charges before confirming
2. ✅ Add any manual charges if needed
3. ✅ Generate invoice immediately
4. ✅ Download PDF for client records
5. ✅ Record payment when received

---

## 📊 **DASHBOARD OVERVIEW**

**Shipment Status Breakdown** (bottom of Dashboard):
- 📦 Total Shipments - All shipments count
- 🟡 Pending - Percentage of total
- 🟢 In Storage - Percentage of total
- 🔵 Released - Percentage of total

**Quick Stats Cards:**
- Total Shipments
- Active Racks
- Moving Jobs
- Recent Activities

---

## 🔧 **SYSTEM CHECKS**

### ✅ **What's Connected:**
- Shipments → Racks (capacity updates)
- Shipments → Custom Fields (values saved)
- Shipments → Withdrawals (partial releases)
- Shipments → Invoices (automatic generation)
- Shipments → Audit Trail (who did what)

### ✅ **What Works End-to-End:**
1. Create Shipment → Custom fields appear ✅
2. Assign to Rack → Capacity updates ✅
3. View Details → All info displayed ✅
4. Partial Withdrawal → Tracking works ✅
5. Release → Invoice generated ✅
6. Release → Rack freed ✅
7. Release → Status tabs update ✅

---

## 🚀 **TESTING CHECKLIST**

Try this complete workflow:

1. ✅ **Create Test Shipment**:
   - Go to Shipments → New Shipment
   - Fill client info + custom fields
   - Assign to rack
   - Click Create

2. ✅ **View in Storage Tab**:
   - Check "In Storage" tab
   - Find your shipment
   - Click EYE icon → View Details
   - Verify all info displayed

3. ✅ **Try Partial Withdrawal** (Optional):
   - Click "Partial Withdrawal"
   - Withdraw 5 boxes (if total is 10)
   - Check remaining count updates

4. ✅ **Full Release**:
   - Click "Release"
   - Review charges + rack info
   - Click "Generate Invoice & Release"
   - Shipment moves to "Released" tab

5. ✅ **Check Invoice**:
   - Go to Invoices page
   - Find invoice for your shipment
   - Verify all charges listed
   - Download PDF
   - Record payment

6. ✅ **Verify Rack**:
   - Go to Racks page
   - Find the rack used
   - Check capacity freed
   - Released shipment NOT in rack view

---

## 💡 **TIPS & TRICKS**

### **Speed Up Workflow:**
- Use QR Scanner for bulk rack assignments
- Create Custom Field templates for common scenarios
- Use "Apply on Release" for standard charges
- Batch record payments at end of day

### **Track Everything:**
- Check View Details for complete history
- Use Custom Fields for client preferences
- Add notes for special handling
- Track withdrawal patterns

### **Professional Service:**
- Generate invoice immediately on release
- Download PDF for client
- Record payment promptly
- Keep audit trail clean

---

## 📞 **SUPPORT**

**If Something Doesn't Work:**
1. Check both servers running (Backend: 5000, Frontend: 3000)
2. Check browser console (F12) for errors
3. Verify login credentials: admin@demo.com / demo123
4. Check custom fields created in Settings first
5. Refresh page if data doesn't update

**Contact:**
- Akif Bade: 99860163
- System: Qgo Cargo WMS
- Version: Production Ready v1.0

---

## ✅ **SYSTEM STATUS: 100% WORKING**

All features tested and confirmed working:
- ✅ Shipment intake with custom fields
- ✅ Rack assignment and capacity tracking
- ✅ Partial withdrawals
- ✅ Full release with charges
- ✅ Invoice generation
- ✅ Payment recording
- ✅ PDF download
- ✅ Audit tracking
- ✅ Status tabs
- ✅ View details
- ✅ Mobile access

**READY FOR PRODUCTION USE! 🚀**
