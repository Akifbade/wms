# QUICK START DESKTOP SHORTCUT CREATOR

Write-Host "Creating desktop shortcuts..." -ForegroundColor Cyan

$desktop = [Environment]::GetFolderPath("Desktop")
$projectPath = "c:\Users\USER\Videos\NEW START"

# Create START shortcut
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$desktop\WMS - START.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$projectPath\scripts\START-EVERYTHING.ps1`""
$Shortcut.WorkingDirectory = $projectPath
$Shortcut.Description = "Start complete WMS system with auto-backup"
$Shortcut.Save()

# Create STOP shortcut
$Shortcut = $WshShell.CreateShortcut("$desktop\WMS - STOP.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$projectPath\scripts\STOP-EVERYTHING.ps1`""
$Shortcut.WorkingDirectory = $projectPath
$Shortcut.Description = "Stop complete WMS system safely"
$Shortcut.Save()

Write-Host ""
Write-Host "Desktop shortcuts created!" -ForegroundColor Green
Write-Host ""
Write-Host "Double-click on desktop:" -ForegroundColor Yellow
Write-Host "  - 'WMS - START' to start everything" -ForegroundColor White
Write-Host "  - 'WMS - STOP' to stop everything" -ForegroundColor White
Write-Host ""
