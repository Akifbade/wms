-- Add custom rate fields to shipments table for per-shipment pricing override
-- These fields allow setting custom storage rates that override company default rates

ALTER TABLE shipments 
ADD COLUMN customRateEnabled BOOLEAN NOT NULL DEFAULT FALSE AFTER cbm,
ADD COLUMN customRatePerCBMPerDay DECIMAL(10,3) NULL AFTER customRateEnabled,
ADD COLUMN customRatePerBoxPerDay DECIMAL(10,3) NULL AFTER customRatePerCBMPerDay,
ADD COLUMN customRateNotes TEXT NULL AFTER customRatePerBoxPerDay;

-- Add indexes for performance
CREATE INDEX idx_shipments_custom_rate ON shipments(customRateEnabled);

-- Add comment for documentation
ALTER TABLE shipments 
MODIFY COLUMN customRateEnabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Enable custom pricing for this shipment (overrides company billing settings)',
MODIFY COLUMN customRatePerCBMPerDay DECIMAL(10,3) NULL COMMENT 'Custom rate per CBM per day (KWD) - only used if customRateEnabled=true',
MODIFY COLUMN customRatePerBoxPerDay DECIMAL(10,3) NULL COMMENT 'Custom rate per box per day (KWD) - only used if customRateEnabled=true',
MODIFY COLUMN customRateNotes TEXT NULL COMMENT 'Notes explaining custom rate (e.g., special client discount, contract terms)';
