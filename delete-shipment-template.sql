-- ═══════════════════════════════════════════════════════════
-- SAFE SHIPMENT DELETION TEMPLATE
-- Copy and paste into phpMyAdmin SQL tab
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Find the shipment you want to delete
-- -----------------------------------------------
-- Option A: Search by name
SELECT id, name, qrCode, status, createdAt 
FROM shipments 
WHERE name LIKE '%SEARCH_HERE%'
LIMIT 10;

-- Option B: Search by QR code
SELECT id, name, qrCode, status, createdAt 
FROM shipments 
WHERE qrCode LIKE '%SEARCH_HERE%'
LIMIT 10;

-- Option C: List recent shipments
SELECT id, name, qrCode, status, createdAt 
FROM shipments 
ORDER BY createdAt DESC 
LIMIT 20;


-- STEP 2: Preview what will be deleted
-- -----------------------------------------------
-- Replace 'YOUR_SHIPMENT_ID_HERE' with actual ID from Step 1

SET @shipment_id = 'YOUR_SHIPMENT_ID_HERE';

-- Check shipment details
SELECT * FROM shipments WHERE id = @shipment_id;

-- Check how many boxes will be deleted
SELECT COUNT(*) AS total_boxes FROM shipment_boxes WHERE shipmentId = @shipment_id;

-- Check which racks are affected (boxes will be unassigned, racks kept)
SELECT DISTINCT r.id, r.rackNumber, r.zone 
FROM shipment_boxes sb 
JOIN racks r ON sb.rackId = r.id 
WHERE sb.shipmentId = @shipment_id;

-- Check billing entries
SELECT COUNT(*) AS billing_entries FROM billing_entries WHERE shipmentId = @shipment_id;


-- STEP 3: DELETE THE SHIPMENT (Complete Removal)
-- -----------------------------------------------
-- ⚠️ WARNING: This cannot be undone! Make sure you checked Step 2 first!

SET @shipment_id = 'YOUR_SHIPMENT_ID_HERE';

-- A. Unassign boxes from racks (racks will remain, just become available)
UPDATE shipment_boxes 
SET rackId = NULL 
WHERE shipmentId = @shipment_id;

-- B. Delete all boxes
DELETE FROM shipment_boxes 
WHERE shipmentId = @shipment_id;

-- C. Delete billing entries
DELETE FROM billing_entries 
WHERE shipmentId = @shipment_id;

-- D. Delete the shipment itself
DELETE FROM shipments 
WHERE id = @shipment_id;

-- E. Confirmation
SELECT CONCAT('Shipment ', @shipment_id, ' deleted successfully!') AS Status;


-- ═══════════════════════════════════════════════════════════
-- ALTERNATIVE: Delete Multiple Shipments by Date
-- ═══════════════════════════════════════════════════════════

-- PREVIEW: List shipments before a certain date
SELECT id, name, qrCode, status, createdAt 
FROM shipments 
WHERE createdAt < '2025-01-01'
ORDER BY createdAt DESC;

-- DELETE: Remove all shipments before a certain date
-- ⚠️ WARNING: Double check the date first!

SET @cutoff_date = '2025-01-01';

-- Unassign boxes from racks
UPDATE shipment_boxes 
SET rackId = NULL 
WHERE shipmentId IN (SELECT id FROM shipments WHERE createdAt < @cutoff_date);

-- Delete boxes
DELETE FROM shipment_boxes 
WHERE shipmentId IN (SELECT id FROM shipments WHERE createdAt < @cutoff_date);

-- Delete billing entries
DELETE FROM billing_entries 
WHERE shipmentId IN (SELECT id FROM shipments WHERE createdAt < @cutoff_date);

-- Delete shipments
DELETE FROM shipments 
WHERE createdAt < @cutoff_date;


-- ═══════════════════════════════════════════════════════════
-- DELETE SPECIFIC RACKS (Optional)
-- ═══════════════════════════════════════════════════════════
-- Only use this if you want to remove the physical racks too
-- Normally you should keep racks for reuse!

-- Find empty racks that can be deleted
SELECT id, rackNumber, zone, status 
FROM racks 
WHERE status = 'AVAILABLE' 
AND id NOT IN (SELECT DISTINCT rackId FROM shipment_boxes WHERE rackId IS NOT NULL);

-- Delete specific rack by ID
DELETE FROM racks WHERE id = 'RACK_ID_HERE';

-- Or delete multiple racks
DELETE FROM racks WHERE id IN ('rack1', 'rack2', 'rack3');


-- ═══════════════════════════════════════════════════════════
-- UTILITY QUERIES (Helpful Commands)
-- ═══════════════════════════════════════════════════════════

-- Count total shipments
SELECT COUNT(*) AS total_shipments FROM shipments;

-- Count shipments by status
SELECT status, COUNT(*) AS count 
FROM shipments 
GROUP BY status;

-- Find oldest shipments
SELECT id, name, qrCode, createdAt 
FROM shipments 
ORDER BY createdAt ASC 
LIMIT 10;

-- Find shipments with most boxes
SELECT s.id, s.name, COUNT(sb.id) AS box_count 
FROM shipments s 
LEFT JOIN shipment_boxes sb ON s.id = sb.shipmentId 
GROUP BY s.id 
ORDER BY box_count DESC 
LIMIT 10;

-- Check database size
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES 
WHERE table_schema = 'warehouse_wms'
ORDER BY (data_length + index_length) DESC;


-- ═══════════════════════════════════════════════════════════
-- ROLLBACK PROTECTION (Advanced)
-- ═══════════════════════════════════════════════════════════
-- Use this if you want to be extra safe

START TRANSACTION;

-- Run your delete queries here
-- DELETE FROM ...

-- Check if everything looks correct
SELECT * FROM shipments WHERE id = 'YOUR_ID';

-- If good: save changes
COMMIT;

-- If bad: undo everything (must run before COMMIT)
-- ROLLBACK;


-- ═══════════════════════════════════════════════════════════
-- END OF TEMPLATE
-- ═══════════════════════════════════════════════════════════
