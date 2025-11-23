# Auto-increment version and commit to git
# This script runs automatically on every rebuild

$versionFile = "frontend/src/config/version.ts"
$content = Get-Content $versionFile -Raw

if ($content -match "APP_VERSION = 'v(\d+)\.(\d+)\.(\d+)") {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3] + 1
    
    $newVersion = "v$major.$minor.$patch"
    
    # Update version in file
    $content = $content -replace "APP_VERSION = 'v\d+\.\d+\.\d+[^']*'", "APP_VERSION = '$newVersion'"
    $content = $content -replace "version: 'v\d+\.\d+\.\d+[^']*'", "version: '$newVersion'"
    
    Set-Content $versionFile $content
    
    Write-Host "" -ForegroundColor Green
    Write-Host " Version auto-incremented to $newVersion" -ForegroundColor Green
    Write-Host " Auto-committing to git..." -ForegroundColor Cyan
    
    # Git commit
    try {
        git add $versionFile
        git commit -m " Auto-increment version to $newVersion (rebuild safety)" -q
        Write-Host " Git commit successful" -ForegroundColor Green
        Write-Host "" -ForegroundColor Green
    } catch {
        Write-Host " Git commit skipped (no changes or error)" -ForegroundColor Yellow
    }
} else {
    Write-Host " Version pattern not found in $versionFile" -ForegroundColor Red
}
