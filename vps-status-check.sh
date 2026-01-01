#!/bin/bash
echo "=== VPS CURRENT STATUS CHECK ==="
echo "Date: $(date)"
echo ""
echo "1. RUNNING CONTAINERS:"
docker ps
echo ""
echo "2. BACKEND PROCESS:"
docker exec wms-backend ps aux | grep node | grep -v grep || echo "Backend not running"
echo ""
echo "3. BACKEND LOGS (last 10 lines):"
docker logs wms-backend --tail 10 2>/dev/null || echo "No backend logs"
echo ""
echo "4. CONTAINER RESOURCES:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""
echo "5. HEALTH CHECK:"
curl -s http://localhost:5000/health || echo "Health check failed"
echo ""
echo "6. VPS SYSTEM INFO:"
uname -a
uptime
df -h /