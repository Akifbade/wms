-- Find shipment with IN_STORAGE status
SELECT id, qrCode, name, status FROM shipments WHERE status='IN_STORAGE' LIMIT 10;
SELECT id, qrCode, name, status FROM shipments WHERE qrCode LIKE '%WHM%' ORDER BY createdAt DESC LIMIT 10;
