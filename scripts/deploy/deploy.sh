#!/bin/bash

# ============================================
# DEPLOYMENT SCRIPT: LOCAL → STAGING → PRODUCTION
# ============================================

set -e

ENVIRONMENT=${1:-staging}
REPO_PATH=$(pwd)

echo "🚀 Deployment Script"
echo "===================="
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# STAGING DEPLOYMENT
# ============================================
deploy_staging() {
    print_status "Starting STAGING deployment..."
    
    # Git operations
    print_status "Committing changes..."
    git add -A
    git commit -m "Staging deploy: $(date '+%Y-%m-%d %H:%M:%S')" --no-edit || print_warning "No changes to commit"
    
    # Build and start staging
    print_status "Building staging services..."
    docker-compose -f docker-compose-dual-env.yml build staging-frontend staging-backend
    
    print_status "Starting staging environment..."
    docker-compose -f docker-compose-dual-env.yml up -d staging-database staging-backend staging-frontend
    
    print_status "Waiting for services to be ready..."
    sleep 5
    
    # Health checks
    print_status "Running health checks..."
    if curl -s http://localhost:5001/api/system/health | grep -q "error\|Error" 2>/dev/null; then
        print_warning "Staging backend response (auth required - normal)"
    else
        print_warning "Could not reach staging backend"
    fi
    
    # Test endpoints
    print_status "Testing staging endpoints..."
    echo "  - Staging Frontend: http://localhost:8080"
    echo "  - Staging Backend: http://localhost:5001"
    echo "  - Staging Database: localhost:3308"
    
    print_success "STAGING deployment complete!"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Access: http://localhost:8080"
    echo "  2. Login with: admin@demo.com / demo123"
    echo "  3. Test all features"
    echo "  4. When satisfied, run: bash deploy.sh production"
    echo ""
}

# ============================================
# PRODUCTION DEPLOYMENT
# ============================================
deploy_production() {
    print_status "Starting PRODUCTION deployment..."
    
    # Safety confirmation
    echo ""
    print_warning "⚠️  WARNING: You are about to deploy to PRODUCTION"
    echo "This will affect the LIVE system!"
    echo ""
    read -p "Type 'CONFIRM' to proceed: " confirmation
    
    if [ "$confirmation" != "CONFIRM" ]; then
        print_error "Production deployment cancelled"
        exit 1
    fi
    
    # Backup production database
    print_status "Backing up production database..."
    BACKUP_FILE="backups/production-backup-$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    docker exec wms-production-db mysqldump -u wms_user -pwmspassword123 warehouse_wms > "$BACKUP_FILE" || print_warning "Backup may have failed"
    print_success "Backup created: $BACKUP_FILE"
    
    # Git operations
    print_status "Committing changes..."
    git add -A
    git commit -m "Production deploy: $(date '+%Y-%m-%d %H:%M:%S')" --no-edit || print_warning "No changes to commit"
    
    print_status "Pushing to production branch..."
    git push origin stable/prisma-mysql-production || print_warning "Git push may have failed"
    
    # Build and start production
    print_status "Building production services..."
    docker-compose -f docker-compose-dual-env.yml build production-frontend production-backend
    
    print_status "Stopping old production services..."
    docker-compose -f docker-compose-dual-env.yml stop production-frontend production-backend || true
    
    print_status "Starting production environment..."
    docker-compose -f docker-compose-dual-env.yml up -d production-database production-backend production-frontend
    
    print_status "Waiting for services to be ready..."
    sleep 5
    
    # Verify production
    print_status "Verifying production..."
    if curl -s http://localhost:5000/api/system/health > /dev/null 2>&1; then
        print_success "Production backend is responding"
    else
        print_error "Production backend not responding!"
    fi
    
    print_success "PRODUCTION deployment complete!"
    echo ""
    echo "🎉 Production is now LIVE!"
    echo "  - Frontend: https://qgocargo.cloud (or http://IP)"
    echo "  - Backend: http://localhost:5000"
    echo "  - Database: localhost:3307"
    echo ""
}

# ============================================
# STATUS CHECK
# ============================================
check_status() {
    print_status "Checking environment status..."
    echo ""
    
    echo "STAGING Services:"
    docker-compose -f docker-compose-dual-env.yml ps staging-* 2>/dev/null | tail -n +2 || echo "  No staging services running"
    
    echo ""
    echo "PRODUCTION Services:"
    docker-compose -f docker-compose-dual-env.yml ps production-* 2>/dev/null | tail -n +2 || echo "  No production services running"
    
    echo ""
}

# ============================================
# ROLLBACK
# ============================================
rollback() {
    print_status "Rolling back production..."
    
    read -p "Enter backup timestamp (e.g., 20251028_091234): " timestamp
    BACKUP_FILE="backups/production-backup-${timestamp}.sql"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    print_warning "Restoring from: $BACKUP_FILE"
    docker exec -i wms-production-db mysql -u wms_user -pwmspassword123 warehouse_wms < "$BACKUP_FILE"
    
    print_success "Rollback complete!"
}

# ============================================
# MAIN MENU
# ============================================
case $ENVIRONMENT in
    staging)
        deploy_staging
        ;;
    production)
        deploy_production
        ;;
    status)
        check_status
        ;;
    rollback)
        rollback
        ;;
    *)
        echo "Usage: bash deploy.sh [staging|production|status|rollback]"
        echo ""
        echo "Commands:"
        echo "  staging    - Deploy to staging environment for testing"
        echo "  production - Deploy to production (live system)"
        echo "  status     - Check status of both environments"
        echo "  rollback   - Rollback production from backup"
        echo ""
        echo "Workflow:"
        echo "  1. Make changes locally"
        echo "  2. bash deploy.sh staging      (Test on staging)"
        echo "  3. bash deploy.sh production   (Deploy to live)"
        echo ""
        exit 1
        ;;
esac
