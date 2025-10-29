USE warehouse_wms;

-- Create test company
INSERT INTO companies (id, name, email, phone, address, website, plan, ratePerDay, currency, isActive, createdAt, updatedAt) 
VALUES (
  UUID(),
  'Demo Company',
  'demo@company.com',
  '+1234567890',
  '123 Demo Street',
  'https://demo.com',
  'BASIC',
  2.5,
  'USD',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name=name;

-- Create admin user with email admin@demo.com
-- Password: demo123 (hash: $2a$10$k2r/pAq5jN5PkXqJY8qYSuKH5Z3Z8X2Kw7Z5Z8X2Kw7Z5Z8X2Kw - example)
-- We'll use a known hash
INSERT INTO users (id, email, password, name, phone, role, isActive, companyId, createdAt, updatedAt)
VALUES (
  UUID(),
  'admin@demo.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye7DksuX3IL6TJcqgJl7U3h8UlDKkK.Ew',
  'Demo Admin',
  '+1111111111',
  'ADMIN',
  1,
  (SELECT id FROM companies LIMIT 1),
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name=name;

SELECT 'Admin created: admin@demo.com / demo123' as status;
SELECT email, role FROM users;
