#!/bin/bash

docker exec -i wms-database bash -lc "mysql -uroot -prootpassword123 -D warehouse_wms -e 'SELECT id, jobCode FROM moving_jobs LIMIT 5;'"
