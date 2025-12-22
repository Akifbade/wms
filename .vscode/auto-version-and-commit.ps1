# ============================================
# AUTO-VERSION SYNC - UPDATES ALL VERSION FILES
# ============================================
# This script syncs version across:
# - frontend/src/config/version.ts
# - VERSION.md

$versionFile = "frontend/src/config/version.ts"
$versionMd = "VERSION.md"
$content = Get-Content $versionFile -Raw

# Extract current version from version.ts
$pattern = "export\s+const\s+APP_VERSION\s*=\s*['`"]v?(\d+)\.(\d+)\.(\d+)['`"]\s*;"

if ($content -match $pattern) {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3] + 1
    
    $newVersion = "$major.$minor.$patch"
    $newVersionWithV = "v$newVersion"
    $timestamp = Get-Date -Format "MMM dd, yyyy 'at' HH:mm:ss"
    
    # 1. UPDATE frontend/src/config/version.ts
    $content = $content -replace "export const APP_VERSION = '[^']+';", "export const APP_VERSION = '$newVersionWithV';"
    $content = $content -replace "version: '[^']+',", "version: '$newVersionWithV',"
    Set-Content $versionFile $content
    
    # 2. UPDATE VERSION.md
    if (Test-Path $versionMd) {
        $mdContent = Get-Content $versionMd -Raw
        $mdContent = $mdContent -replace 'Current Version:\s*\*\*v\d+\.\d+\.\d+\*\*', "Current Version: **$newVersionWithV**"
        $mdContent = $mdContent -replace '\*\*Released\*\*:\s*[^\r\n]+', "**Released**: $timestamp"
        Set-Content $versionMd $mdContent
    }
    
    Write-Host "" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " VERSION SYNCED: $newVersionWithV" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " - frontend/src/config/version.ts" -ForegroundColor White
    Write-Host " - VERSION.md" -ForegroundColor White
    Write-Host ""
    
    # Git commit
    try {
        git add $versionFile $versionMd
        git commit -m "Version $newVersionWithV" -q
        Write-Host " Git commit successful" -ForegroundColor Green
    } catch {
        Write-Host " Git commit skipped" -ForegroundColor Yellow
    }
} else {
    Write-Host " Version pattern not found in $versionFile" -ForegroundColor Red
}
