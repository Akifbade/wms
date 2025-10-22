#!/bin/bash

echo "🔧 Installing phpMyAdmin on VPS..."

# Install phpMyAdmin
echo "📦 Installing phpMyAdmin package..."
yum install -y phpMyAdmin

if [ $? -ne 0 ]; then
    echo "❌ Failed to install phpMyAdmin"
    exit 1
fi

echo "✅ phpMyAdmin installed"

# Configure phpMyAdmin for remote access
echo "🔧 Configuring phpMyAdmin..."

# Backup original config
cp /etc/httpd/conf.d/phpMyAdmin.conf /etc/httpd/conf.d/phpMyAdmin.conf.backup

# Create new configuration allowing all IPs
cat > /etc/httpd/conf.d/phpMyAdmin.conf << 'EOF'
# phpMyAdmin - Web based MySQL browser written in php
# 
# Allows only localhost by default
#
# But allowing remote connections for development

Alias /phpmyadmin /usr/share/phpMyAdmin
Alias /phpMyAdmin /usr/share/phpMyAdmin
Alias /PHPMyAdmin /usr/share/phpMyAdmin

<Directory /usr/share/phpMyAdmin/>
   AddDefaultCharset UTF-8

   <IfModule mod_authz_core.c>
     # Apache 2.4
     Require all granted
   </IfModule>
   <IfModule !mod_authz_core.c>
     # Apache 2.2
     Order Deny,Allow
     Allow from All
   </IfModule>
</Directory>

<Directory /usr/share/phpMyAdmin/setup/>
   <IfModule mod_authz_core.c>
     # Apache 2.4
     Require all granted
   </IfModule>
   <IfModule !mod_authz_core.c>
     # Apache 2.2
     Order Deny,Allow
     Allow from All
   </IfModule>
</Directory>
EOF

echo "✅ phpMyAdmin configuration updated"

# Start Apache/httpd
echo "🔄 Starting Apache web server..."
systemctl enable httpd
systemctl start httpd

if [ $? -eq 0 ]; then
    echo "✅ Apache started successfully"
else
    echo "⚠️  Apache may already be running or conflicting with Nginx"
fi

# Open firewall for HTTP (port 80) if not already open
echo "🔥 Ensuring firewall allows HTTP..."
firewall-cmd --permanent --add-service=http
firewall-cmd --reload

echo "✅ Firewall configured"

# Create phpMyAdmin config
echo "🔧 Creating phpMyAdmin config..."
cat > /etc/phpMyAdmin/config.inc.php << 'EOF'
<?php
/**
 * phpMyAdmin configuration file
 */

/* Servers configuration */
$i = 0;

/* Server: localhost [1] */
$i++;
$cfg['Servers'][$i]['verbose'] = 'WMS Production Database';
$cfg['Servers'][$i]['host'] = 'localhost';
$cfg['Servers'][$i]['port'] = '3306';
$cfg['Servers'][$i]['socket'] = '';
$cfg['Servers'][$i]['connect_type'] = 'tcp';
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['user'] = '';
$cfg['Servers'][$i]['password'] = '';
$cfg['Servers'][$i]['AllowNoPassword'] = false;

/* End of servers configuration */

$cfg['blowfish_secret'] = 'WmsSecureBlowfishSecret2024!@#$%^&*()';
$cfg['DefaultLang'] = 'en';
$cfg['ServerDefault'] = 1;
$cfg['UploadDir'] = '/var/lib/phpMyAdmin/upload';
$cfg['SaveDir'] = '/var/lib/phpMyAdmin/save';
$cfg['LoginCookieValidity'] = 1440;

/* Disable warnings about PHP version */
$cfg['PmaNoRelation_DisableWarning'] = true;
$cfg['SuhosinDisableWarning'] = true;
$cfg['LoginCookieValidityDisableWarning'] = true;
?>
EOF

echo "✅ phpMyAdmin config created"

# Create upload/save directories
mkdir -p /var/lib/phpMyAdmin/{upload,save}
chown -R apache:apache /var/lib/phpMyAdmin
chmod 755 /var/lib/phpMyAdmin/{upload,save}

echo ""
echo "✅ phpMyAdmin installation complete!"
echo ""
echo "📝 Access Information:"
echo "   URL: http://72.60.215.188/phpmyadmin"
echo "   (Note: Use HTTP, not HTTPS for phpMyAdmin)"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: wms_user"
echo "   Password: WmsSecure2024Pass"
echo "   Database: wms_production"
echo ""
echo "⚠️  IMPORTANT: Apache is now running on port 80"
echo "   This may conflict with Nginx if both serve on port 80"
echo "   Your main app is on HTTPS (443) via Nginx, so should be OK"
echo ""
echo "🔧 Commands:"
echo "   Restart Apache: systemctl restart httpd"
echo "   Check status: systemctl status httpd"
echo "   View logs: tail -f /var/log/httpd/error_log"
echo ""
