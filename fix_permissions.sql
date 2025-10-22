GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'wmsadmin'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
