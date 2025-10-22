UPDATE wms_db.users SET password='$2a$10$OSJO2PGMbPmsJ7p4pSTy2uVsbZ8Os.fL1RbM/GCcEza3iCVDnrZ2O' WHERE username='admin';
SELECT id, username, email FROM wms_db.users WHERE username='admin';
