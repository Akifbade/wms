# 🎉 VPS Deployment Complete!

## ✅ System Successfully Deployed

Your Warehouse Management System is now live on your VPS!

### 🌐 Access Information

**URL:** http://72.60.215.188

**Admin Login:**
- Email: `admin@wms.com`
- Password: `admin123`

### 📊 Server Details

- **VPS IP:** 72.60.215.188
- **OS:** Rocky Linux
- **Node.js:** v18.x
- **Database:** MariaDB (MySQL compatible)
- **Web Server:** Nginx
- **Process Manager:** PM2

### 🗄️ Database Configuration

- **Database Name:** wms_production
- **Database User:** wms_user
- **Database Password:** WmsSecure2024Pass
- **Connection:** localhost:3306

### 🚀 Services Running

1. **Backend API** (Port 5000)
   - Status: ✅ Online
   - Process Manager: PM2
   - Command: `pm2 list` to check status
   - Logs: `pm2 logs wms-backend`

2. **Frontend** (Port 80)
   - Status: ✅ Served by Nginx
   - Location: `/var/www/wms/frontend/dist`
   - Built with Vite/React

3. **Database** (Port 3306)
   - Status: ✅ Running
   - Service: MariaDB
   - Command: `systemctl status mariadb`

4. **Web Server** (Port 80)
   - Status: ✅ Active
   - Service: Nginx
   - Config: `/etc/nginx/conf.d/wms.conf`

### 📁 Application Structure

```
/var/www/wms/
├── backend/           # Node.js + Express + Prisma
│   ├── src/          # TypeScript source code
│   ├── dist/         # Compiled JavaScript
│   ├── prisma/       # Database schema
│   └── .env          # Environment variables
└── frontend/         # React + Vite + TypeScript
    ├── src/          # Source code
    └── dist/         # Production build
```

### 🔧 Server Management Commands

**SSH Access:**
```bash
ssh root@72.60.215.188
Password: Akif@8788881688
```

**Backend Management:**
```bash
# Check status
pm2 list

# View logs
pm2 logs wms-backend

# Restart backend
pm2 restart wms-backend

# Stop backend
pm2 stop wms-backend

# Start backend
pm2 start wms-backend
```

**Database Management:**
```bash
# Access MySQL
mysql -u root -pAkif@8788881688

# Access WMS database
mysql -u root -pAkif@8788881688 wms_production

# Backup database
mysqldump -u root -pAkif@8788881688 wms_production > backup.sql

# Restore database
mysql -u root -pAkif@8788881688 wms_production < backup.sql
```

**Nginx Management:**
```bash
# Check status
systemctl status nginx

# Restart Nginx
systemctl restart nginx

# Test configuration
nginx -t

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 🔄 Update Application

**Update Backend:**
```bash
cd /var/www/wms/backend
git pull  # or upload new files
npm install
npm run build
pm2 restart wms-backend
```

**Update Frontend:**
```bash
cd /var/www/wms/frontend
git pull  # or upload new files
npm install
npm run build
# Nginx will automatically serve new files
```

### 🗂️ Features Available

✅ Multi-tenant company management
✅ User authentication & role-based access (ADMIN, MANAGER, STAFF)
✅ Shipment tracking with QR codes
✅ Warehouse rack management
✅ Invoice generation
✅ Payment tracking
✅ Moving job management
✅ Custom fields per company
✅ Dashboard with analytics
✅ Mobile-responsive design

### ⚠️ Fleet Module Status

❌ Fleet Management Module has been **REMOVED** as per your request
- Driver App removed
- Vehicle tracking removed
- Trip management removed
- All Fleet routes removed

### 🔒 Security Recommendations

1. **Change Default Password:** Login and change admin password immediately
2. **Setup Firewall:** Configure firewall rules to allow only necessary ports
3. **SSL Certificate:** Install Let's Encrypt SSL for HTTPS:
   ```bash
   dnf install certbot python3-certbot-nginx -y
   certbot --nginx -d yourdomain.com
   ```
4. **Regular Backups:** Schedule automated database backups
5. **Update Secrets:** Change JWT_SECRET in `/var/www/wms/backend/.env`

### 📝 Next Steps

1. ✅ Visit http://72.60.215.188
2. ✅ Login with admin credentials
3. ✅ Create your first company/tenant
4. ✅ Add users
5. ✅ Create warehouse racks
6. ✅ Start managing shipments
7. 🔄 (Optional) Setup custom domain with SSL
8. 🔄 (Optional) Configure automated backups

### 🆘 Troubleshooting

**Backend not responding:**
```bash
pm2 logs wms-backend  # Check for errors
pm2 restart wms-backend  # Restart
```

**Database connection errors:**
```bash
systemctl status mariadb  # Check database status
mysql -u wms_user -pWmsSecure2024Pass wms_production  # Test connection
```

**Nginx errors:**
```bash
nginx -t  # Test configuration
tail -f /var/log/nginx/error.log  # Check logs
systemctl restart nginx  # Restart
```

**Can't login:**
- Make sure backend is running: `pm2 list`
- Check backend logs: `pm2 logs wms-backend`
- Verify database connection in `.env` file

### 📞 Support

- Backend logs: `pm2 logs wms-backend`
- Nginx logs: `/var/log/nginx/`
- Database logs: `journalctl -u mariadb`

---

## 🎊 Congratulations!

Your Warehouse Management System is fully deployed and ready to use!

**Live URL:** http://72.60.215.188
**Login:** admin@wms.com / admin123

Enjoy your new WMS! 🚀📦
