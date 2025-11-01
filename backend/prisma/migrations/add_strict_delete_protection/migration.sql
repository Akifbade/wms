-- Add soft delete columns for strict delete protection
ALTER TABLE `shipments` ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE INDEX `shipments_deletedAt_idx` ON `shipments`(`deletedAt`);

ALTER TABLE `moving_jobs` ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE INDEX `moving_jobs_deletedAt_idx` ON `moving_jobs`(`deletedAt`);

ALTER TABLE `racks` ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE INDEX `racks_deletedAt_idx` ON `racks`(`deletedAt`);
