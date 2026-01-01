# VPS Access Guide - QGO Cargo WMS

## 🖥️ Server Information

**Provider**: Hostinger VPS  
**Hostname**: srv1078864.hstgr.cloud  
**IP Address**: 148.230.107.155  
**Operating System**: AlmaLinux / CentOS  
**Resources**: 8 CPU Cores, 31GB RAM  

---

## 🔑 Login Credentials

**SSH Username**: `root`  
**SSH Password**: `Qgocargo@123`  
**SSH Port**: `22` (default)

---

## 🪟 Access via PuTTY (Windows)

### Method 1: PuTTY GUI

1. **Download PuTTY** (if not installed):
   - Visit: https://www.putty.org/
   - Download and install PuTTY for Windows

2. **Open PuTTY**

3. **Enter Connection Details**:
   - **Host Name**: `148.230.107.155`
   - **Port**: `22`
   - **Connection Type**: Select `SSH`

4. **Click "Open"**

5. **Login**:
   - When prompted "login as:", type: `root`
   - When prompted for password, type: `Qgocargo@123`
   - **Note**: Password won't be visible while typing

6. **You're now connected!**

---

### Method 2: PuTTY via PowerShell (Command Line)

Open PowerShell and run:

```powershell
# Add PuTTY to PATH (if not already)
$env:Path += ";C:\Program Files\PuTTY"

# Connect using plink
plink -batch -pw Qgocargo@123 root@148.230.107.155
```

**Explanation**:
- `plink`: PuTTY command-line SSH client
- `-batch`: Suppresses interactive prompts
- `-pw Qgocargo@123`: Password (use with caution)
- `root@148.230.107.155`: Username and server IP

---

## 🐧 Access via SSH (Linux/Mac)

Open Terminal and run:

```bash
ssh root@148.230.107.155
```

When prompted for password, enter: `Qgocargo@123`

---

## 📁 File Transfer - PSCP (PuTTY Secure Copy)

### Download File from VPS to Local PC

```powershell
# Syntax
pscp -pw Qgocargo@123 root@148.230.107.155:/path/on/vps/file.txt C:\Local\Destination\

# Example: Download a backup file
pscp -pw Qgocargo@123 root@148.230.107.155:/tmp/backup.tar.gz C:\Users\USER\Downloads\
```

### Upload File from Local PC to VPS

```powershell
# Syntax
pscp -pw Qgocargo@123 C:\Local\File\path\file.txt root@148.230.107.155:/destination/path/

# Example: Upload Docker image
pscp -pw Qgocargo@123 C:\Users\USER\wms-backend.tar.gz root@148.230.107.155:/tmp/
```

### Transfer Entire Directory

```powershell
# Download directory recursively
pscp -r -pw Qgocargo@123 root@148.230.107.155:/remote/directory C:\Local\Destination\

# Upload directory recursively
pscp -r -pw Qgocargo@123 C:\Local\Directory root@148.230.107.155:/remote/destination/
```

---

## 📁 File Transfer - WinSCP (Alternative GUI Tool)

**WinSCP** is a free SFTP/FTP client for Windows with a graphical interface.

### Download & Install
- Visit: https://winscp.net/
- Download and install WinSCP

### Connect to VPS
1. Open WinSCP
2. Click "New Session"
3. Enter details:
   - **File protocol**: SFTP
   - **Host name**: `148.230.107.155`
   - **Port number**: `22`
   - **User name**: `root`
   - **Password**: `Qgocargo@123`
4. Click "Login"
5. Drag and drop files between local PC and VPS

---

## 🐳 Common Docker Commands on VPS

Once connected via SSH, use these commands:

### View Running Containers
```bash
docker ps
```

### View All Containers (including stopped)
```bash
docker ps -a
```

### View Container Logs
```bash
docker logs wms-backend --tail 50
docker logs wms-backend -f  # Follow logs in real-time
```

### Restart Container
```bash
docker restart wms-backend
```

### Stop Container
```bash
docker stop wms-backend
```

### Start Container
```bash
docker start wms-backend
```

### Execute Command Inside Container
```bash
# Open shell
docker exec -it wms-backend sh

# Run single command
docker exec wms-backend ls -la /app/uploads
```

### Check Container Stats (CPU, Memory)
```bash
docker stats
```

### Inspect Container Configuration
```bash
docker inspect wms-backend
```

---

## 🛠️ Useful VPS Commands

### Check System Resources
```bash
# CPU usage
top

# Disk usage
df -h

# Memory usage
free -h

# Running processes
ps aux | grep node
```

### Check Network Ports
```bash
# See what's listening on ports
ss -tuln

# Check specific port
ss -tuln | grep 5000
```

### View System Logs
```bash
# Docker service logs
journalctl -u docker -f

# Last 50 lines of system log
journalctl -n 50
```

### File Operations
```bash
# List files
ls -la

# Create directory
mkdir /path/to/directory

# Copy file
cp source.txt destination.txt

# Move/Rename file
mv old-name.txt new-name.txt

# Delete file
rm file.txt

# Delete directory recursively
rm -rf /path/to/directory
```

### File Editing
```bash
# Edit file with nano (beginner-friendly)
nano /path/to/file.conf

# Save: Ctrl+O, then Enter
# Exit: Ctrl+X

# Edit file with vim (advanced)
vim /path/to/file.conf

# Insert mode: Press 'i'
# Save and exit: Press Esc, then type :wq
# Exit without saving: Press Esc, then type :q!
```

---

## 🔐 Security Scripts on VPS

### Run Security Check
```bash
bash /root/check
```

This checks:
- Port 2375 status (should be closed)
- Docker daemon configuration
- Container legitimacy

### Fix Docker Port 2375 Issue
```bash
bash /root/fix-docker-port
```

Automatically secures Docker daemon if port 2375 is exposed.

---

## 📋 Important File Locations on VPS

### Application Files
- `/root/NEW START/backend/` - Latest WMS backend source code
- `/root/NEW START/backend/uploads/` - All uploaded files (images, documents)

### Backups
- `/root/backups/` - Manual pre-deployment backups
- `/root/wms-backups/` - Automated database backups

### Docker Configuration
- `/etc/systemd/system/docker.service.d/override.conf` - Docker daemon secure config
- `/etc/docker/daemon.json` - Docker daemon settings

### Security Documentation
- `/root/SECURITY_README.md` - Security incident documentation (Dec 31, 2025)
- `/root/check` - Security audit script
- `/root/fix-docker-port` - Port 2375 auto-fix script

### Logs
- `/var/log/` - System logs
- Use `docker logs <container-name>` for container logs

---

## 🚨 Emergency Procedures

### If Backend is Down
```bash
# Check if container is running
docker ps | grep wms-backend

# If not running, start it
docker start wms-backend

# Check logs for errors
docker logs wms-backend --tail 50

# If container is missing, recreate from image
docker run -d \
  --name wms-backend \
  --network fleet-network \
  --cpus=0.3 \
  -p 5000:5000 \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms' \
  -e NODE_ENV=production \
  wms-backend:compiled
```

### If Database is Down
```bash
# Check database container
docker ps | grep wms-database

# Start if stopped
docker start wms-database

# Check logs
docker logs wms-database --tail 50
```

### If Website Shows 502 Error
```bash
# Restart frontend to refresh DNS
docker restart wms-frontend

# Wait 5 seconds
sleep 5

# Test backend health
curl http://localhost:5000/health
```

### If CPU is at 100%
```bash
# Check CPU steal (Hostinger throttling indicator)
top -b -n 1 | head -5

# Check container CPU usage
docker stats --no-stream

# Verify CPU limits are applied
docker inspect wms-backend --format '{{.HostConfig.NanoCpus}}'
# Should show: 300000000
```

### Rollback to Backup Container
```bash
# Stop current container
docker stop wms-backend

# Remove current container
docker rm wms-backend

# Start backup container (created Jan 1, 2026)
docker run -d \
  --name wms-backend \
  --network fleet-network \
  --cpus=0.3 \
  -p 5000:5000 \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms' \
  -e NODE_ENV=production \
  wms-backend-backup-jan01:latest

# Restore uploads
docker cp /root/NEW\ START/backend/uploads/. wms-backend:/app/uploads/
```

---

## 🔍 Monitoring & Maintenance

### Weekly Tasks
1. **Run Security Check**:
   ```bash
   bash /root/check
   ```

2. **Check Disk Space**:
   ```bash
   df -h
   # If usage > 80%, clean up old backups and Docker images
   ```

3. **Review Logs**:
   ```bash
   docker logs wms-backend --tail 100 | grep -i error
   ```

### Monthly Tasks
1. **Update Docker Images**:
   ```bash
   docker pull mysql:8.0
   docker pull nginx:alpine
   ```

2. **Clean Up Unused Resources**:
   ```bash
   docker system prune -a
   # Warning: This removes unused images, containers, networks
   ```

3. **Create Full Backup**:
   ```bash
   # Database
   docker exec wms-database mysqldump -u wms_user -pwmspassword123 warehouse_wms | gzip > /root/backups/wms_$(date +%Y%m%d).sql.gz
   
   # Uploads
   tar -czf /root/backups/uploads_$(date +%Y%m%d).tar.gz -C /root/NEW\ START/backend uploads
   ```

---

## 📞 Support & Resources

### Hostinger Support
- **Control Panel**: https://hpanel.hostinger.com
- **Support**: Available 24/7 via live chat in control panel

### Quick Reference Links
- **PuTTY Download**: https://www.putty.org/
- **WinSCP Download**: https://winscp.net/
- **Docker Documentation**: https://docs.docker.com/

---

## ⚠️ Security Warnings

1. **Never share VPS credentials** publicly or in version control
2. **Change default passwords** after receiving VPS access
3. **Use SSH keys** instead of password authentication (recommended)
4. **Keep Docker port 2375 closed** - Check weekly with `/root/check`
5. **Monitor CPU usage** - Hostinger will throttle if overused
6. **Regular backups** - Before any major changes
7. **Apply CPU limits** - All containers should be limited to 30%

---

## 🔐 Setting Up SSH Key Authentication (Recommended)

Instead of using password, use SSH keys for more secure access:

### Generate SSH Key (on Local PC)
```powershell
# Open PowerShell
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Save to default location (press Enter)
# Set passphrase (or leave empty)
```

### Copy Public Key to VPS
```powershell
# View your public key
cat ~\.ssh\id_rsa.pub

# Copy the output, then SSH to VPS
ssh root@148.230.107.155

# On VPS, add key to authorized_keys
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Connect Without Password
```powershell
ssh root@148.230.107.155
# No password required!
```

---

**Last Updated**: January 1, 2026  
**VPS Status**: ✅ Online & Optimized  
**Access Method**: PuTTY / SSH  
**Security Status**: ✅ Port 2375 Closed, CPU Limits Applied
