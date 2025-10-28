# Local Backup Manager for Windows
# Automatically backs up database and project files every 5 minutes
# Purpose: Same protection locally as on VPS!

param(
    [string]$Action = "quick"
)

# Configuration
$BackupDir = "C:\Users\USER\Videos\NEW START\backups"
$DatabaseContainer = "wms-database"
$DatabaseName = "warehouse_wms"
$DatabaseUser = "root"
$DatabasePassword = "Qgocargo@123"
$ProjectRoot = "C:\Users\USER\Videos\NEW START"

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Log function
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path "$BackupDir\backup.log" -Value $logMessage
}

# Quick backup (database only)
function Backup-Quick {
    Write-Log "🔄 Starting quick database backup..."
    
    try {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "$BackupDir\database-$timestamp.sql.gz"
        
        # Export database from Docker container
        $dumpCmd = "docker exec $DatabaseContainer mysqldump -u $DatabaseUser -p$DatabasePassword $DatabaseName 2>/dev/null | gzip > `"$backupFile`""
        
        Invoke-Expression $dumpCmd
        
        if (Test-Path $backupFile) {
            $size = (Get-Item $backupFile).Length / 1MB
            Write-Log "✅ Quick backup created: database-$timestamp.sql.gz ($([Math]::Round($size, 2)) MB)"
            
            # Cleanup old backups (keep last 24 hours = 288 backups of 5 min each)
            $maxAge = (Get-Date).AddHours(-24)
            Get-ChildItem "$BackupDir\database-*.sql.gz" | Where-Object { $_.LastWriteTime -lt $maxAge } | Remove-Item -Force
            
            Write-Log "🧹 Cleaned up backups older than 24 hours"
        }
    }
    catch {
        Write-Log "❌ Quick backup failed: $_"
    }
}

# Full backup (database + project files)
function Backup-Full {
    Write-Log "⭐ Starting full system backup..."
    
    try {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = "$BackupDir\full-system-$timestamp.tar.gz"
        
        # Export database
        $dbDump = "$BackupDir\temp-db-dump-$timestamp.sql"
        $dumpCmd = "docker exec $DatabaseContainer mysqldump -u $DatabaseUser -p$DatabasePassword $DatabaseName > `"$dbDump`""
        Invoke-Expression $dumpCmd
        
        # Create tar.gz with database + important files
        $tempDir = "$BackupDir\temp-full-$timestamp"
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        
        Copy-Item $dbDump "$tempDir\database.sql"
        Copy-Item "$ProjectRoot\docker-compose.yml" "$tempDir\docker-compose.yml" -ErrorAction SilentlyContinue
        Copy-Item "$ProjectRoot\docker-compose.override.yml" "$tempDir\docker-compose.override.yml" -ErrorAction SilentlyContinue
        Copy-Item "$ProjectRoot\.env*" "$tempDir\" -ErrorAction SilentlyContinue
        Copy-Item "$ProjectRoot\backend\src\prisma\schema.prisma" "$tempDir\schema.prisma" -ErrorAction SilentlyContinue
        
        # Create tar.gz (using 7zip if available, else just store files)
        try {
            # Try using 7-Zip if installed
            & '7z' a -ttar -so "$BackupDir\temp-$timestamp.tar" "$tempDir" | & 'gzip' > $backupFile 2>$null
        }
        catch {
            # Fallback: just compress with PowerShell
            Compress-Archive -Path "$tempDir\*" -DestinationPath "$backupFile.zip" -Force
            Write-Log "⚠️ Created as ZIP (7zip not installed)"
        }
        
        # Cleanup
        Remove-Item $dbDump -Force -ErrorAction SilentlyContinue
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$BackupDir\temp-$timestamp.tar" -Force -ErrorAction SilentlyContinue
        
        if (Test-Path $backupFile) {
            $size = (Get-Item $backupFile).Length / 1MB
            Write-Log "✅ Full backup created: full-system-$timestamp.tar.gz ($([Math]::Round($size, 2)) MB)"
            
            # Cleanup old full backups (keep last 7 days)
            $maxAge = (Get-Date).AddDays(-7)
            Get-ChildItem "$BackupDir\full-system-*.tar.gz", "$BackupDir\full-system-*.zip" -ErrorAction SilentlyContinue | 
                Where-Object { $_.LastWriteTime -lt $maxAge } | Remove-Item -Force
            
            Write-Log "🧹 Cleaned up full backups older than 7 days"
        }
    }
    catch {
        Write-Log "❌ Full backup failed: $_"
    }
}

# Restore database
function Restore-Database {
    param([string]$BackupFile)
    
    if (-not (Test-Path $BackupFile)) {
        Write-Log "❌ Backup file not found: $BackupFile"
        return
    }
    
    Write-Log "♻️ Starting database restore from: $BackupFile..."
    
    try {
        if ($BackupFile -like "*.gz") {
            $tempFile = "$BackupDir\temp-restore.sql"
            & 'gzip' -dc $BackupFile > $tempFile
            $restoreFile = $tempFile
        }
        else {
            $restoreFile = $BackupFile
        }
        
        $restoreCmd = "docker exec -i $DatabaseContainer mysql -u $DatabaseUser -p$DatabasePassword $DatabaseName < `"$restoreFile`""
        Invoke-Expression $restoreCmd
        
        Write-Log "✅ Database restored successfully!"
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "❌ Restore failed: $_"
    }
}

# List backups
function List-Backups {
    Write-Log ""
    Write-Log "📋 BACKUP INVENTORY:"
    Write-Log ""
    
    # Quick backups
    $quickBackups = @(Get-ChildItem "$BackupDir\database-*.sql.gz" -ErrorAction SilentlyContinue)
    Write-Log "📦 Quick Backups (5-min): $(($quickBackups | Measure-Object).Count)"
    if ($quickBackups.Count -gt 0) {
        $quickBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
            $size = $_.Length / 1MB
            Write-Log "   ├─ $($_.Name) ($([Math]::Round($size, 2)) MB) - $($_.LastWriteTime)"
        }
        if ($quickBackups.Count -gt 5) {
            Write-Log "   └─ ... and $($quickBackups.Count - 5) more"
        }
    }
    
    Write-Log ""
    
    # Full backups
    $fullBackups = @(Get-ChildItem "$BackupDir\full-system-*" -ErrorAction SilentlyContinue)
    Write-Log "📦 Full Backups (daily): $(($fullBackups | Measure-Object).Count)"
    if ($fullBackups.Count -gt 0) {
        $fullBackups | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
            $size = $_.Length / 1MB
            Write-Log "   ├─ $($_.Name) ($([Math]::Round($size, 2)) MB) - $($_.LastWriteTime)"
        }
        if ($fullBackups.Count -gt 5) {
            Write-Log "   └─ ... and $($fullBackups.Count - 5) more"
        }
    }
    
    Write-Log ""
    Write-Log "💾 Total backup storage: $([Math]::Round((Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB, 2)) GB"
    Write-Log ""
}

# Monitoring/Health check
function Monitor-Backups {
    Write-Log ""
    Write-Log "🏥 BACKUP SYSTEM HEALTH CHECK:"
    
    try {
        # Check if database container is running
        $containerCheck = docker ps --filter "name=$DatabaseContainer" --format "{{.Status}}"
        if ($containerCheck -like "*Up*") {
            Write-Log "✅ Database container: RUNNING"
        }
        else {
            Write-Log "❌ Database container: NOT RUNNING"
        }
        
        # Check backup directory
        if (Test-Path $BackupDir) {
            Write-Log "✅ Backup directory: EXISTS"
        }
        else {
            Write-Log "❌ Backup directory: MISSING"
        }
        
        # Check recent backups
        $recentQuick = @(Get-ChildItem "$BackupDir\database-*.sql.gz" -ErrorAction SilentlyContinue | 
                        Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-10) })
        if ($recentQuick.Count -gt 0) {
            Write-Log "✅ Recent quick backups: YES (last 10 minutes)"
        }
        else {
            Write-Log "⚠️ Recent quick backups: NONE (may need to wait)"
        }
        
        # Check backup log
        if (Test-Path "$BackupDir\backup.log") {
            Write-Log "✅ Backup log: ACTIVE"
        }
        else {
            Write-Log "❌ Backup log: MISSING"
        }
        
        Write-Log ""
    }
    catch {
        Write-Log "❌ Health check error: $_"
    }
}

# Main execution
switch ($Action.ToLower()) {
    "quick" { Backup-Quick }
    "full" { Backup-Full }
    "restore" { Restore-Database }
    "list" { List-Backups }
    "monitor" { Monitor-Backups }
    "help" {
        Write-Host @"
Local Backup Manager - Usage:

  .\backup-manager-local.ps1 quick      # Quick database backup (5 min cycle)
  .\backup-manager-local.ps1 full       # Full system backup (daily)
  .\backup-manager-local.ps1 list       # Show all backups
  .\backup-manager-local.ps1 monitor    # Health check
  .\backup-manager-local.ps1 restore    # Restore from backup

Automatic Schedule (via Task Scheduler):
  - Every 5 minutes: Quick backup
  - Every day at 2 AM: Full backup
  - Every hour: Health monitoring

Backups stored in: $BackupDir
"@
    }
    default { Backup-Quick }
}
