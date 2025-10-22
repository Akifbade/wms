-- Status Workflow Migration
-- Updates shipment status values from ACTIVE to PENDING/IN_STORAGE

-- Update existing ACTIVE shipments to appropriate status
UPDATE shipments 
SET status = CASE 
  WHEN rackId IS NOT NULL THEN 'IN_STORAGE'
  ELSE 'PENDING'
END
WHERE status = 'ACTIVE';

-- Note: Schema doesn't have enum, so these are string values
-- Valid statuses after migration:
-- PENDING - Shipment received but boxes not assigned to racks
-- IN_STORAGE - All boxes assigned to racks  
-- PARTIAL - Some boxes released
-- RELEASED - All boxes released
