-- Update all existing IN_WAREHOUSE and PARTIAL shipments to have assignedBy = Admin User
-- This backfills the assignedById field for shipments that were assigned before tracking was added

-- First, find the Admin user ID (assuming there's an admin user)
SET @adminUserId = (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1);

-- Update shipments that are assigned but missing assignedById
UPDATE shipments 
SET assignedById = @adminUserId,
    assignedAt = COALESCE(assignedAt, updatedAt) -- Use existing assignedAt or updatedAt as fallback
WHERE (status = 'IN_WAREHOUSE' OR status = 'PARTIAL' OR status IN ('IN_STORAGE', 'ACTIVE'))
  AND assignedById IS NULL
  AND EXISTS (
    SELECT 1 FROM shipment_boxes 
    WHERE shipment_boxes.shipmentId = shipments.id 
    AND shipment_boxes.rackId IS NOT NULL
  );

-- Show results
SELECT 
    referenceId,
    status,
    assignedAt,
    assignedById,
    (SELECT name FROM users WHERE id = shipments.assignedById) as assignedByName
FROM shipments 
WHERE assignedById IS NOT NULL
ORDER BY assignedAt DESC
LIMIT 10;
