-- Update WMS user passwords to match .env file
UPDATE mysql.user SET authentication_string=PASSWORD('WmsSecure2024Pass') WHERE user='wms_user';
FLUSH PRIVILEGES;

-- Verify
SELECT user, host FROM mysql.user WHERE user='wms_user';
