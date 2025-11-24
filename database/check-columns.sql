SELECT COLUMN_NAME 
FROM information_schema.COLUMNS 
WHERE TABLE_NAME='racks' 
AND TABLE_SCHEMA='warehouse_wms' 
AND COLUMN_NAME IN ('zone', 'zoneDescription', 'zoneIcon', 'capacityMode', 'palletCapacity', 'boxCapacity', 'currentPallets', 'currentBoxes')
ORDER BY ORDINAL_POSITION;
