-- Add missing billing_settings columns for production

ALTER TABLE billing_settings 
ADD COLUMN storageRatePerCBM DECIMAL(10,2) DEFAULT 0.00;

-- Verify the column was added
DESCRIBE billing_settings;
