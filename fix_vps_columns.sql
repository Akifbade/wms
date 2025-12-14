-- Add missing columns to material_returns table
ALTER TABLE material_returns ADD COLUMN physicalReportUrl VARCHAR(500);
ALTER TABLE material_returns ADD COLUMN uploadToken VARCHAR(255) UNIQUE;
ALTER TABLE material_returns ADD COLUMN uploadTokenExpiry DATETIME;
