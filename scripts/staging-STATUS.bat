@echo off
echo.
echo Staging Environment Status
echo ===========================
echo.
ssh root@148.230.107.155 "docker ps -a --filter name=wms-staging --format 'table {{.Names}}\t{{.Status}}' && echo '' && echo 'Memory Usage:' && free -h"
echo.
pause
