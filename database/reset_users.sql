ALTER USER 'qgo_user'@'localhost' IDENTIFIED BY 'qgo_password';
ALTER USER 'qgo_user'@'%' IDENTIFIED BY 'qgo_password';
ALTER USER 'wms_user'@'localhost' IDENTIFIED BY 'wms_password';
ALTER USER 'wms_user'@'%' IDENTIFIED BY 'wms_password';
ALTER USER 'wmsadmin'@'localhost' IDENTIFIED BY 'wmsadmin_password';

GRANT USAGE ON *.* TO 'qgo_user'@'localhost';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';

GRANT USAGE ON *.* TO 'qgo_user'@'%';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'%';

GRANT USAGE ON *.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';

GRANT USAGE ON *.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';

GRANT ALL PRIVILEGES ON *.* TO 'wmsadmin'@'localhost';

FLUSH PRIVILEGES;
