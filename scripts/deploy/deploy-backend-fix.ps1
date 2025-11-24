# deploy-backend-fix.ps1
$ErrorActionPreference = "Stop"
Write-Host "Preparing Backend Deployment..." -ForegroundColor Cyan

# Clean temp
if (Test-Path "temp-backend") { Remove-Item "temp-backend" -Recurse -Force }
New-Item -ItemType Directory -Path "temp-backend" | Out-Null

# Copy files
Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item -Path "backend\*" -Destination "temp-backend" -Recurse

# Remove excluded
Write-Host "Removing excluded folders..." -ForegroundColor Yellow
Remove-Item "temp-backend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "temp-backend\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "temp-backend\uploads" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "temp-backend\.git" -Recurse -Force -ErrorAction SilentlyContinue

# Zip
Write-Host "Zipping..." -ForegroundColor Yellow
if (Test-Path "backend-deploy.zip") { Remove-Item "backend-deploy.zip" }
Compress-Archive -Path "temp-backend\*" -DestinationPath "backend-deploy.zip" -CompressionLevel Fastest

# Cleanup temp
Remove-Item "temp-backend" -Recurse -Force

# Create remote script
$remoteScriptContent = @'
#!/bin/bash
# Move files to correct location
mv /root/backend-deploy.zip "/root/NEW START/"
cd "/root/NEW START" || exit

echo "Processing zip..."
# Preserve uploads
if [ -d "backend/uploads" ]; then
    echo "Preserving uploads..."
    mv backend/uploads /tmp/uploads_safe
fi

# Remove old code
rm -rf backend/*

# Unzip
unzip -q backend-deploy.zip -d backend
rm backend-deploy.zip

# Restore uploads
if [ -d "/tmp/uploads_safe" ]; then
    echo "Restoring uploads..."
    mv /tmp/uploads_safe backend/uploads
fi

echo "Rebuilding Docker container..."
docker-compose build --no-cache backend
docker-compose up -d backend
docker image prune -f
'@
# Use ASCII encoding and force LF line endings to avoid BOM/CRLF issues on Linux
$content = $remoteScriptContent -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("$PWD/remote-deploy.sh", $content, [System.Text.Encoding]::ASCII)

# Transfer
Write-Host "Transferring files to VPS..." -ForegroundColor Yellow
scp backend-deploy.zip remote-deploy.sh root@148.230.107.155:/root/

# Execute
Write-Host "Executing remote script..." -ForegroundColor Yellow
ssh root@148.230.107.155 "bash /root/remote-deploy.sh"

# Cleanup local
Remove-Item "remote-deploy.sh"
Remove-Item "backend-deploy.zip"

Write-Host "✅ Backend Deployed Successfully!" -ForegroundColor Green
