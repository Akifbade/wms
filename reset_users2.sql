SET PASSWORD FOR 'qgo_user'@'localhost' = PASSWORD('qgo_password');
SET PASSWORD FOR 'qgo_user'@'%' = PASSWORD('qgo_password');
SET PASSWORD FOR 'wms_user'@'localhost' = PASSWORD('wms_password');
SET PASSWORD FOR 'wms_user'@'%' = PASSWORD('wms_password');
SET PASSWORD FOR 'wmsadmin'@'localhost' = PASSWORD('wmsadmin_password');

GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'wmsadmin'@'localhost' WITH GRANT OPTION;

FLUSH PRIVILEGES;
