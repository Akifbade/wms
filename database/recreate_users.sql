DROP USER IF EXISTS 'qgo_user'@'localhost';
DROP USER IF EXISTS 'qgo_user'@'%';
DROP USER IF EXISTS 'wms_user'@'localhost';
DROP USER IF EXISTS 'wms_user'@'%';
DROP USER IF EXISTS 'wmsadmin'@'localhost';

CREATE USER 'qgo_user'@'localhost' IDENTIFIED BY 'qgo_password';
CREATE USER 'qgo_user'@'%' IDENTIFIED BY 'qgo_password';
CREATE USER 'wms_user'@'localhost' IDENTIFIED BY 'wms_password';
CREATE USER 'wms_user'@'%' IDENTIFIED BY 'wms_password';
CREATE USER 'wmsadmin'@'localhost' IDENTIFIED BY 'wmsadmin_password';

GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'wmsadmin'@'localhost' WITH GRANT OPTION;

FLUSH PRIVILEGES;
