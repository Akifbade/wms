#!/bin/bash
# 
# Auto-Update Version Number Script
# Runs during GitHub Actions deployment
# Updates VERSION.md and version config files
#

set -e

echo "🚀 Starting Version Update Process..."

# Get current version from VERSION.md
CURRENT_VERSION=$(grep "Current Version:" VERSION.md | grep -oP 'v\d+\.\d+\.\d+' || echo "v2.0.0")
echo "📍 Current Version: $CURRENT_VERSION"

# Parse version components
MAJOR=$(echo $CURRENT_VERSION | cut -d'.' -f1 | sed 's/v//')
MINOR=$(echo $CURRENT_VERSION | cut -d'.' -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d'.' -f3)

echo "   Major: $MAJOR, Minor: $MINOR, Patch: $PATCH"

# Determine deployment stage from environment
STAGE="${DEPLOYMENT_STAGE:-staging}"
echo "📍 Deployment Stage: $STAGE"

# Auto-increment version based on stage
if [ "$STAGE" = "production" ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
  echo "✅ Production Deploy: Incrementing MINOR version → $MAJOR.$MINOR.$PATCH"
else
  PATCH=$((PATCH + 1))
  echo "✅ Staging Deploy: Incrementing PATCH version → $MAJOR.$MINOR.$PATCH"
fi

NEW_VERSION="v$MAJOR.$MINOR.$PATCH"
echo "🎯 New Version: $NEW_VERSION"

# Get current date and time
DEPLOY_DATE=$(date '+%b %d, %Y')
DEPLOY_TIME=$(date '+%H:%M:%S')
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local-dev")

echo "📅 Deploy Date: $DEPLOY_DATE"
echo "🔗 Commit: $COMMIT_HASH"

# Update VERSION.md
echo "📝 Updating VERSION.md..."
sed -i "s/## Current Version:.*$/## Current Version: **$NEW_VERSION**/g" VERSION.md

# Update frontend version config
echo "📝 Updating frontend/src/config/version.ts..."
cat > frontend/src/config/version.ts << 'EOF'
/**
 * Version Configuration - Auto-updated by GitHub Actions
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export const APP_VERSION = 'NEW_VERSION_HERE';

export const VERSION_INFO = {
  version: 'NEW_VERSION_HERE',
  environment: process.env.REACT_APP_ENV || 'development',
  buildDate: new Date().toISOString(),
  commitHash: 'COMMIT_HASH_HERE',
  stage: 'STAGE_HERE', // local, staging, or production
};

export const DEPLOYMENT_TIMELINE = {
  local: '2025-11-01',
  staging: '2025-11-01',
  production: '2025-10-31',
};

// Auto-update log
console.log(`%c🚀 WMS Version: ${APP_VERSION}`, 'color: green; font-weight: bold; font-size: 14px');
console.log(`%cEnvironment: ${VERSION_INFO.environment}`, 'color: blue');
console.log(`%cCommit: ${VERSION_INFO.commitHash}`, 'color: gray');
EOF

# Replace placeholders
sed -i "s/NEW_VERSION_HERE/$NEW_VERSION/g" frontend/src/config/version.ts
sed -i "s/COMMIT_HASH_HERE/$COMMIT_HASH/g" frontend/src/config/version.ts
sed -i "s/STAGE_HERE/$STAGE/g" frontend/src/config/version.ts

# Update backend version config
echo "📝 Updating backend/src/config/version.ts..."
cat > backend/src/config/version.ts << 'EOF'
/**
 * Version Configuration for Backend
 * Auto-updated by GitHub Actions
 */

export const APP_VERSION = 'NEW_VERSION_HERE';

export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
    stage: 'STAGE_HERE', // local, staging, production
    buildDate: new Date().toISOString(),
    commitHash: 'COMMIT_HASH_HERE',
    timestamp: Date.now(),
  };
};

export const logVersionInfo = () => {
  const info = getVersionInfo();
  console.log(`
╔════════════════════════════════════════╗
║  🚀 WMS Backend Version: ${info.version}        ║
║  Stage: ${info.stage.toUpperCase()}                     ║
║  Environment: ${(info.environment || '?').toUpperCase()}             ║
║  Build Date: ${new Date(info.buildDate).toLocaleDateString()}      ║
╚════════════════════════════════════════╝
  `);
};
EOF

# Replace placeholders
sed -i "s/NEW_VERSION_HERE/$NEW_VERSION/g" backend/src/config/version.ts
sed -i "s/COMMIT_HASH_HERE/$COMMIT_HASH/g" backend/src/config/version.ts
sed -i "s/STAGE_HERE/$STAGE/g" backend/src/config/version.ts

# Add version meta tag to frontend index.html
echo "📝 Updating frontend/index.html..."
if grep -q '<meta name="app-version"' frontend/index.html; then
  sed -i "s/<meta name=\"app-version\" content=\"[^\"]*\"/<meta name=\"app-version\" content=\"$NEW_VERSION\"/g" frontend/index.html
else
  sed -i "/<head>/a\\    <meta name=\"app-version\" content=\"$NEW_VERSION\">" frontend/index.html
fi

echo ""
echo "✅ Version Update Complete!"
echo ""
echo "📊 Updated Files:"
echo "   ✓ VERSION.md"
echo "   ✓ frontend/src/config/version.ts"
echo "   ✓ backend/src/config/version.ts"
echo "   ✓ frontend/index.html"
echo ""
echo "📍 Version: $NEW_VERSION"
echo "📍 Stage: $STAGE"
echo "📍 Commit: $COMMIT_HASH"
echo ""
