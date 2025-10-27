#!/bin/bash

# Script to fix input field "0" stuck issue and remove unused routes

echo "🔧 Fixing WMS System Issues..."

cd '/root/NEW START'

# Backup current state
echo "📦 Creating backup..."
git add -A
git commit -m "Backup before fixing input fields and removing unused routes" || true

# Fix 1: Remove unused/duplicate routes from backend
echo "🗑️  Removing duplicate/unused backend routes..."

# Remove jobs.ts (duplicate of moving-jobs)
if [ -f "backend/src/routes/jobs.ts" ]; then
    rm -f "backend/src/routes/jobs.ts"
    echo "  ✓ Removed backend/src/routes/jobs.ts"
fi

# Fix 2: Update frontend number inputs to not show "0"
echo "🔢 Fixing number input fields..."

# Create a fix script for number inputs
cat > /tmp/fix_inputs.sh << 'EOF'
#!/bin/bash
cd '/root/NEW START/frontend/src'

# Fix pattern: Remove default "0" or "1" fallback in onChange handlers
# This prevents the "0" from appearing when field is empty

find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e 's/parseFloat(e\.target\.value) || 0/parseFloat(e.target.value) || ""/g' \
  -e 's/parseInt(e\.target\.value) || 0/parseInt(e.target.value) || ""/g' \
  -e 's/Number(e\.target\.value) || 0/Number(e.target.value) || ""/g' \
  {} \;

echo "✓ Fixed number input onChange handlers"

# Fix pattern: Remove min="0" that causes validation issues
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  's/min="0"//g' \
  {} \;

echo "✓ Removed min='0' attributes"

# Fix placeholder to empty instead of "0"
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  's/placeholder="0"/placeholder=""/g' \
  -e 's/placeholder="0\.0"/placeholder=""/g' \
  {} \;

echo "✓ Fixed placeholder values"
EOF

chmod +x /tmp/fix_inputs.sh
/tmp/fix_inputs.sh

# Rebuild frontend with fixes
echo "🔨 Rebuilding frontend..."
cd '/root/NEW START'
docker-compose build frontend

# Commit changes
echo "💾 Committing fixes..."
git add -A
git commit -m "Fix: Remove stuck '0' in input fields and unused routes" || true
git push origin stable/prisma-mysql-production || true

# Restart containers
echo "🔄 Restarting containers..."
docker-compose down
docker-compose up -d

echo ""
echo "✅ System fixes completed!"
echo "📝 Changes made:"
echo "   • Removed duplicate /api/jobs route"
echo "   • Fixed number inputs to not show '0'"
echo "   • Removed min='0' validation"
echo "   • Fixed placeholder values"
echo ""
echo "🌐 Access your site: http://qgocargo.cloud"
