SELECT qrCode, referenceId, name, status FROM shipments WHERE qrCode LIKE '%963574830%' OR referenceId LIKE '%963574830%' OR name LIKE '%963574830%';
SELECT qrCode, referenceId, name, status FROM shipments WHERE status='IN_STORAGE' LIMIT 10;
