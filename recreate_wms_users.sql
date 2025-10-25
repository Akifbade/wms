DROP USER IF EXISTS 'wms_user'@'localhost';
DROP USER IF EXISTS 'wms_user'@'%';
DROP USER IF EXISTS 'wmsadmin'@'localhost';

CREATE USER 'wms_user'@'localhost' IDENTIFIED BY 'WmsSecure2024Pass';
CREATE USER 'wms_user'@'%' IDENTIFIED BY 'WmsSecure2024Pass';
CREATE USER 'wmsadmin'@'localhost' IDENTIFIED BY 'wmsadmin_password';

GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'wmsadmin'@'localhost' WITH GRANT OPTION;

FLUSH PRIVILEGES;
