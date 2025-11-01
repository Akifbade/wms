@echo off
echo.
echo Stopping Staging Environment...
echo.
ssh root@148.230.107.155 "docker stop wms-staging-backend wms-staging-frontend wms-staging-db && echo 'Staging Stopped - 900MB RAM Freed!' && free -h"
echo.
pause
