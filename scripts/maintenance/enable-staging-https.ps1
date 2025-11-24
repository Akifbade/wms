#!/usr/bin/env pwsh

# ============================================================================
# Enable HTTPS for staging.qgocargo.cloud on VPS
# ============================================================================
# This PowerShell script runs the enable-staging-https.sh script on the VPS
# Requires SSH access and the bash script to be present

param(
    [string]$VpsHost = $env:PROD_VPS_HOST,
    [string]$VpsUser = $env:PROD_VPS_USER,
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================================"
Write-Host "🔐 ENABLING STAGING HTTPS (via SSH to VPS)" -ForegroundColor Cyan
Write-Host "============================================================================"
Write-Host ""

# Validate SSH key
if (-not (Test-Path $SshKeyPath)) {
    Write-Host "❌ SSH key not found: $SshKeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "ℹ️  VPS Host: $VpsHost"
Write-Host "ℹ️  SSH User: $VpsUser"
Write-Host "ℹ️  SSH Key: $SshKeyPath"
Write-Host ""

# Copy script to VPS
Write-Host "📤 Uploading enable-staging-https.sh to VPS..."
$ScriptContent = Get-Content "enable-staging-https.sh" -Raw

$sshCommand = @"
mkdir -p /tmp && cat > /tmp/enable-staging-https.sh << 'SCRIPT_EOF'
$ScriptContent
SCRIPT_EOF
chmod +x /tmp/enable-staging-https.sh
bash /tmp/enable-staging-https.sh
"@

try {
    $output = ssh -i $SshKeyPath "${VpsUser}@${VpsHost}" $sshCommand 2>&1
    Write-Host $output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ STAGING HTTPS ENABLED SUCCESSFULLY" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Next: Test in browser"
        Write-Host "   https://staging.qgocargo.cloud"
    } else {
        Write-Host ""
        Write-Host "⚠️  Script exited with code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ SSH command failed: $_" -ForegroundColor Red
    exit 1
}
