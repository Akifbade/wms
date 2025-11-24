-- Add Zone and Flexible Capacity fields to racks table
-- SAFE MIGRATION - All fields are nullable or have defaults

-- Add zone organization fields
ALTER TABLE `racks` ADD COLUMN `zone` VARCHAR(191) NULL DEFAULT 'Unassigned';
ALTER TABLE `racks` ADD COLUMN `zoneDescription` TEXT NULL;

-- Add flexible capacity fields
ALTER TABLE `racks` ADD COLUMN `capacityMode` VARCHAR(191) NULL DEFAULT 'FIXED';
ALTER TABLE `racks` ADD COLUMN `palletCapacity` INT NULL;
ALTER TABLE `racks` ADD COLUMN `boxCapacity` INT NULL;
ALTER TABLE `racks` ADD COLUMN `currentPallets` INT NULL DEFAULT 0;
ALTER TABLE `racks` ADD COLUMN `currentBoxes` INT NULL DEFAULT 0;
ALTER TABLE `racks` ADD COLUMN `capacityNotes` TEXT NULL;

-- Create index for zone filtering (performance optimization)
CREATE INDEX `idx_racks_zone` ON `racks`(`zone`);
CREATE INDEX `idx_racks_capacity_mode` ON `racks`(`capacityMode`);
