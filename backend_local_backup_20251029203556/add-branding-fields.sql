-- Add branding fields to companies table (SQLite)
-- Run this with: sqlite3 backend/prisma/dev.db < add-branding-fields.sql

ALTER TABLE companies ADD COLUMN primaryColor TEXT DEFAULT '#4F46E5';
ALTER TABLE companies ADD COLUMN secondaryColor TEXT DEFAULT '#7C3AED';
ALTER TABLE companies ADD COLUMN accentColor TEXT DEFAULT '#10B981';
ALTER TABLE companies ADD COLUMN showCompanyName INTEGER DEFAULT 1;

-- Verify the changes
SELECT name, primaryColor, secondaryColor, accentColor, showCompanyName FROM companies;
