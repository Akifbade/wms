-- Add Role enum and update User table
-- Migration: add_role_enum_and_permissions

-- Step 1: Create Role enum
CREATE TYPE `Role` AS ENUM ('ADMIN', 'MANAGER', 'DRIVER', 'WORKER', 'SCANNER', 'PACKER', 'LABOR');

-- Step 2: Add new columns to users table
ALTER TABLE `users` 
  ADD COLUMN `isDummy` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `permissions` TEXT NULL;

-- Step 3: Update existing role values to match enum (if needed)
-- Convert existing string roles to enum-compatible values
UPDATE `users` SET `role` = 'ADMIN' WHERE `role` = 'admin' OR `role` = 'ADMIN';
UPDATE `users` SET `role` = 'MANAGER' WHERE `role` = 'manager' OR `role` = 'MANAGER';
UPDATE `users` SET `role` = 'WORKER' WHERE `role` = 'worker' OR `role` = 'WORKER' OR `role` IS NULL OR `role` = '';

-- Step 4: Modify role column to use enum (MySQL version)
-- Note: MySQL doesn't have ENUM type like PostgreSQL, using VARCHAR with CHECK constraint
ALTER TABLE `users` 
  MODIFY COLUMN `role` ENUM('ADMIN', 'MANAGER', 'DRIVER', 'WORKER', 'SCANNER', 'PACKER', 'LABOR') NOT NULL DEFAULT 'WORKER';
