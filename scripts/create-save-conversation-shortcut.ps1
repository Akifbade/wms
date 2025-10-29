# Create Desktop Shortcut for Save Conversation
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\WMS - Save Conversation.lnk"
$targetPath = "powershell.exe"
$arguments = "-ExecutionPolicy Bypass -NoExit -Command `"cd 'c:\Users\USER\Videos\NEW START'; .\scripts\save-conversation.ps1`""

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = "c:\Users\USER\Videos\NEW START"
$shortcut.Description = "Save AI Conversation Context"
$shortcut.IconLocation = "shell32.dll,13"
$shortcut.Save()

Write-Host "✅ Desktop shortcut created: WMS - Save Conversation" -ForegroundColor Green
