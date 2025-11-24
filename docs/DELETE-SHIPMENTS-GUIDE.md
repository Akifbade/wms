# How to Delete Shipments from phpMyAdmin

## 🎯 Understanding Shipment Data Structure

When you delete a shipment, you need to consider these related tables:
- `shipments` - Main shipment record
- `shipment_boxes` - All boxes in the shipment
- `racks` - Rack assignments (if boxes are assigned to racks)
- `billing_entries` - Billing records
- `audit_logs` - Activity logs

## ✅ Safe Deletion Methods

### **Method 1: Delete Single Shipment (Recommended)**

This will delete the shipment and all its boxes, but keep racks intact (just unassign).

**Step-by-Step:**

1. Open phpMyAdmin: http://localhost:8081 or http://148.230.107.155:8081
2. Login (root / rootpassword or rootpassword123)
3. Select database: `warehouse_wms`
4. Click **SQL** tab
5. Copy and paste this query:

```sql
-- Replace 'SHIPMENT_ID_HERE' with the actual shipment ID
SET @shipment_id = 'SHIPMENT_ID_HERE';

-- Step 1: Unassign boxes from racks (keeps racks intact)
UPDATE shipment_boxes 
SET rackId = NULL 
WHERE shipmentId = @shipment_id;

-- Step 2: Delete all boxes
DELETE FROM shipment_boxes 
WHERE shipmentId = @shipment_id;

-- Step 3: Delete billing entries
DELETE FROM billing_entries 
WHERE shipmentId = @shipment_id;

-- Step 4: Delete the shipment
DELETE FROM shipments 
WHERE id = @shipment_id;

-- Confirmation
SELECT 'Shipment deleted successfully!' AS Status;
```

6. Click **Go** button

---

### **Method 2: Delete Multiple Shipments**

Delete all shipments from a specific date range:

```sql
-- Delete all shipments created before January 1, 2025
SET @cutoff_date = '2025-01-01';

-- Step 1: Get list of shipment IDs to delete (PREVIEW ONLY)
SELECT id, name, qrCode, createdAt 
FROM shipments 
WHERE createdAt < @cutoff_date;

-- Step 2: If the list looks correct, run these deletes:

-- Unassign boxes from racks
UPDATE shipment_boxes 
SET rackId = NULL 
WHERE shipmentId IN (
    SELECT id FROM shipments WHERE createdAt < @cutoff_date
);

-- Delete boxes
DELETE FROM shipment_boxes 
WHERE shipmentId IN (
    SELECT id FROM shipments WHERE createdAt < @cutoff_date
);

-- Delete billing entries
DELETE FROM billing_entries 
WHERE shipmentId IN (
    SELECT id FROM shipments WHERE createdAt < @cutoff_date
);

-- Delete shipments
DELETE FROM shipments 
WHERE createdAt < @cutoff_date;
```

---

### **Method 3: Delete Shipment by Name or QR Code**

```sql
-- Find shipment by name
SELECT id, name, qrCode, status, createdAt 
FROM shipments 
WHERE name LIKE '%SEARCH_TEXT%';

-- Once you find the ID, use Method 1 above to delete
```

---

### **Method 4: Delete Using phpMyAdmin GUI (Easy)**

#### **Find the Shipment:**
1. Open phpMyAdmin
2. Select `warehouse_wms` database
3. Click on `shipments` table
4. Click "Browse" tab
5. Use "Search" to find your shipment
6. Note the shipment `id` (example: `clxx123abc`)

#### **Delete Related Data:**

**Step 1: Delete Boxes**
1. Click on `shipment_boxes` table
2. Click "Search" tab
3. In `shipmentId` field, enter the shipment ID
4. Click "Go"
5. Select all results (checkbox at top)
6. Scroll down, select "Delete" from dropdown
7. Click "Go" and confirm

**Step 2: Delete Billing Entries (if any)**
1. Click on `billing_entries` table
2. Repeat the search and delete process

**Step 3: Delete the Shipment**
1. Go back to `shipments` table
2. Find the shipment row
3. Click the "Delete" icon (❌ or trash icon)
4. Confirm deletion

---

## ⚠️ IMPORTANT: What About Racks?

### **Racks are NOT deleted automatically!**

When you delete a shipment:
- ✅ Boxes are deleted
- ✅ Shipment is deleted
- ❌ **Racks remain** (they just become empty/available again)

This is correct behavior because:
- Racks are physical storage locations
- Other shipments might use the same racks
- You can reuse the rack for new shipments

### **If you want to delete racks too:**

```sql
-- Find which racks had boxes from this shipment
SELECT DISTINCT rackId 
FROM shipment_boxes 
WHERE shipmentId = 'SHIPMENT_ID_HERE';

-- After deleting the shipment, delete specific racks:
DELETE FROM racks 
WHERE id IN ('rack_id_1', 'rack_id_2', 'rack_id_3');
```

---

## 🔒 Safety Tips

### **1. Always Backup First!**

Before deleting anything:

**Option A: Export Full Database**
1. Click `warehouse_wms` in left sidebar
2. Click "Export" tab
3. Select "Quick" method
4. Click "Go" - saves SQL file

**Option B: Export Just Shipments**
1. Select `shipments` table
2. Click "Export"
3. Save the file

### **2. Preview Before Delete**

Always run a SELECT query first:

```sql
-- Check what will be deleted
SELECT * FROM shipments WHERE id = 'SHIPMENT_ID_HERE';
SELECT * FROM shipment_boxes WHERE shipmentId = 'SHIPMENT_ID_HERE';
```

### **3. Use Transactions (Advanced)**

```sql
-- Start transaction
START TRANSACTION;

-- Run your delete queries
DELETE FROM shipment_boxes WHERE shipmentId = 'xxx';
DELETE FROM shipments WHERE id = 'xxx';

-- Check if everything looks good
SELECT * FROM shipments WHERE id = 'xxx';

-- If good: commit changes
COMMIT;

-- If bad: undo everything
-- ROLLBACK;
```

---

## 📊 Common Scenarios

### **Scenario 1: Delete a test shipment**
```sql
DELETE FROM shipment_boxes WHERE shipmentId = 'clxx123abc';
DELETE FROM shipments WHERE id = 'clxx123abc';
```

### **Scenario 2: Delete all shipments from a customer**
```sql
-- Find customer's shipments first
SELECT id, name FROM shipments WHERE customerId = 'CUSTOMER_ID';

-- Then delete using the IDs
```

### **Scenario 3: Clean up old completed shipments**
```sql
-- Delete all completed shipments older than 6 months
DELETE FROM shipment_boxes 
WHERE shipmentId IN (
    SELECT id FROM shipments 
    WHERE status = 'DELIVERED' 
    AND completedAt < DATE_SUB(NOW(), INTERVAL 6 MONTH)
);

DELETE FROM shipments 
WHERE status = 'DELIVERED' 
AND completedAt < DATE_SUB(NOW(), INTERVAL 6 MONTH);
```

---

## 🛠️ Troubleshooting

### **Error: Cannot delete - Foreign key constraint**

This means there's related data. Delete in this order:
1. `billing_entries` (if any)
2. `shipment_boxes` (boxes)
3. `shipments` (shipment itself)

### **Error: Access denied**

Make sure you're logged in as `root` user in phpMyAdmin.

### **Shipment still shows in UI**

After deleting from database:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh the page (Ctrl+F5)
3. Restart backend: `docker-compose restart wms-backend`

---

## 🎯 Quick Reference Commands

### **Delete One Shipment (Complete)**
```sql
SET @id = 'YOUR_SHIPMENT_ID';
DELETE FROM shipment_boxes WHERE shipmentId = @id;
DELETE FROM billing_entries WHERE shipmentId = @id;
DELETE FROM shipments WHERE id = @id;
```

### **Count What Will Be Deleted**
```sql
SELECT 
    (SELECT COUNT(*) FROM shipment_boxes WHERE shipmentId = 'xxx') AS boxes,
    (SELECT COUNT(*) FROM billing_entries WHERE shipmentId = 'xxx') AS billing_entries;
```

### **Find Shipment ID by QR Code**
```sql
SELECT id, name, qrCode FROM shipments WHERE qrCode = 'SHIPMENT_20250103_001';
```

---

## ✅ Best Practice Workflow

1. **Backup Database** (Export → SQL file)
2. **Find Shipment ID** (Search in phpMyAdmin or use SELECT query)
3. **Preview What Will Be Deleted** (Run SELECT queries)
4. **Delete Related Data First** (boxes, billing)
5. **Delete Main Shipment** (shipments table)
6. **Verify Deletion** (Check UI and database)
7. **Clear Browser Cache** (If needed)

---

**Need help with a specific deletion? Let me know the shipment details and I'll write the exact SQL query for you!** 🚀
