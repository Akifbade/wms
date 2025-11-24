#!/bin/bash
# Fix Production Database - Add Zone Columns

echo "Connecting to production database..."

docker exec wms-database mysql -u root -prootpassword123 warehouse_wms << 'ENDSQL'

-- Check if zone column exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'warehouse_wms' 
AND TABLE_NAME = 'racks' 
AND COLUMN_NAME = 'zone';

-- Add zone column if it doesn't exist
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE racks ADD COLUMN zone VARCHAR(191) DEFAULT ''Unassigned'' AFTER location',
    'SELECT ''zone column already exists'' as Info');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add zoneDescription column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'warehouse_wms' 
AND TABLE_NAME = 'racks' 
AND COLUMN_NAME = 'zoneDescription';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE racks ADD COLUMN zoneDescription TEXT AFTER zone',
    'SELECT ''zoneDescription column already exists'' as Info');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add zoneIcon column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'warehouse_wms' 
AND TABLE_NAME = 'racks' 
AND COLUMN_NAME = 'zoneIcon';

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE racks ADD COLUMN zoneIcon VARCHAR(50) DEFAULT ''📦'' AFTER zoneDescription',
    'SELECT ''zoneIcon column already exists'' as Info');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify columns
SELECT 'Migration Complete!' as Status;
SHOW COLUMNS FROM racks LIKE 'zone%';

ENDSQL

echo "Done! Restarting backend..."
docker restart wms-backend

echo "Waiting for backend to start..."
sleep 10

echo "Checking backend health..."
curl -s http://localhost:5000/api/health | jq .

echo ""
echo "Production database fixed!"
