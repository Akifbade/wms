# Auto-increment version script
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
    
    Write-Host "Version updated to $newVersion" -ForegroundColor Green
    Write-Host "Updated file: $versionFile" -ForegroundColor Cyan
} else {
    Write-Host "Version pattern not found in $versionFile" -ForegroundColor Red
}
