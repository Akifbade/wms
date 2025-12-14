#!/bin/bash
docker exec -i wms-database mysql -uroot -prootpassword123 -D warehouse_wms -e "SELECT id, jobId, uploadToken, uploadTokenExpiry, physicalReportUrl, recordedAt FROM material_returns WHERE uploadToken IS NOT NULL ORDER BY recordedAt DESC LIMIT 20;"
