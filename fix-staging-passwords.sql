-- Fix staging user passwords
USE warehouse_staging;

-- Update password for admin@demo.com and manager@demo.com
-- Password: demo123
-- Hash: $2b$10$xd1IcGh7LvXjcQBNEnb8zuRwWekVq9VYGxQBQ9JnI.2tmCBYWzIzS

UPDATE users 
SET password = '$2b$10$xd1IcGh7LvXjcQBNEnb8zuRwWekVq9VYGxQBQ9JnI.2tmCBYWzIzS' 
WHERE email IN ('admin@demo.com', 'manager@demo.com');

SELECT '✅ Passwords updated for staging users!' as status;
SELECT email, name, role, 'demo123' as password FROM users;
