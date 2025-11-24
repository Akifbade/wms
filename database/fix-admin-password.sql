-- Fix admin password
UPDATE users 
SET password = '$2a$10$cEVnQOIUdl0Fpb4.Cy8p7Ot1iCd5CKRAlwgiofE4gM.GulY//XMR6'
WHERE email = 'admin@demo.com';

SELECT email, password FROM users WHERE email = 'admin@demo.com';
