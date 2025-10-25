# 🔍 Logo Troubleshooting Script

## Run these commands on VPS to diagnose logo issue:

```bash
# 1. Check if logo file exists
ssh root@72.60.215.188 "ls -lah /var/www/wms/backend/public/uploads/logos/"

# 2. Check nginx uploads configuration
ssh root@72.60.215.188 "grep -A 5 'location /uploads' /etc/nginx/conf.d/wms.conf"

# 3. Test logo URL directly (replace with actual filename)
ssh root@72.60.215.188 "curl -I https://72.60.215.188/uploads/logos/company-logo-1760536039193-227371478.png"

# 4. Check backend logs for logo URL generation
ssh root@72.60.215.188 "pm2 logs wms-backend --lines 50 --nostream | grep -i logo"

# 5. Check database for logo path
ssh root@72.60.215.188 "mysql -u root -pV@r!0u# wms_production -e 'SELECT id, name, logo, logoSize FROM companies;'"

# 6. Check file permissions
ssh root@72.60.215.188 "stat /var/www/wms/backend/public/uploads/logos/company-logo-*.png 2>/dev/null | head -20"

# 7. Check nginx error logs
ssh root@72.60.215.188 "tail -20 /var/log/nginx/error.log"

# 8. Test branding API endpoint
ssh root@72.60.215.188 "curl -s https://72.60.215.188/api/company/branding | python3 -m json.tool"
```

## Expected Results:

### 1. Logo File Exists:
```
-rw-r--r-- 1 root root 12345 Oct 15 14:30 company-logo-xxx.png
```

### 2. Nginx Config:
```nginx
location /uploads {
    alias /var/www/wms/backend/public/uploads;
    autoindex off;
    add_header Cache-Control "public, max-age=31536000";
}
```

### 3. URL Test:
```
HTTP/2 200 
content-type: image/png
```

### 4. Backend Logs:
```
Logo uploaded successfully: { url: '/uploads/logos/company-logo-xxx.png' }
```

### 5. Database:
```
id | name | logo | logoSize
test-company-001 | Company Name | /uploads/logos/company-logo-xxx.png | medium
```

### 6. Branding API:
```json
{
  "branding": {
    "logo": "/uploads/logos/company-logo-xxx.png",
    "logoUrl": "https://72.60.215.188/uploads/logos/company-logo-xxx.png",
    "logoSize": "medium"
  }
}
```

## Quick Fixes:

### If File Missing:
```bash
# Re-upload logo from settings page
# Or copy from backup
```

### If Nginx Not Configured:
```bash
ssh root@72.60.215.188
nano /etc/nginx/conf.d/wms.conf
# Add uploads location block
sudo systemctl reload nginx
```

### If Permissions Wrong:
```bash
ssh root@72.60.215.188
chmod 644 /var/www/wms/backend/public/uploads/logos/*.png
chown root:root /var/www/wms/backend/public/uploads/logos/*.png
```

### If URL Still HTTP:
```bash
# Backend should automatically use HTTPS in production
# Check if NODE_ENV is set correctly
ssh root@72.60.215.188 "pm2 show wms-backend | grep NODE_ENV"
```

---

**RUN THESE COMMANDS AND SEND ME THE OUTPUT!** 🔍
