# 📱 NETWORK ACCESS GUIDE

## 🌐 Your Network Information

**Your PC IP Address:** `192.168.0.205`

## 📲 Access from Other Devices (Phone, Tablet, Other PC)

### ✅ Quick Access URLs:

```
Frontend (Website):  http://192.168.0.205:3000
Backend API:         http://192.168.0.205:5000
```

### 📱 **From Your Phone/Tablet:**

1. Make sure your phone is on the **SAME WiFi network** as your PC
2. Open browser on phone
3. Go to: `http://192.168.0.205:3000`
4. Login: `admin@wms.com` / `admin123`

### 💻 **From Another Computer:**

Same WiFi network required:
```
http://192.168.0.205:3000
```

## 🔧 Setup Steps:

### 1. **Allow Windows Firewall** (IMPORTANT!)

Run this in PowerShell as Administrator:

```powershell
# Allow port 3000 (Frontend)
New-NetFirewallRule -DisplayName "WMS Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow port 5000 (Backend)
New-NetFirewallRule -DisplayName "WMS Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### 2. **Restart Docker Containers:**

```powershell
cd "c:\Users\USER\Videos\NEW START"
.\scripts\STOP-EVERYTHING.ps1
.\scripts\START-EVERYTHING.ps1
```

### 3. **Test from Phone:**

Open phone browser → `http://192.168.0.205:3000`

## 🛠️ Troubleshooting:

### ❌ Can't connect from phone?

**Check 1: Same WiFi?**
```
PC WiFi:    [Your WiFi Name]
Phone WiFi: [Should be same]
```

**Check 2: Windows Firewall**
```powershell
# Check if rules exist
Get-NetFirewallRule -DisplayName "WMS*"

# If not found, run the firewall commands above
```

**Check 3: Docker is running**
```powershell
docker ps
# Should show 4 containers running
```

**Check 4: Your IP changed?**
```powershell
# Get current IP
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"}
```

### 🔄 IP Address Changes After Restart

If your router gives you a different IP after PC restart:

```powershell
# Run this to get new IP
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -eq "Dhcp"}

# Update this file with new IP
# Then share new URL: http://NEW_IP:3000
```

## 📊 Network Ports Used:

| Port | Service | Access |
|------|---------|--------|
| 3000 | Frontend (React/Vite) | Everyone |
| 5000 | Backend (Node.js API) | Frontend + Direct API |
| 3306 | MySQL Database | Docker internal only |

## 🌍 Remote Access (Internet) - Advanced

If you want to access from outside your WiFi (internet), you need:

### Option 1: **Port Forwarding** (Router settings)
1. Login to router (usually 192.168.0.1)
2. Forward port 3000 → Your PC IP (192.168.0.205)
3. Get public IP from: https://whatismyip.com
4. Access: `http://YOUR_PUBLIC_IP:3000`

⚠️ **Security Warning:** Not recommended without HTTPS/authentication!

### Option 2: **Ngrok** (Easy tunnel)
```bash
# Install ngrok
choco install ngrok

# Create tunnel
ngrok http 3000

# Share the https URL ngrok gives you
```

### Option 3: **VPS Deployment** (Best for production)
```bash
# Deploy to VPS using our script
.\scripts\deploy-vps-auto.ps1
```

## 📝 Quick Reference Card

Print this and stick on your wall! 📌

```
╔════════════════════════════════════════╗
║     WMS NETWORK ACCESS                 ║
╠════════════════════════════════════════╣
║                                        ║
║  FROM SAME WIFI:                       ║
║  http://192.168.0.205:3000            ║
║                                        ║
║  LOGIN:                                ║
║  admin@wms.com                         ║
║  admin123                              ║
║                                        ║
║  ALLOW FIREWALL:                       ║
║  Ports 3000, 5000                      ║
║                                        ║
╚════════════════════════════════════════╝
```
