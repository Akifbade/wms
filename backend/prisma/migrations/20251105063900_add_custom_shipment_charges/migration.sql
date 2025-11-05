-- Custom Shipment Charges Feature
-- Allows per-shipment rate overrides for storage charges

-- Add custom rate fields to shipments table (idempotent - won't fail if columns exist)
ALTER TABLE `shipments` 
  ADD COLUMN IF NOT EXISTS `customRateEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `customRatePerCBMPerDay` DECIMAL(10,3) NULL,
  ADD COLUMN IF NOT EXISTS `customRatePerBoxPerDay` DECIMAL(10,3) NULL,
  ADD COLUMN IF NOT EXISTS `customRateNotes` TEXT NULL;

-- Add index for quick filtering of custom-rate shipments
CREATE INDEX IF NOT EXISTS `shipments_customRateEnabled_idx` ON `shipments`(`customRateEnabled`);

-- Add comments for documentation (MySQL 5.7+ feature)
ALTER TABLE `shipments` 
  MODIFY COLUMN `customRateEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'Enable custom pricing for this shipment',
  MODIFY COLUMN `customRatePerCBMPerDay` DECIMAL(10,3) NULL COMMENT 'Custom rate per CBM per day (overrides company default)',
  MODIFY COLUMN `customRatePerBoxPerDay` DECIMAL(10,3) NULL COMMENT 'Custom rate per box per day (overrides company default)',
  MODIFY COLUMN `customRateNotes` TEXT NULL COMMENT 'Notes explaining the custom rate';
