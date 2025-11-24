# phpMyAdmin Setup Guide

## 🎯 What is phpMyAdmin?
phpMyAdmin is a web-based database management tool that lets you:
- View and edit database tables
- Run SQL queries
- Export/Import data
- Manage users and permissions
- Delete/modify records easily

## 🚀 How to Access

### **Localhost (Development)**
```
URL: http://localhost:8081
Username: root
Password: rootpassword (or check your .env DB_ROOT_PASSWORD)
```

### **Production VPS (148.230.107.155)**
```
URL: http://148.230.107.155:8081
Username: root
Password: rootpassword123 (or your production DB_ROOT_PASSWORD)
```

## 📦 Installation Steps

### **1. Deploy to Production VPS**

SSH into your VPS:
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
git pull origin stable/prisma-mysql-production
docker-compose up -d phpmyadmin
```

### **2. Verify It's Running**
```bash
docker ps | grep phpmyadmin
# Should show: wms-phpmyadmin running
```

### **3. Access phpMyAdmin**
Open browser: `http://148.230.107.155:8081`

Login with:
- **Username**: `root`
- **Password**: Your `DB_ROOT_PASSWORD` from `.env` file

## 🔒 Security Recommendations

### **Option 1: Change Port (Recommended)**
Edit `docker-compose.yml`:
```yaml
ports:
  - "9999:80"  # Change 8081 to random port like 9999
```

Then access via: `http://148.230.107.155:9999`

### **Option 2: Add Firewall Rule**
Allow only your IP to access phpMyAdmin:
```bash
# Replace YOUR_IP with your actual IP address
ufw allow from YOUR_IP to any port 8081
ufw deny 8081
```

### **Option 3: Use SSH Tunnel (Most Secure)**
Instead of exposing phpMyAdmin publicly, access it via SSH tunnel:

```bash
# On your local machine:
ssh -L 8081:localhost:8081 root@148.230.107.155

# Then open in browser:
http://localhost:8081
```

This keeps phpMyAdmin completely private!

## 📊 Common Tasks

### **Delete Old Shipments**
1. Open phpMyAdmin
2. Select `warehouse_wms` database
3. Click `shipments` table
4. Click "Browse" tab
5. Check boxes next to records to delete
6. Click "Delete" at bottom

### **Run SQL Query**
1. Click "SQL" tab
2. Enter your query:
   ```sql
   DELETE FROM shipments WHERE createdAt < '2025-01-01';
   ```
3. Click "Go"

### **Export Database Backup**
1. Select `warehouse_wms` database
2. Click "Export" tab
3. Choose "Quick" or "Custom"
4. Click "Go" to download

### **Import Data**
1. Click "Import" tab
2. Choose file
3. Click "Go"

## ⚠️ Important Notes

- **Backup before deleting**: Always export database before major deletions
- **Root access**: You have full access - be careful!
- **Port 8081**: Change this in production for security
- **Don't expose publicly**: Use SSH tunnel or firewall for production

## 🛠️ Troubleshooting

### Can't access phpMyAdmin?
```bash
# Check if container is running
docker ps | grep phpmyadmin

# Check logs
docker logs wms-phpmyadmin

# Restart container
docker-compose restart phpmyadmin
```

### Wrong password?
```bash
# Check your .env file
cat .env | grep DB_ROOT_PASSWORD
```

### Port already in use?
```bash
# Check what's using port 8081
netstat -tulpn | grep 8081

# Or change port in docker-compose.yml
```

## 📝 Quick Commands

```bash
# Start phpMyAdmin
docker-compose up -d phpmyadmin

# Stop phpMyAdmin
docker-compose stop phpmyadmin

# Remove phpMyAdmin (keeps database safe)
docker-compose rm -f phpmyadmin

# View logs
docker logs wms-phpmyadmin -f

# Restart if not working
docker-compose restart phpmyadmin
```

---

**✅ That's it! You can now manage your database easily through phpMyAdmin.**
