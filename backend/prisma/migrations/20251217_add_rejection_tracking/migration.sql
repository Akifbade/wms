-- Add columns to track rejection history for moving job approvals
ALTER TABLE `material_approvals` 
ADD COLUMN `previousMaterialsSnapshot` LONGTEXT NULL,
ADD COLUMN `rejectionCount` INT NOT NULL DEFAULT 0;
