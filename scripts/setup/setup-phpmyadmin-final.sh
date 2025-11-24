#!/bin/bash

echo "🔧 Properly configuring phpMyAdmin with Nginx..."

# Create correct Nginx configuration
cat > /etc/nginx/conf.d/wms.conf << 'EOF'
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name 72.60.215.188;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name 72.60.215.188;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/wms.crt;
    ssl_certificate_key /etc/nginx/ssl/wms.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        root /var/www/wms/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # phpMyAdmin
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
}
EOF

echo "✅ Nginx configuration created"

# Test and restart Nginx
echo "🔄 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl restart nginx
    echo "✅ Nginx restarted successfully"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Ensure PHP-FPM is running
systemctl enable php-fpm
systemctl restart php-fpm
echo "✅ PHP-FPM restarted"

# Set correct permissions
chown -R nginx:nginx /usr/share/phpMyAdmin
chmod -R 755 /usr/share/phpMyAdmin
mkdir -p /var/lib/phpMyAdmin/{upload,save,tmp}
chown -R nginx:nginx /var/lib/phpMyAdmin
chmod 755 /var/lib/phpMyAdmin/{upload,save,tmp}

# Update PHP-FPM to run as nginx user
sed -i 's/^user = apache/user = nginx/' /etc/php-fpm.d/www.conf
sed -i 's/^group = apache/group = nginx/' /etc/php-fpm.d/www.conf
systemctl restart php-fpm

echo ""
echo "✅ phpMyAdmin is now accessible!"
echo ""
echo "📝 Access Information:"
echo "   URL: https://72.60.215.188/phpmyadmin"
echo ""
echo "🔑 Login Credentials:"
echo "   Username: wms_user"
echo "   Password: WmsSecure2024Pass"
echo "   Database: wms_production"
echo ""
echo "✅ Everything running on same HTTPS domain:"
echo "   • Main App: https://72.60.215.188"
echo "   • API: https://72.60.215.188/api"
echo "   • phpMyAdmin: https://72.60.215.188/phpmyadmin"
echo ""
