-- Move shipment WHM963574830 to IN_WAREHOUSE
UPDATE shipments SET status='IN_WAREHOUSE' WHERE qrCode='WHM963574830';
SELECT id, qrCode, status FROM shipments WHERE qrCode='WHM963574830';
