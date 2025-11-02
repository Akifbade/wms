ALTER TABLE racks ADD COLUMN capacityMode ENUM('pallets', 'boxes', 'both') DEFAULT 'both' AFTER zoneIcon;
ALTER TABLE racks ADD COLUMN palletCapacity INT DEFAULT 0 AFTER capacityMode;
ALTER TABLE racks ADD COLUMN boxCapacity INT DEFAULT 0 AFTER palletCapacity;
ALTER TABLE racks ADD COLUMN currentPallets INT DEFAULT 0 AFTER boxCapacity;
ALTER TABLE racks ADD COLUMN currentBoxes INT DEFAULT 0 AFTER currentPallets;
SELECT 'All columns added!' as Status;
