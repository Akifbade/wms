UPDATE qgo_db.User SET passwordHash='$2a$10$u8KG9fgTMIXmjAykJQelIOjNEDYFgnrwwfUw6geY9pCdzv27TXkLa' WHERE email='acshona143@gmail.com';
UPDATE qgo_db.User SET passwordHash='$2a$10$hS8RNDTfSoG9e7d0CLsP4uxC9xBMNdcLI0m3lpHz08TCHmInCHyqG' WHERE email='admin@qgo.com';
SELECT email, displayName FROM qgo_db.User WHERE email IN ('acshona143@gmail.com', 'admin@qgo.com');
