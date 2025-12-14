-- Find shipment by referenceId
SELECT id, qrCode, referenceId, name, status FROM shipments WHERE referenceId LIKE '%963574830%' OR referenceId='WHM963574830';
SELECT id, qrCode, referenceId, name, status FROM shipments WHERE status='IN_STORAGE';
