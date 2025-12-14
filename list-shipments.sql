-- Find all shipments
SELECT id, qrCode, name, status FROM shipments ORDER BY createdAt DESC LIMIT 20;
