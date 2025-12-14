#!/bin/bash
JOBID="$1"
if [ -z "$JOBID" ]; then
  echo "Usage: ./query_job_returns.sh <jobId>"
  exit 1
fi

docker exec -i wms-database mysql -uroot -prootpassword123 -D warehouse_wms -e "SELECT id, jobId, uploadToken, uploadTokenExpiry, physicalReportUrl, recordedAt FROM material_returns WHERE jobId = '${JOBID}' ORDER BY recordedAt DESC;"
