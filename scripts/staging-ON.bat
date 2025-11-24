@echo off
echo.
echo Starting Staging Environment...
echo.
ssh root@148.230.107.155 "docker start wms-staging-backend wms-staging-frontend wms-staging-db && echo 'Staging Started!' && free -h"
echo.
pause
