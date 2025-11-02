ALTER TABLE racks ADD COLUMN zone VARCHAR(191) DEFAULT 'Unassigned' AFTER location;
ALTER TABLE racks ADD COLUMN zoneDescription TEXT AFTER zone;
ALTER TABLE racks ADD COLUMN zoneIcon VARCHAR(50) DEFAULT '' AFTER zoneDescription;
SELECT 'Done!' as Status;
