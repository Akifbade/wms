# WMS Complete System Backup Script
# Called by backend API to create full backup

param(
    [string]$BackupDir = "C:\WMS_FULL_BACKUPS"
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "WMS_FULL_SYSTEM_$timestamp"
$backupPath = Join-Path $BackupDir $backupName
$projectRoot = Split-Path -Parent $PSScriptRoot

# Create directories
New-Item -ItemType Directory -Path "$backupPath\database" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupPath\backend" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupPath\frontend" -Force | Out-Null

# 1. Backup database
docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction --routines --triggers warehouse_wms 2>$null > "$backupPath\database\database.sql"

# 2. Backup backend source (exclude node_modules, dist, uploads)
Get-ChildItem "$projectRoot\backend" -Exclude @('node_modules','dist','uploads') | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$backupPath\backend\" -Recurse -Force
}

# 3. Backup backend uploads separately
if (Test-Path "$projectRoot\backend\uploads") {
    Copy-Item -Path "$projectRoot\backend\uploads" -Destination "$backupPath\backend\uploads" -Recurse -Force
}

# 4. Backup frontend source (exclude node_modules, dist)
Get-ChildItem "$projectRoot\frontend" -Exclude @('node_modules','dist') | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$backupPath\frontend\" -Recurse -Force
}

# 5. Backup Docker configs
Copy-Item -Path "$projectRoot\docker-compose.yml" -Destination $backupPath -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$projectRoot\docker-compose.override.yml" -Destination $backupPath -Force -ErrorAction SilentlyContinue

# 6. Backup environment files
Copy-Item -Path "$projectRoot\.env" -Destination $backupPath -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$projectRoot\.env.example" -Destination $backupPath -Force -ErrorAction SilentlyContinue

# 7. Create restore instructions
$readme = @"
# WMS COMPLETE SYSTEM BACKUP
Backup Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Backup Name: $backupName

## QUICK RESTORE:
1. Extract this folder to desired location (e.g., C:\WMS)
2. Run: docker-compose up -d --build
3. Wait 30 seconds
4. Import database: Get-Content database\database.sql | docker exec -i wms-database mysql -u wms_user -pwmspassword123 warehouse_wms
5. System is running at http://localhost

## INCLUDES:
- Complete backend source code
- Complete frontend source code
- Full database with all data
- All uploads and user files
- Docker configurations
- Environment files
"@

Set-Content -Path "$backupPath\README.txt" -Value $readme -Force

# 8. Compress to ZIP
Compress-Archive -Path "$backupPath\*" -DestinationPath "$backupPath.zip" -CompressionLevel Optimal -Force
Remove-Item -Path $backupPath -Recurse -Force

# 9. Cleanup old backups (keep only 7)
$allBackups = Get-ChildItem $BackupDir -Filter "WMS_FULL_SYSTEM_*.zip" | Sort-Object LastWriteTime -Descending
if ($allBackups.Count -gt 7) {
    $allBackups | Select-Object -Skip 7 | Remove-Item -Force
}

# Output JSON result
$zipFile = Get-Item "$backupPath.zip"
$result = @{
    success = $true
    name = $zipFile.Name
    path = $zipFile.FullName
    size = $zipFile.Length
    createdAt = $zipFile.CreationTime.ToString('o')
}

Write-Output ($result | ConvertTo-Json -Compress)
