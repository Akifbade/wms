#!/bin/bash
# Count material_returns with non-null uploadToken

docker exec -i wms-database bash -lc "mysql -uroot -prootpassword123 -D warehouse_wms -e 'SELECT COUNT(*) FROM material_returns WHERE uploadToken IS NOT NULL;'"
