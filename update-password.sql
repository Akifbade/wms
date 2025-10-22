-- Update admin password with fresh hash for 'admin123'
UPDATE users 
SET password='$2a$10$gqVlRz2N/mRdOZrvpvqeTO8GULsch/9lKBCELFwGPX1y0vzGPClOq' 
WHERE email='admin@demo.com';

-- Verify user
SELECT id, email, name, role, isActive FROM users WHERE email='admin@demo.com';
