#!/bin/bash

# SAFE FEATURE DEVELOPMENT SCRIPT
# Use this before adding any new feature

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🛡️  SAFE DEVELOPMENT MODE"
echo "================================"

# 1. Create backup tag
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup tag: $BACKUP_TAG"
git tag -a "$BACKUP_TAG" -m "Backup before new feature"

# 2. Show current status
echo ""
echo "✅ Backup created! You can restore anytime with:"
echo "   git reset --hard $BACKUP_TAG"
echo ""

# 3. Create feature branch (optional)
read -p "Create feature branch? (y/n): " create_branch
if [ "$create_branch" = "y" ]; then
    read -p "Feature name: " feature_name
    git checkout -b "feature/$feature_name"
    echo "✅ Branch created: feature/$feature_name"
fi

echo ""
echo "🚀 Ready for development!"
echo ""
echo "📌 Remember:"
echo "   - Docker changes are temporary"
echo "   - Always commit before container restart"
echo "   - To restore: git reset --hard $BACKUP_TAG"
echo ""
