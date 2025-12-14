-- Find and release shipment WHM963574830
SELECT id, qrCode, status FROM shipments WHERE qrCode='WHM963574830';
UPDATE shipments SET status='RELEASED', releasedAt=NOW() WHERE qrCode='WHM963574830';
SELECT id, qrCode, status, releasedAt FROM shipments WHERE qrCode='WHM963574830';
