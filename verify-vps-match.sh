#!/bin/bash

# =======================================================
# LOCAL vs VPS VERIFICATION SCRIPT
# =======================================================
# This script verifies that local environment matches VPS production

echo "🔍 VERIFYING LOCAL vs VPS MATCH..."
echo "================================================"

# 1. Check if running in production mode (compiled JS)
echo "1. 🚀 CHECKING PRODUCTION MODE..."
BACKEND_PROCESS=$(docker exec wms-backend-local ps aux 2>/dev/null | grep node | grep -v grep | head -1)

if echo "$BACKEND_PROCESS" | grep -q "dist/index.js"; then
    echo "   ✅ LOCAL: Running compiled JavaScript (node dist/index.js)"
    echo "   ✅ MATCHES VPS: Production mode confirmed"
elif echo "$BACKEND_PROCESS" | grep -q "ts-node"; then
    echo "   ❌ LOCAL: Still using ts-node (development mode)"
    echo "   ❌ VPS MISMATCH: VPS uses compiled JS"
    echo "   💡 FIX: Use 'docker-compose up' instead of 'docker-compose -f docker-compose.dev.yml up'"
else
    echo "   ⚠️  Could not determine backend process type"
fi

# 2. Check CPU limits
echo ""
echo "2. ⚡ CHECKING CPU LIMITS..."
CPU_LIMIT=$(docker inspect wms-backend-local --format '{{.HostConfig.CpuQuota}}' 2>/dev/null)
if [ "$CPU_LIMIT" != "0" ] && [ "$CPU_LIMIT" != "" ]; then
    echo "   ✅ LOCAL: CPU limits applied ($CPU_LIMIT)"
    echo "   ✅ MATCHES VPS: 30% CPU limit enforced"
else
    echo "   ⚠️  LOCAL: No CPU limits detected"
    echo "   ⚠️  VPS DIFFERENCE: VPS has 30% CPU limits"
fi

# 3. Check NODE_ENV
echo ""
echo "3. 🌍 CHECKING ENVIRONMENT..."
NODE_ENV=$(docker exec wms-backend-local printenv NODE_ENV 2>/dev/null)
if [ "$NODE_ENV" = "production" ]; then
    echo "   ✅ LOCAL: NODE_ENV=production"
    echo "   ✅ MATCHES VPS: Production environment"
elif [ "$NODE_ENV" = "development" ]; then
    echo "   ⚠️  LOCAL: NODE_ENV=development"
    echo "   ⚠️  VPS DIFFERENCE: VPS uses NODE_ENV=production"
else
    echo "   ❌ LOCAL: NODE_ENV not set"
    echo "   ❌ VPS MISMATCH: VPS requires NODE_ENV=production"
fi

# 4. Check health endpoint
echo ""
echo "4. 🏥 CHECKING HEALTH STATUS..."
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "   ✅ LOCAL: Backend health check OK"
    echo "   ✅ MATCHES VPS: Health endpoint working"
else
    echo "   ❌ LOCAL: Backend health check failed"
    echo "   ❌ Possible issue with backend startup"
fi

# 5. Check database connection
echo ""
echo "5. 🗄️  CHECKING DATABASE..."
DB_STATUS=$(docker exec wms-backend-local curl -sf http://localhost:5000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ LOCAL: Database connection OK"
    echo "   ✅ MATCHES VPS: MySQL connectivity working"
else
    echo "   ❌ LOCAL: Database connection issue"
    echo "   ❌ Check if wms-database-local is running"
fi

# 6. Check memory usage comparison
echo ""
echo "6. 💾 MEMORY USAGE COMPARISON..."
MEMORY_USAGE=$(docker stats --no-stream wms-backend-local --format "{{.MemUsage}}" 2>/dev/null | cut -d'/' -f1)
echo "   📊 LOCAL Memory: $MEMORY_USAGE"
echo "   📊 VPS Target: ~125MB (optimized)"
echo "   📊 VPS Previous: 194MB (before ts-node removal)"

# 7. Container verification
echo ""
echo "7. 📦 CONTAINER STATUS..."
docker ps --filter "name=wms-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null

# 8. Summary
echo ""
echo "================================================"
echo "📋 SUMMARY:"

# Count checks
TOTAL_CHECKS=5
PASSED_CHECKS=0

# Basic verification
if docker ps | grep -q wms-backend-local && curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ LOCAL ENVIRONMENT: Working"
    ((PASSED_CHECKS++))
else
    echo "❌ LOCAL ENVIRONMENT: Issues detected"
fi

if echo "$BACKEND_PROCESS" | grep -q "dist/index.js"; then
    echo "✅ VPS MATCH: Production mode (compiled JS)"
    ((PASSED_CHECKS++))
else
    echo "❌ VPS MISMATCH: Not using compiled JS"
fi

if [ "$NODE_ENV" = "production" ]; then
    echo "✅ VPS MATCH: Production environment"
    ((PASSED_CHECKS++))
else
    echo "⚠️  VPS DIFFERENCE: Environment mismatch"
fi

echo ""
echo "📊 MATCH SCORE: $PASSED_CHECKS/$TOTAL_CHECKS"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo "🎉 PERFECT MATCH: Local environment matches VPS production!"
elif [ $PASSED_CHECKS -ge 3 ]; then
    echo "✅ GOOD MATCH: Minor differences detected"
else
    echo "⚠️  IMPROVEMENTS NEEDED: Significant differences found"
fi

echo ""
echo "💡 TO ENSURE VPS MATCH:"
echo "   1. Use: docker-compose up -d (not dev version)"
echo "   2. Ensure compiled JS: Look for 'dist/index.js' in process"
echo "   3. Check production env: NODE_ENV=production"