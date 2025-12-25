# ==========================================
# MANUAL VPS DEPLOYMENT SCRIPT
# Run this AFTER GitHub Actions builds images
# ==========================================

Write-Host "🚀 Manual VPS Deployment" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

Write-Host "Triggering deployment on VPS..." -ForegroundColor Yellow
plink -batch -pw Qgocargo@123 root@148.230.107.155 "cd '/root/NEW START' && bash vps-webhook-deploy.sh"

Write-Host "`n✅ Deployment triggered!" -ForegroundColor Green
Write-Host "Check status at: https://qgocargo.cloud" -ForegroundColor Cyan
