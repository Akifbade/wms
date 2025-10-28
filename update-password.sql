-- Update admin password with correct hash for 'demo123'
UPDATE users 
SET password='$2b$10$4iTO7hJ5BUbiWMlYVd0/VOXENTdgt/cobkRPF55wfUr6DGci3qs4O' 
WHERE email='admin@demo.com';

-- Verify user
SELECT id, email, name, role, isActive FROM users WHERE email='admin@demo.com';
