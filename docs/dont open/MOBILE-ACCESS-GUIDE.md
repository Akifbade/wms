# 📱 Qgo Cargo WMS - Mobile Access Guide

**Project by: Akif Bade**  
**Contact: 99860163**

---

## 🌐 Access on Mobile (Same WiFi Network)

### Your Network URLs:
- **Frontend (Mobile Browser):** `http://172.20.10.2:3000`
- **Backend API:** `http://172.20.10.2:5000`

### Steps to Access:

1. **Make sure your mobile is on the SAME WiFi** as your PC
2. **Open your mobile browser** (Chrome, Safari, etc.)
3. **Type this URL:** `http://172.20.10.2:3000`
4. **Done!** You can now use the system on your mobile

---

## 🔥 Windows Firewall Setup (IMPORTANT!)

If mobile can't connect, you need to allow ports through firewall:

### Run these commands in PowerShell (as Administrator):

```powershell
# Allow Frontend Port (3000)
New-NetFirewallRule -DisplayName "Qgo Cargo Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow Backend Port (5000)
New-NetFirewallRule -DisplayName "Qgo Cargo Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

---

## 🚀 Starting the Servers

Always run both servers:

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

---

## 🌍 Access from Internet (Advanced - Optional)

For access from outside your network (from anywhere):

### Option 1: ngrok (Easiest)

1. **Install ngrok:** https://ngrok.com/download
2. **Run backend tunnel:**
   ```powershell
   ngrok http 5000
   ```
3. **Run frontend tunnel:**
   ```powershell
   ngrok http 3000
   ```
4. Use the `https://` URLs provided by ngrok

### Option 2: Port Forwarding (Your Router)

1. Login to your router (usually `192.168.1.1`)
2. Find "Port Forwarding" settings
3. Forward ports: `3000` and `5000` to your PC's IP: `172.20.10.2`
4. Access via: `http://[YOUR_PUBLIC_IP]:3000`

### Option 3: Deploy to Cloud (Production)

Deploy to free hosting:
- **Frontend:** Vercel, Netlify, GitHub Pages
- **Backend:** Railway, Render, Fly.io
- **Database:** Upgrade to PostgreSQL (free tier on Neon, Supabase)

---

## 📊 Project Stats

- **Overall Completion:** 78%
- **API Endpoints:** 67
- **Database Models:** 21
- **Features Working:**
  - ✅ Custom Fields with 5 types
  - ✅ Shipment Status Tabs
  - ✅ Perfect Partial Release
  - ✅ Rack Integration
  - ✅ All 8 Settings Pages
  - ✅ Billing System
  - ✅ Invoice Generation

---

## 🐛 Troubleshooting Mobile Access

### Problem: Can't connect from mobile

**Solution 1:** Check if PC and mobile are on same WiFi
```powershell
ipconfig
```
Look for "Wireless LAN adapter Wi-Fi" → IPv4 Address

**Solution 2:** Disable Windows Firewall temporarily
```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```
⚠️ Remember to enable it back after testing!

**Solution 3:** Check if servers are running
- Open `http://localhost:3000` on PC - should work
- Open `http://localhost:5000/api/health` on PC - should return JSON

**Solution 4:** Try your PC's other IP addresses
```powershell
ipconfig | Select-String "IPv4"
```
Try each IP address shown

---

## 📝 Quick Notes

- **Your Network IP:** `172.20.10.2` (may change when you reconnect to WiFi)
- **Local URLs work only on your PC:** `localhost:3000`
- **Network URLs work on mobile/other devices:** `172.20.10.2:3000`
- **Backend auto-reloads** when you change code (nodemon)
- **Frontend auto-reloads** when you change code (Vite HMR)

---

## 💡 Recommendations

1. **For Testing:** Use network URLs (172.20.10.2)
2. **For Development:** Use localhost on PC
3. **For Production:** Deploy to cloud hosting
4. **For Demo:** Use ngrok for temporary internet access

---

**Great work on this project, Akif! 🚀**

Contact: 99860163
