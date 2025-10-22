-- Create database users on new VPS
CREATE USER IF NOT EXISTS 'qgo_user'@'localhost' IDENTIFIED BY 'qgo_password';
CREATE USER IF NOT EXISTS 'qgo_user'@'%' IDENTIFIED BY 'qgo_password';
CREATE USER IF NOT EXISTS 'wms_user'@'localhost' IDENTIFIED BY 'wms_password';
CREATE USER IF NOT EXISTS 'wms_user'@'%' IDENTIFIED BY 'wms_password';
CREATE USER IF NOT EXISTS 'wmsadmin'@'localhost' IDENTIFIED BY 'wmsadmin_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wmsadmin'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wmsadmin'@'localhost';

FLUSH PRIVILEGES;

-- Verify users
SELECT user, host FROM mysql.user WHERE user IN ('qgo_user', 'wms_user', 'wmsadmin');
