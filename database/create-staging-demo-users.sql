-- STAGING DEMO USERS SETUP
USE warehouse_staging;

-- Create test company
INSERT INTO companies (id, name, email, phone, address, website, plan, ratePerDay, currency, isActive, createdAt, updatedAt) 
VALUES (
  UUID(),
  'Demo Company (Staging)',
  'demo@staging.com',
  '+1234567890',
  '123 Staging Street',
  'https://staging-demo.com',
  'BASIC',
  2.5,
  'USD',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name=name;

-- Create admin user: admin@demo.com / demo123
-- Password hash for "demo123": $2a$10$N9qo8uLOickgx2ZMRZoMye7DksuX3IL6TJcqgJl7U3h8UlDKkK.Ew
INSERT INTO users (id, email, password, name, phone, role, isActive, isDummy, companyId, createdAt, updatedAt)
VALUES (
  UUID(),
  'admin@demo.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye7DksuX3IL6TJcqgJl7U3h8UlDKkK.Ew',
  'Demo Admin',
  '+1111111111',
  'ADMIN',
  1,
  1,
  (SELECT id FROM companies LIMIT 1),
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name=name;

-- Create manager user: manager@demo.com / demo123
INSERT INTO users (id, email, password, name, phone, role, isActive, isDummy, companyId, createdAt, updatedAt)
VALUES (
  UUID(),
  'manager@demo.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye7DksuX3IL6TJcqgJl7U3h8UlDKkK.Ew',
  'Demo Manager',
  '+2222222222',
  'MANAGER',
  1,
  1,
  (SELECT id FROM companies LIMIT 1),
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name=name;

SELECT '✅ Staging demo users created successfully!' as status;
SELECT email, name, role FROM users;
