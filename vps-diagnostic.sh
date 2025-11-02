#!/bin/bash
# VPS Backend Diagnostic Script
# Run this on VPS: ssh root@148.230.107.155

echo "🔍 WMS Backend Diagnostic - VPS: 148.230.107.155"
echo "=================================================="

echo -e "\n1️⃣ Checking Docker Containers Status..."
docker ps -a --filter "name=wms"

echo -e "\n2️⃣ Checking Backend Logs (Last 50 lines)..."
docker logs wms-backend --tail 50

echo -e "\n3️⃣ Checking Backend Health..."
curl -s http://localhost:5000/api/health | jq . || echo "❌ Backend not responding!"

echo -e "\n4️⃣ Checking Nginx Status..."
docker exec wms-frontend nginx -t 2>&1

echo -e "\n5️⃣ Checking Database Connection..."
docker exec wms-database mysql -uroot -prootpassword123 -e "SELECT 1 as status;" 2>&1

echo -e "\n6️⃣ Disk Space..."
df -h

echo -e "\n7️⃣ Memory Usage..."
free -h

echo -e "\n📝 If Backend is Down, Run:"
echo "   docker-compose restart wms-backend"
echo "   docker logs wms-backend -f"
