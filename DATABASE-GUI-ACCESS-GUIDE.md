# 🖥️ How to Access Your VPS MySQL Database with GUI

## ✅ Setup Complete!

Your MySQL database is now configured for remote access:

```
Host: 72.60.215.188
Port: 3306
Database: wms_production
Username: wms_user
Password: WmsSecure2024Pass
```

---

## 🎯 Option 1: MySQL Workbench (Recommended for Beginners)

### **Download & Install:**
1. Go to: https://dev.mysql.com/downloads/workbench/
2. Download MySQL Workbench for Windows
3. Install the application

### **Connect to Your Database:**

1. **Open MySQL Workbench**
2. **Click the "+" icon** next to "MySQL Connections"
3. **Fill in the connection details:**

```
Connection Name: WMS Production Database
Connection Method: Standard (TCP/IP)
Hostname: 72.60.215.188
Port: 3306
Username: wms_user
Password: (click "Store in Vault" and enter: WmsSecure2024Pass)
Default Schema: wms_production
```

4. **Click "Test Connection"** - You should see "Successfully connected!"
5. **Click "OK"** to save the connection
6. **Double-click the connection** to open it

### **What You Can Do:**
- ✅ Browse all 24 tables
- ✅ View and edit data
- ✅ Run SQL queries
- ✅ Export data to Excel/CSV
- ✅ Create database backups
- ✅ View table relationships
- ✅ Generate ER diagrams

---

## 🎯 Option 2: DBeaver (Best for Advanced Users)

### **Download & Install:**
1. Go to: https://dbeaver.io/download/
2. Download DBeaver Community Edition (FREE)
3. Install the application

### **Connect to Your Database:**

1. **Open DBeaver**
2. **Click "Database" → "New Database Connection"**
3. **Select "MySQL" or "MariaDB"** (either works)
4. **Click "Next"**
5. **Fill in connection details:**

```
Server Host: 72.60.215.188
Port: 3306
Database: wms_production
Username: wms_user
Password: WmsSecure2024Pass
```

6. **Click "Test Connection"** - Should succeed
7. **Click "Finish"**

### **What You Can Do:**
- ✅ Everything MySQL Workbench can do, plus:
- ✅ Compare databases
- ✅ Generate mock data
- ✅ Visual query builder
- ✅ ER diagrams
- ✅ Data transfer between databases

---

## 🎯 Option 3: Prisma Studio (Built-in, Modern UI)

### **From Your Local Computer:**

1. **Open PowerShell in your backend folder:**
```powershell
cd "C:\Users\USER\Videos\NEW START\backend"
```

2. **Your `.env` file should already have:**
```env
DATABASE_URL="mysql://wms_user:WmsSecure2024Pass@localhost:3306/wms_production"
```

3. **Change it to connect to VPS:**
```powershell
notepad .env
```

Change the DATABASE_URL to:
```env
DATABASE_URL="mysql://wms_user:WmsSecure2024Pass@72.60.215.188:3306/wms_production"
```

4. **Launch Prisma Studio:**
```powershell
npx prisma studio
```

5. **Prisma Studio will open in your browser at:**
```
http://localhost:5555
```

### **What You Can Do:**
- ✅ Modern, clean interface
- ✅ View and edit all tables
- ✅ Filter and search records
- ✅ See relationships visually
- ✅ Add/edit/delete records easily
- ✅ Works perfectly with your Prisma schema

---

## 🎯 Option 4: HeidiSQL (Lightweight & Fast)

### **Download & Install:**
1. Go to: https://www.heidisql.com/download.php
2. Download HeidiSQL
3. Install the application

### **Connect:**
1. **Click "New"** at bottom left
2. **Fill in:**
```
Network type: MySQL (TCP/IP)
Hostname / IP: 72.60.215.188
User: wms_user
Password: WmsSecure2024Pass
Port: 3306
Database: wms_production
```
3. **Click "Open"**

---

## 🎯 Option 5: TablePlus (Beautiful & Modern)

### **Download & Install:**
1. Go to: https://tableplus.com/
2. Download TablePlus
3. Free trial available, then $79 one-time payment

### **Connect:**
1. **Click "Create a new connection"**
2. **Select "MySQL"**
3. **Fill in:**
```
Name: WMS Production
Host: 72.60.215.188
Port: 3306
User: wms_user
Password: WmsSecure2024Pass
Database: wms_production
```
4. **Click "Connect"**

---

## 📊 What's in Your Database Right Now

### **Tables (24 total):**
```
✅ companies (1 record)
✅ users (2 records - both ADMIN)
✅ permissions (84 records) ⭐ JUST SEEDED
✅ role_permissions (234 records) ⭐ JUST SEEDED
✅ shipments (1 record)
✅ shipment_boxes (5 records)
✅ racks (1 record - A1)
✅ invoices (0 records)
✅ payments (0 records)
✅ moving_jobs (0 records)
✅ expenses (0 records)
... and 13 more tables
```

---

## 🔍 Useful SQL Queries to Try

### **View All Users:**
```sql
SELECT id, email, name, role, isActive, createdAt 
FROM users;
```

### **View All Permissions by Role:**
```sql
SELECT 
    rp.role,
    COUNT(*) as permission_count,
    GROUP_CONCAT(CONCAT(p.resource, ':', p.action)) as permissions
FROM role_permissions rp
JOIN permissions p ON rp.permissionId = p.id
GROUP BY rp.role;
```

### **View Shipments with Rack Info:**
```sql
SELECT 
    s.id,
    s.customerName,
    s.status,
    s.boxCount,
    r.location as rack_location,
    r.currentCapacity
FROM shipments s
LEFT JOIN racks r ON s.rackId = r.id;
```

### **Check Database Size:**
```sql
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'wms_production'
GROUP BY table_schema;
```

---

## 🛠️ Common Tasks

### **1. Backup Database:**

**From MySQL Workbench:**
- Server → Data Export → Select wms_production → Start Export

**From Command Line:**
```powershell
ssh root@72.60.215.188
mysqldump -u wms_user -pWmsSecure2024Pass wms_production > backup_$(date +%Y%m%d).sql
```

### **2. Export Data to Excel:**

**From DBeaver or MySQL Workbench:**
- Right-click table → Export Data → Choose Excel format

### **3. View ER Diagram:**

**From MySQL Workbench:**
- Database → Reverse Engineer → Select wms_production → View diagram

**From DBeaver:**
- Right-click database → View Diagram

---

## 🔐 Security Notes

✅ **Firewall configured** - Only port 3306 open
✅ **User permissions limited** - wms_user only has access to wms_production
✅ **Strong password** - Using secure credentials
✅ **Remote access** - Now enabled for your IP

### **To Restrict Access to Your IP Only (More Secure):**

```bash
ssh root@72.60.215.188
mysql -u root -e "REVOKE ALL ON wms_production.* FROM 'wms_user'@'%'; GRANT ALL ON wms_production.* TO 'wms_user'@'YOUR_IP_ADDRESS' IDENTIFIED BY 'WmsSecure2024Pass'; FLUSH PRIVILEGES;"
```

---

## 🎯 My Recommendations

**For Daily Use:**
1. **Prisma Studio** - Quick edits, modern UI, integrates with your code
2. **MySQL Workbench** - Full-featured, free, great for learning

**For Advanced Work:**
1. **DBeaver** - Professional features, ER diagrams, data comparison
2. **TablePlus** - If you want the most beautiful UI (paid)

**Quick Access:**
- **HeidiSQL** - Fastest startup, minimal resource usage

---

## 📝 Quick Start Guide

### **Easiest Way to Get Started:**

1. **Install MySQL Workbench** (5 minutes)
2. **Create connection** with details above (2 minutes)
3. **Click to connect** (instant)
4. **Browse your tables!** 🎉

### **Alternative (No Installation):**

1. **Open PowerShell** in your backend folder
2. **Run:** `npx prisma studio`
3. **Opens in browser automatically!** 🚀

---

## 🆘 Troubleshooting

### **Can't Connect?**

1. **Check firewall:**
```bash
ssh root@72.60.215.188 "firewall-cmd --list-ports"
# Should show: 3306/tcp
```

2. **Check MySQL is listening:**
```bash
ssh root@72.60.215.188 "ss -tulpn | grep 3306"
# Should show: 0.0.0.0:3306
```

3. **Test connection from PowerShell:**
```powershell
Test-NetConnection -ComputerName 72.60.215.188 -Port 3306
# Should show: TcpTestSucceeded : True
```

### **Access Denied Error?**

Double-check credentials:
- Username: `wms_user` (no quotes)
- Password: `WmsSecure2024Pass` (case-sensitive)

---

## ✅ You're All Set!

Your MySQL database is now accessible with any GUI tool you prefer. Choose one and start exploring your data! 🎉

**Next Steps:**
1. Install your preferred GUI tool
2. Connect using the credentials above
3. Browse your 24 tables
4. Test the SQL queries provided
5. Start managing your data visually!

Need help? Just let me know! 💪
