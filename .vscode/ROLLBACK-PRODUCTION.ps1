# ROLLBACK PRODUCTION DEPLOYMENT
# Backup: BEFORE_DEPLOY_20251122_203436.sql.gz
# Created: 20251122_203436

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$VPS_PATH = "/root/NEW START"
$BACKUP_FILE = "BEFORE_DEPLOY_20251122_203436.sql.gz"

Write-Host "Rolling back to backup: $BACKUP_FILE" -ForegroundColor Yellow

# Restore database
ssh ${VPS_USER}@${VPS_HOST} "zcat '$VPS_PATH/backups-production/$BACKUP_FILE' | docker exec -i wms-database mysql -uroot -prootpassword123"

# Restart containers
ssh ${VPS_USER}@${VPS_HOST} "cd '$VPS_PATH' && docker-compose restart"

Write-Host "Rollback complete!" -ForegroundColor Green
