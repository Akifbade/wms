-- Fix missing columns in material_issues table
ALTER TABLE material_issues ADD COLUMN issueType VARCHAR(50) NOT NULL DEFAULT 'JOB' AFTER jobId;
ALTER TABLE material_issues ADD COLUMN reference VARCHAR(255) NULL AFTER issueType;
