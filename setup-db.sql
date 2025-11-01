CREATE DATABASE IF NOT EXISTS wms_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wms_user'@'localhost' IDENTIFIED BY 'WmsSecure2025!@#';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
FLUSH PRIVILEGES;
