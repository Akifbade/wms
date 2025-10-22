UPDATE wms_db.users SET password='$2a$10$scKVfMOi7O9hW/PqOcxbOeOUpmDvAURicG1DcQGUMUYuYv7waJ14.' WHERE username='admin';
UPDATE wms_db.users SET password='$2a$10$5sflM55idIMk3Jrg.WFBEeuoFh5v2.cuV3Cx1GANPFqc38bB8QFb2' WHERE email='a@gmail.com';
SELECT id, username, email, password FROM wms_db.users WHERE username='admin' OR email='a@gmail.com';
