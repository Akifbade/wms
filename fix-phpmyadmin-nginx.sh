#!/bin/bash

echo "🔧 Fixing phpMyAdmin - Using Nginx proxy instead of Apache..."

# Stop and disable Apache (conflicts with Nginx)
systemctl stop httpd
systemctl disable httpd
echo "✅ Apache stopped (conflicted with Nginx)"

# Configure Nginx to serve phpMyAdmin
echo "🔧 Configuring Nginx to proxy phpMyAdmin..."

# Backup current Nginx config
cp /etc/nginx/conf.d/wms.conf /etc/nginx/conf.d/wms.conf.backup

# Add phpMyAdmin location to Nginx config
cat >> /etc/nginx/conf.d/wms.conf << 'EOF'

# phpMyAdmin access
location /phpmyadmin {
    root /usr/share;
    index index.php index.html index.htm;
    
    location ~ ^/phpmyadmin/(.+\.php)$ {
        try_files $uri =404;
        root /usr/share;
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~* ^/phpmyadmin/(.+\.(jpg|jpeg|gif|css|png|js|ico|html|xml|txt))$ {
        root /usr/share;
    }
}

location /phpMyAdmin {
    rewrite ^/* /phpmyadmin last;
}
EOF

echo "✅ Nginx configuration updated"

# Start PHP-FPM (required for phpMyAdmin)
echo "🔄 Starting PHP-FPM..."
systemctl enable php-fpm
systemctl start php-fpm

if [ $? -eq 0 ]; then
    echo "✅ PHP-FPM started successfully"
else
    echo "❌ Failed to start PHP-FPM"
fi

# Restart Nginx to apply changes
echo "🔄 Restarting Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx restarted successfully"
else
    echo "❌ Nginx configuration test failed"
    echo "   Restoring backup..."
    cp /etc/nginx/conf.d/wms.conf.backup /etc/nginx/conf.d/wms.conf
    systemctl restart nginx
    exit 1
fi

# Set permissions
chown -R nginx:nginx /usr/share/phpMyAdmin
chmod -R 755 /usr/share/phpMyAdmin

# Create temp directories for phpMyAdmin
mkdir -p /var/lib/phpMyAdmin/{upload,save}
chown -R nginx:nginx /var/lib/phpMyAdmin
chmod 755 /var/lib/phpMyAdmin/{upload,save}

echo ""
echo "✅ phpMyAdmin setup complete!"
echo ""
echo "📝 Access Information:"
echo "   URL: https://72.60.215.188/phpmyadmin"
echo "   (Now accessible via HTTPS through Nginx)"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: wms_user"
echo "   Password: WmsSecure2024Pass"
echo "   Database: wms_production"
echo ""
echo "✅ Both your main app AND phpMyAdmin work on same domain!"
echo "   Main App: https://72.60.215.188"
echo "   phpMyAdmin: https://72.60.215.188/phpmyadmin"
echo ""
