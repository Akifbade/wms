-- ========================================
-- STAGING MIGRATION: v2.1.138
-- Date: November 3, 2025
-- Description: Add login customization fields to companies table
-- ========================================

-- Add login customization columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS loginVideoUrl VARCHAR(500) DEFAULT 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4',
ADD COLUMN IF NOT EXISTS loginVideoEnabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS loginGlassEffect BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS loginBackgroundType VARCHAR(50) DEFAULT 'video',
ADD COLUMN IF NOT EXISTS loginBackgroundImage VARCHAR(500),
ADD COLUMN IF NOT EXISTS loginShowFeatures BOOLEAN DEFAULT TRUE;

-- Verify the columns were added
SELECT 
    'companies' as table_name,
    COUNT(*) as total_companies,
    SUM(CASE WHEN loginVideoEnabled = TRUE THEN 1 ELSE 0 END) as video_enabled_count
FROM companies;

-- Show sample data
SELECT 
    id, 
    name, 
    loginVideoUrl, 
    loginVideoEnabled, 
    loginGlassEffect, 
    loginBackgroundType,
    loginShowFeatures
FROM companies 
LIMIT 3;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next Steps:
-- 1. Verify columns exist: SHOW COLUMNS FROM companies;
-- 2. Test login page: http://148.230.107.155:8080
-- 3. Test settings: Login > Settings > Company Settings
-- 4. Test shipment deletion: Delete a RELEASED shipment
-- ========================================
