-- Add type column to Client table if it doesn't exist
ALTER TABLE `Client` ADD COLUMN `type` VARCHAR(191) NULL;
