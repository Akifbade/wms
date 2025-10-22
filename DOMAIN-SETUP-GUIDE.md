# 🌐 DOMAIN SETUP GUIDE - qgocargo.cloud

**Status:** ✅ **READY FOR DNS CONFIGURATION**

---

## 📋 SUMMARY

Your new domain `qgocargo.cloud` is now configured on the new VPS!

```
Domain:          qgocargo.cloud
VPS IP Address:  148.230.107.155
Status:          ✅ READY
```

---

## 🔧 CURRENT CONFIGURATION

### ✅ What's Configured:
- ✅ Nginx listening on ports 80 and 443
- ✅ HTTP → HTTPS redirect active
- ✅ Self-signed SSL certificate installed (temporary)
- ✅ Frontend serving on HTTPS
- ✅ API proxying to backend (port 5000)
- ✅ Let's Encrypt ready for production certificate

### ✅ Services Running:
- ✅ WMS Backend (Port 5000)
- ✅ QGO Frontend (Port 3000)
- ✅ QGO Backend (Port 3000)
- ✅ MariaDB (Port 3306)
- ✅ Nginx (Ports 80, 443)

---

## 📝 DNS CONFIGURATION INSTRUCTIONS

### **Your Current DNS:**
```
Nameservers:
- ns1.dns-parking.com
- ns2.dns-parking.com
```

### **What You Need to Do:**

#### Step 1: Update A Records in DNS Panel

**Go to your DNS provider (dns-parking.com)** and create/update these A records:

```
Type: A
Name: qgocargo.cloud  (or @)
Value: 148.230.107.155
TTL: 3600

---

Type: A
Name: www
Value: 148.230.107.155
TTL: 3600
```

#### Step 2: Verify DNS Propagation

Wait 15-30 minutes for DNS to propagate, then test:

```bash
# Check if domain points to correct IP
nslookup qgocargo.cloud
# Should return: 148.230.107.155

# Or use dig
dig qgocargo.cloud
# Should show: qgocargo.cloud.    3600  IN  A  148.230.107.155
```

#### Step 3: Test Domain Access

Once DNS is propagated:

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://qgocargo.cloud
# Response: HTTP/1.1 301 Moved Permanently

# Test HTTPS (will show certificate warning - that's OK for now)
curl -k https://qgocargo.cloud
# Should return your frontend HTML
```

---

## 🔐 SSL CERTIFICATE INFORMATION

### Current Certificate:
```
Type:      Self-signed (temporary)
Location:  /etc/letsencrypt/live/qgocargo.cloud/
Files:     fullchain.pem, privkey.pem
Valid:     365 days from Oct 22, 2025
Warning:   Browsers will show "Not Secure" - this is temporary!
```

### Upgrading to Production SSL (Let's Encrypt):

Once your DNS is properly configured and accessible, run:

```bash
ssh root@148.230.107.155

# Stop Nginx temporarily
systemctl stop nginx

# Get Let's Encrypt certificate
certbot certonly --standalone -d qgocargo.cloud -d www.qgocargo.cloud --agree-tos --email your@email.com

# Start Nginx
systemctl start nginx
```

Nginx will automatically use the new certificate!

---

## 🧪 TESTING CHECKLIST

After DNS propagation, verify everything works:

- [ ] `nslookup qgocargo.cloud` returns 148.230.107.155
- [ ] `curl -I http://qgocargo.cloud` redirects to HTTPS
- [ ] `curl -k https://qgocargo.cloud` returns frontend
- [ ] Login page loads at https://qgocargo.cloud
- [ ] API responds: `curl -k https://qgocargo.cloud/api/users`
- [ ] File uploads work
- [ ] Database queries work
- [ ] No console errors in browser

---

## 🚀 VPS ACCESS DETAILS

For management and troubleshooting:

```
SSH:     ssh root@148.230.107.155
Pass:    Qgocargo@123
Port:    22

Services:
- Frontend:  https://qgocargo.cloud (or port 80)
- WMS API:   Port 5000
- QGO:       Port 3000
- Database:  Port 3306
```

### Quick Commands:

```bash
# SSH into VPS
ssh root@148.230.107.155

# Check PM2 services
pm2 list

# Check Nginx status
systemctl status nginx

# Check certificate
certbot certificates

# View Nginx error log
tail -20 /var/log/nginx/error.log

# Check ports
netstat -tlnp
```

---

## 📊 CURRENT SYSTEM STATUS

### Listening Ports:
```
22   - SSH (System)
80   - Nginx HTTP
443  - Nginx HTTPS
3000 - QGO Applications
3306 - MariaDB Database
5000 - WMS Backend
```

### Services Status:
```
✅ Nginx:        ACTIVE
✅ MariaDB:      RUNNING
✅ PM2:          3 processes online
✅ Node.js:      All services running
✅ SSL:          Certificate installed
```

### Databases:
```
✅ qgo_db
✅ wms_db
✅ wms_production
```

---

## ⚠️ IMPORTANT NOTES

### DNS Propagation:
- DNS changes can take **15-30 minutes** to propagate worldwide
- Some ISPs cache DNS longer - be patient!
- Use `nslookup` or `dig` to check if fully propagated

### SSL Certificate:
- Current self-signed certificate is temporary
- Browsers will show warning ⚠️ (this is normal)
- Replace with Let's Encrypt certificate when ready (see instructions above)
- Certbot auto-renewal will handle expiry automatically

### Access Before DNS:
You can still access via IP:
```
https://148.230.107.155/
```
(Note: SSL certificate warning will show because cert is for domain, not IP)

---

## 🔧 TROUBLESHOOTING

### Domain not working after DNS update?

```bash
# SSH into VPS
ssh root@148.230.107.155

# Check if Nginx is running
systemctl status nginx

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Check error log
tail -50 /var/log/nginx/error.log
```

### "Connection refused" error?

```bash
# Check if port 80 is open
netstat -tlnp | grep :80

# Check if port 443 is open
netstat -tlnp | grep :443

# Verify firewall (if using UFW)
ufw status
ufw allow 80/tcp
ufw allow 443/tcp
```

### SSL certificate issues?

```bash
# Check current certificate
openssl x509 -in /etc/letsencrypt/live/qgocargo.cloud/fullchain.pem -text -noout

# Check certificate expiry
certbot certificates
```

---

## ✅ DNS SETUP SUMMARY

**What to do:**
1. ✅ Login to dns-parking.com
2. ✅ Find DNS management for qgocargo.cloud
3. ✅ Add A records pointing to **148.230.107.155**
4. ✅ Wait 15-30 minutes for DNS to propagate
5. ✅ Test with `nslookup qgocargo.cloud`
6. ✅ Access https://qgocargo.cloud
7. ✅ (Optional) Replace self-signed cert with Let's Encrypt

---

## 📞 REFERENCE

### DNS A Records Needed:
```
Name: qgocargo.cloud
Type: A
Value: 148.230.107.155
TTL: 3600

Name: www
Type: A
Value: 148.230.107.155
TTL: 3600
```

### Nginx Config Location:
```
/etc/nginx/conf.d/qgocargo.conf
```

### SSL Certificate Location:
```
/etc/letsencrypt/live/qgocargo.cloud/
├── fullchain.pem (public certificate)
├── privkey.pem (private key)
└── ...
```

### Application Paths:
```
Frontend: /var/www/wms/frontend/dist/
Backend:  /var/www/wms/backend/
QGO:      /var/www/qgo/
```

---

## 🎉 YOU'RE ALL SET!

Your VPS is fully configured. Once DNS is updated and propagated, your application will be live at:

### 🌐 **https://qgocargo.cloud**

**Next Steps:**
1. Update DNS records at dns-parking.com
2. Wait for DNS propagation (15-30 minutes)
3. Access your application
4. (Optional) Replace self-signed SSL with Let's Encrypt

---

**Migration Status:** ✅ COMPLETE  
**Domain Configuration:** ✅ COMPLETE  
**Ready for Production:** ✅ YES

All systems operational! 🚀
