-- Add CBM rate field to BillingSettings
-- This allows proper Per Cubic Meter pricing in addition to Per Box pricing

-- Add the new column with default value
ALTER TABLE `BillingSettings` 
ADD COLUMN `storageRatePerCBM` DOUBLE NOT NULL DEFAULT 0.500 
COMMENT 'Storage rate per cubic meter per day (KWD)' 
AFTER `storageRatePerBox`;

-- Update storageRateType to use new values
-- Change "PER_DAY" to "PER_BOX" for existing records (backward compatibility)
UPDATE `BillingSettings` 
SET `storageRateType` = 'PER_BOX' 
WHERE `storageRateType` = 'PER_DAY';

-- For companies that want CBM pricing, they can now:
-- 1. Set storageRateType = 'PER_CUBIC_METER'
-- 2. Set storageRatePerCBM = 5.0 (or their rate)
-- 3. Invoice will automatically use: days × CBM × rate

SELECT 'Migration complete! Now settings support both PER_BOX and PER_CUBIC_METER pricing.' AS status;
