# VPS Deployment Script
# Run this manually or copy commands one by one

# SSH Command (run this first in a new terminal)
# ssh root@72.60.215.188
# Password: Akif@8788881688

# Then run these commands on the VPS:

<#
# 1. Navigate to project
cd /root/warehouse-wms || cd /var/www/warehouse-wms || cd ~/warehouse-wms

# 2. Pull latest changes
git pull origin main

# 3. Backend deployment
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart wms-backend || pm2 restart backend || pm2 restart all

# 4. Frontend deployment
cd ../frontend
npm install
npm run build
pm2 restart wms-frontend || pm2 restart frontend

# 5. Check status
pm2 status
pm2 logs --lines 20

# 6. Test
curl http://localhost:5000/api/health
#>

Write-Host "==================================="
Write-Host "MANUAL VPS DEPLOYMENT STEPS"
Write-Host "==================================="
Write-Host ""
Write-Host "1. Open a new PowerShell terminal"
Write-Host "2. Run: ssh root@72.60.215.188"
Write-Host "3. Enter password: Akif@8788881688"
Write-Host ""
Write-Host "4. On the VPS, run these commands:"
Write-Host ""
Write-Host "   cd /root/warehouse-wms"
Write-Host "   git pull origin main"
Write-Host ""
Write-Host "   cd backend"
Write-Host "   npm install"
Write-Host "   npx prisma generate"
Write-Host "   npx prisma migrate deploy"
Write-Host "   pm2 restart all"
Write-Host ""
Write-Host "   cd ../frontend"
Write-Host "   npm install"
Write-Host "   npm run build"
Write-Host "   pm2 restart all"
Write-Host ""
Write-Host "   pm2 status"
Write-Host ""
Write-Host "==================================="
Write-Host "DONE! Check your application"
Write-Host "==================================="
