-- Update admin email to admin@demo.com
UPDATE users SET email='admin@demo.com' WHERE id='admin-user-001';
UPDATE companies SET email='admin@demo.com' WHERE id='test-company-001';

-- Show updated users
SELECT id, email, name, role, companyId FROM users;
