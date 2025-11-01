-- Fix logo paths in database from /uploads/logos/ to /uploads/company-logos/

USE warehouse_wms;

-- Show current paths
SELECT id, name, logoPath FROM Company WHERE logoPath IS NOT NULL;

-- Update paths
UPDATE Company 
SET logoPath = REPLACE(logoPath, '/uploads/logos/', '/uploads/company-logos/') 
WHERE logoPath LIKE '/uploads/logos/%';

-- Verify changes
SELECT id, name, logoPath FROM Company WHERE logoPath IS NOT NULL;

-- Show count
SELECT COUNT(*) as companies_with_logos FROM Company WHERE logoPath IS NOT NULL;
