UPDATE mysql.user SET authentication_string=PASSWORD('qgo_password') WHERE user='qgo_user' AND host='localhost';
UPDATE mysql.user SET authentication_string=PASSWORD('qgo_password') WHERE user='qgo_user' AND host='%';
UPDATE mysql.user SET authentication_string=PASSWORD('wms_password') WHERE user='wms_user' AND host='localhost';
UPDATE mysql.user SET authentication_string=PASSWORD('wms_password') WHERE user='wms_user' AND host='%';
UPDATE mysql.user SET authentication_string=PASSWORD('wmsadmin_password') WHERE user='wmsadmin' AND host='localhost';

GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'%';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_db.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'wmsadmin'@'localhost' WITH GRANT OPTION;

FLUSH PRIVILEGES;
