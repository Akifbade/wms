#!/bin/bash

docker exec -i wms-database bash -lc "mysql -uroot -prootpassword123 -D warehouse_wms -e 'SELECT id, email FROM users LIMIT 3;'"
