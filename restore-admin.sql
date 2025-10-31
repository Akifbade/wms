-- Restore admin password from backup
UPDATE users 
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMye1KNQZ0xN7KM7cR8R1fTwH0fXz2zG3fO'
WHERE email = 'admin@wms.com';

SELECT email, password FROM users WHERE email = 'admin@wms.com';
