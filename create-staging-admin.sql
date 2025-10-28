-- Create admin user for staging
-- First create a dummy company if none exists
INSERT IGNORE INTO companies (id, name, email, phone, address, isActive, createdAt, updatedAt)
VALUES ('company001', 'Default Company', 'admin@demo.com', '0000000000', 'Default Address', 1, NOW(), NOW());

-- Delete existing admin if any
DELETE FROM users WHERE email='admin@demo.com';

-- Create admin user (password: demo123)
INSERT INTO users (id, email, password, name, phone, role, isActive, isDummy, companyId, createdAt, updatedAt) 
VALUES (
  'admin001',
  'admin@demo.com',
  '$2a$10$eJPfZxd.MzQ0l7qCQhZLUuqVHGKxHtFXZ3vYzKqP4jLwN8tYvKqJW',
  'Admin User',
  '1234567890',
  'ADMIN',
  1,
  0,
  'company001',
  NOW(),
  NOW()
);
