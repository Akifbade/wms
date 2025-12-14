-- Release shipment WHM963574830
UPDATE shipments SET status='RELEASED', releasedAt=NOW() WHERE id='cmhvpkttl00ttyu3jme38rth2';
SELECT id, qrCode, referenceId, status, releasedAt FROM shipments WHERE id='cmhvpkttl00ttyu3jme38rth2';
