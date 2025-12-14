# Auto-increment version and commit to git
# This script runs automatically on every rebuild

$versionFile = "frontend/src/config/version.ts"
$content = Get-Content $versionFile -Raw

$pattern = 'export\s+const\s+APP_VERSION\s*=\s*[\"\''](\d+)\.(\d+)\.(\d+)[\"\'']\s*;'

if ($content -match $pattern) {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3] + 1
    
    $newVersion = "$major.$minor.$patch"
    $newVersionWithV = "v$newVersion"
    
    # Update version in file
    $content = $content -replace 'export\s+const\s+APP_VERSION\s*=\s*[\"\'']\d+\.\d+\.\d+[\"\'']\s*;', "export const APP_VERSION = '$newVersion';"
    $content = $content -replace 'version:\s*[\"\'']v\d+\.\d+\.\d+[\"\'']', "version: '$newVersionWithV'"
    
    Set-Content $versionFile $content
    
    Write-Host "" -ForegroundColor Green
    Write-Host " Version auto-incremented to $newVersionWithV" -ForegroundColor Green
    Write-Host " Auto-committing to git..." -ForegroundColor Cyan
    
    # Git commit
    try {
        git add $versionFile
        git commit -m " Auto-increment version to $newVersionWithV (rebuild safety)" -q
        Write-Host " Git commit successful" -ForegroundColor Green
        Write-Host "" -ForegroundColor Green
    } catch {
        Write-Host " Git commit skipped (no changes or error)" -ForegroundColor Yellow
    }
} else {
    Write-Host " Version pattern not found in $versionFile" -ForegroundColor Red
}
