# 🧹 SAFE PROJECT CLEANUP SCRIPT
# Removes unnecessary files while keeping system safe

Write-Host "🧹 Starting Safe Cleanup..." -ForegroundColor Cyan
Write-Host ""

$totalDeleted = 0
$errors = @()

# Function to safely delete and report
function Safe-Delete {
    param($path, $description)
    if (Test-Path $path) {
        try {
            $size = (Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
            Remove-Item $path -Recurse -Force -ErrorAction Stop
            $script:totalDeleted += $size
            Write-Host "✅ Deleted: $description ($([math]::Round($size,2)) MB)" -ForegroundColor Green
        } catch {
            $script:errors += "$description - Error: $_"
            Write-Host "❌ Failed: $description" -ForegroundColor Red
        }
    } else {
        Write-Host "⏭️  Skipped: $description (not found)" -ForegroundColor Yellow
    }
}

Write-Host "📦 STEP 1: Removing Backup Folders (HUGE!)" -ForegroundColor Cyan
Write-Host "   These are old backups - current code is in frontend/ and backend/" -ForegroundColor Gray
Safe-Delete "BACKUP-PRISMA-MYSQL" "Old Prisma MySQL backup 604MB"
Safe-Delete "backend_local_backup_20251029203556" "Old backend backup 281MB"
Safe-Delete "frontend_local_backup_20251029203643" "Old frontend backup 253MB"
Write-Host ""

Write-Host "📦 STEP 2: Removing Database Backup Files" -ForegroundColor Cyan
Safe-Delete "database-backups" "Old database backups folder"
Safe-Delete "staging-backups" "Staging backups folder"
Safe-Delete "backups" "Backups folder (keeping latest only)"
Write-Host ""

Write-Host "📦 STEP 3: Removing AI Conversation Backups" -ForegroundColor Cyan
Safe-Delete "ai-conversation-backups" "AI conversation history"
Write-Host ""

Write-Host "📦 STEP 4: Cleaning Documentation (Keeping Important Ones)" -ForegroundColor Cyan
Write-Host "   Keeping: README.md, VERSION.md, ALL-FIXES-COMPLETE-NOV1.md" -ForegroundColor Gray

# List of MD files to DELETE (redundant/outdated documentation)
$docsToDelete = @(
    "SYSTEM-ARCHITECTURE-DIAGRAMS.md",
    "MATERIAL-TRACKING-CODE-PATTERNS.md",
    "INTEGRATION_PLAN.md",
    "PROFESSIONAL-RELEASE-NOTES-PLAN.md",
    "MATERIAL-TRACKING-VISUAL-GUIDE.md",
    "VISUAL_ARCHITECTURE_GUIDE.md",
    "MATERIAL-TRACKING-DEEP-ANALYSIS.md",
    "MATERIAL-TRACKING-WITH-RACKS.md",
    "FILE-MANAGEMENT-VISUAL-GUIDE.md",
    "WAREHOUSE-ENHANCEMENT-COMPLETE.md",
    "PROJECT-DEEP-ANALYSIS-AND-REBUILD-PLAN.md",
    "TEMPLATE-CONFIGURATION-SYSTEM.md",
    "HOW-BIG-COMPANIES-DEPLOY.md",
    "WHATS-NEXT-GUIDE.md",
    "SYSTEM-DASHBOARD.md",
    "MOVING-JOBS-V2-START-HERE.md",
    "HOW-TO-ACCESS-ALL-3-ENVIRONMENTS.md",
    "VPS-VISUAL-ANALYSIS.md",
    "DEPLOYMENT_COMPLETE.md",
    "MOVING-JOBS-V2-DOCUMENTATION.md",
    "MOVING-JOBS-V2-IMPLEMENTATION-CHECKLIST.md",
    "SETTINGS-CONFIGURATION-TEST-REPORT.md",
    "STAGING-PRODUCTION-DETAILED.md",
    "ULTIMATE-AUTOMATIC-BACKUP-SYSTEM.md",
    "SETTINGS_INTEGRATION_GUIDE.md",
    "DEPLOYMENT-COMPLETE-FINAL-SUMMARY.md",
    "RACK-CATEGORY-CODE-CHANGES.md",
    "RBAC-IMPLEMENTATION-PLAN.md",
    "PAYMENT-BEFORE-RELEASE.md",
    "PRODUCTION-STAGING-DEPLOYMENT-GUIDE.md",
    "FINAL-PRODUCTION-READY-REPORT.md",
    "TESTING-PAYMENT-SYSTEM.md",
    "USER-MANAGEMENT-CONSOLIDATION-COMPLETE.md",
    "README-MATERIAL-TRACKING.md",
    "CI-CD-DOCUMENTATION-INDEX.md",
    "CI-CD-FINAL-SUMMARY.md",
    "MATERIAL-SYSTEM-COMPLETE-FINAL.md",
    "SYSTEM-ERROR-REPORT.md",
    "DRIVER-APP-USER-GUIDE.md",
    "INVENTORY-SYSTEM-ARCHITECTURE.md",
    "DELIVERY-MANIFEST.md",
    "MATERIAL-TRACKING-START-HERE.md",
    "PRODUCTION-TROUBLESHOOTING.md",
    "RACK-CATEGORY-SYSTEM-GUIDE.md",
    "HOW-TO-ACCESS-SYSTEMS.md",
    "FINAL_REPORT.md",
    "FILE-MANAGEMENT-SYSTEM-COMPLETE.md",
    "CI-CD-DELIVERY-COMPLETE.md",
    "REAL-API-TEST-REPORT.md",
    "INTAKE-FORM-CUSTOMIZATION.md",
    "WAREHOUSE-IMPROVEMENTS-PLAN.md",
    "QUICK_SUMMARY.md",
    "PROJECT_INDEX.md",
    "PARTIAL-RELEASE-WORKFLOW-TEST.md",
    "MATERIAL-STOCK-COMPLETE-GUIDE.md",
    "STAGING-ASSESSMENT-CHECKLIST.md",
    "STAGING-CLONE-COMPLETE-FINAL.md",
    "DRIVER-APP-URDU-GUIDE.md",
    "REBUILD-COMPLETE-SUMMARY.md",
    "SSL-HTTPS-SETUP-GUIDE.md",
    "MASTER-INDEX.md",
    "MATERIAL-CATEGORY-SYSTEM-COMPLETE.md",
    "SHIPMENT-RELEASE-DELETE-GUIDE.md",
    "FRONTEND-STAGING-DEPLOYMENT-COMPLETE.md",
    "SESSION-COMPLETE-SUMMARY.md",
    "GITHUB-ACTIONS-DEBUG.md",
    "DEPLOYMENT-COMPANY-PROFILES-LIVE.md",
    "PARSE-MIGRATION-EXECUTIVE-SUMMARY.md",
    "GUARANTEE-AUTOMATIC-BACKUP.md",
    "DEPLOYMENT-LAUNCH-GUIDE.md",
    "VPS-CLEANUP-COMMANDS.md",
    "START-HERE-NOW.md",
    "FORM-SECTION-REORDERING.md",
    "MOVING-JOBS-v3-IMPLEMENTATION.md",
    "PARSE-MIGRATION-COMPLETE.md",
    "SCANNER-COMPLETE-GUIDE.md",
    "READY-FOR-USER-TESTING.md",
    "MOVING-JOBS-IMPLEMENTATION-GUIDE.md",
    "MOVING-JOBS-VERIFICATION-CHECKLIST.md",
    "STAGING-PRODUCTION-GUIDE.md",
    "DOCUMENTATION-INDEX.md",
    "STAGING-SAFETY-GUIDE.md",
    "SESSION-COMPLETE-READY-FOR-VPS.md",
    "FRONTEND-INTEGRATION-GUIDE.md",
    "RACK-CATEGORY-VISUAL-GUIDE.md",
    "PORT-CONFIGURATION-UPDATE.md",
    "DEPLOYMENT-GUIDE.md",
    "EVERYTHING-DONE.md",
    "00-READ-CI-CD-FIRST.md",
    "DOCKER-COMPLETE-SETUP-SUMMARY.md",
    "STARTUP-CHECKLIST.md",
    "REPRINT-RELEASE-NOTE-FEATURE.md",
    "3-STAGE-WORKFLOW-GUIDE.md",
    "QUICK_START.md",
    "VPS-RESOURCE-ANALYSIS-REPORT.md",
    "FRONTEND-ROUTES-GUIDE.md",
    "SERVER-RUNNING-SUCCESS.md",
    "STAGING-DEPLOYMENT-COMPLETE.md",
    "FINAL-SETUP-COMPLETE.md",
    "RACK-CATEGORY-DEPLOYMENT-GUIDE.md",
    "RBAC-INTEGRATION-GUIDE.md",
    "FRONTEND-INTEGRATION-TEST.md",
    "READY-FOR-VPS-DEPLOYMENT.md",
    "SYSTEM-INTEGRATION-AUDIT-REPORT.md",
    "FINAL-DEPLOYMENT-SUMMARY.md",
    "GO.md",
    "LOCAL-BACKUP-SETUP-GUIDE.md",
    "VPS-FIX-GUIDE.md",
    "test-all-features.md",
    "SETUP-GUIDE.md",
    "RBAC-COMPLETE-IMPLEMENTATION.md",
    "LIVE-TRACKING-TROUBLESHOOTING.md",
    "GIT-GUI-GUIDE.md",
    "STAGING-IS-LOCAL-MACHINE.md",
    "GITHUB-SETUP-CHECKLIST.md",
    "MATERIAL-TRACKING-GUIDE.md",
    "SHIPMENT-SETTINGS-INTEGRATION.md",
    "PRISMA-ROUTES-INVENTORY.md",
    "VITE-MATERIAL-UI-FIX-COMPLETE.md",
    "SIMPLE-START.md",
    "GITHUB-UPLOAD-GUIDE.md",
    "READY-NOW-STATUS.md",
    "NEW-UI-FEATURES.md",
    "HOW-TO-VERIFY-AI-MEMORY.md",
    "UPLOADS-SYSTEM-GUIDE.md",
    "QR-SCANNER-FIXES-COMPLETE.md",
    "EXECUTIVE-SUMMARY.md",
    "RELEASE-TESTING-GUIDE.md",
    "THREE-STAGE-DEPLOYMENT-GUIDE.md",
    "QUICK-DEPLOYMENT-REFERENCE.md",
    "STAGING-ENVIRONMENT-COMPLETE.md",
    "VERSION-TRACKING-QUICK-START.md",
    "HOW-TO-WORK-WITH-AI.md",
    "CURRENT-SESSION-HANDOVER.md",
    "THREE-STAGE-DEPLOYMENT-STATUS.md",
    "WORKFLOW-STATUS-REPORT.md",
    "GITHUB-ACTIONS-FIX.md",
    "DEPLOYMENT-SUCCESS.md",
    "PARSE-VS-PRISMA-COMPARISON.md",
    "IMMEDIATE-ACTION-5MIN.md",
    "MATERIAL-FORM-FIX-COMPLETE.md",
    "STAGING-PRODUCTION-READY.md",
    "SSL-DEPLOYMENT-SUCCESS.md",
    "WORKER-SCANNER-GUIDE.md",
    "SCANNER-SIMPLIFIED-NO-MANUAL-ENTRY.md",
    "QUICK-START-GUIDE.md",
    "WHY-DATABASE-BREAKS.md",
    "VPS-DEPLOYMENT-SUCCESS.md",
    "PC-RESTART-KA-ANSWER.md",
    "QUICK-START-WAREHOUSE-ENHANCEMENT.md",
    "HTTPS-DEPLOYMENT-COMPLETE.md",
    "INVENTORY-API-TESTING.md",
    "STAGING-DEPLOYED-STATUS.md",
    "PRODUCTION-DEPLOYMENT-SUCCESS.md",
    "PRODUCTION-FIX-SUMMARY.md",
    "SETUP-COMPLETE-AUTOMATIC-BACKUP.md",
    "STAGING-SETUP-COMPLETE.md",
    "USER-MANAGEMENT-GUIDE.md",
    "WORKER-BOX-ASSIGNMENT-OPTIONS.md",
    "PARSE-TEST-RESULTS.md",
    "NEXT-STEPS.md",
    "PROBLEMS-FIXED-TODAY.md",
    "QUICK-REFERENCE.md",
    "SYSTEM-WORKING-PROOF.md",
    "HOW-TO-SWITCH.md",
    "PARSE-MIGRATION-ROADMAP.md",
    "VPS-ISSUE-QUICK-REFERENCE.md",
    "NETWORK-ACCESS-GUIDE.md",
    "READ-THIS-FIRST.md",
    "HAMESHA-SETUP-KA-ANSWER.md",
    "SSL-SETUP-GUIDE.md",
    "MONGODB-COMPASS-GUIDE.md",
    "NEW-CHAT-TEMPLATE.md",
    "URGENT-FIXES-COMPLETE.md",
    "UPLOAD-FIX-COMPLETE.md",
    "LOCAL-BACKUP-READY.md",
    "FRONTEND-LOGIN-DEBUG.md",
    "VERSION-UPDATE-INSTRUCTIONS.md",
    "FINAL-SETUP-STATUS.md",
    "FIX-403-ERROR.md",
    "STAGING-URDU-GUIDE.md",
    "LOGIN-READY-FINAL.md",
    "PRODUCTION-LAUNCH-ANALYSIS.md",
    "FIX-TOKEN-ISSUE.md",
    "LOGO-TROUBLESHOOTING.md",
    "DEBUG-TOKEN.md",
    "PARSE-DASHBOARD-ALTERNATIVE.md",
    "QUICK-DEPLOYMENT-GUIDE.md",
    "LOGIN-CREDENTIALS.md",
    "RESTORATION-COMPLETE.md",
    "SERVERS-RUNNING.md",
    "SSH-KEY-TROUBLESHOOTING.md",
    "URGENT-LOCAL-FIXES.md",
    "GITHUB-SECRETS-SETUP.md",
    "WORKFLOW-LOCAL-STAGING-PRODUCTION.md",
    "MATERIAL-QUICK-START.md",
    "RACK-CATEGORY-QUICK-FIX.md",
    "HOW-TO-ACCESS-WMS.md",
    "FRESH-SSH-KEY-UPDATE-NOW.md",
    "UPDATE-GITHUB-SECRETS-NOW.md",
    "VALID-TOKEN.md",
    "FINAL-SSH-KEY-CLEANED.md",
    "JUST-RUN-THIS.md"
)

foreach ($doc in $docsToDelete) {
    if (Test-Path $doc) {
        Remove-Item $doc -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Deleted: $doc" -ForegroundColor DarkGreen
    }
}

Write-Host ""
Write-Host "📦 STEP 5: Cleaning Test and Temporary Files" -ForegroundColor Cyan
Safe-Delete "tmp_deploy_key" "Temporary SSH key file"
Safe-Delete "test-login.html" "Test login page"
Safe-Delete "wh (4).html" "Test HTML files"

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Space Freed: $([math]::Round($totalDeleted,2)) MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ KEPT (SAFE & IMPORTANT):" -ForegroundColor Green
Write-Host "   - frontend/ (active code)" -ForegroundColor White
Write-Host "   - backend/ (active code)" -ForegroundColor White
Write-Host "   - node_modules/ (dependencies)" -ForegroundColor White
Write-Host "   - .github/ (CI/CD workflows)" -ForegroundColor White
Write-Host "   - scripts/ (automation)" -ForegroundColor White
Write-Host "   - README.md (main documentation)" -ForegroundColor White
Write-Host "   - VERSION.md (version tracking)" -ForegroundColor White
Write-Host "   - ALL-FIXES-COMPLETE-NOV1.md (latest status)" -ForegroundColor White
Write-Host "   - docker-compose files (deployment)" -ForegroundColor White
Write-Host "   - .env files (configuration)" -ForegroundColor White
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "⚠️  ERRORS:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
}

Write-Host "🎯 Your project is now clean and organized!" -ForegroundColor Cyan
Write-Host ""
