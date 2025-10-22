#!/bin/bash

echo "🔧 Setting up remote MySQL access..."

# Grant remote access to wms_user
mysql -u root << 'EOF'
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'%' IDENTIFIED BY 'WmsSecure2024Pass';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo "✅ MySQL user granted remote access"
else
    echo "❌ Failed to grant MySQL access"
    exit 1
fi

# Configure MySQL to listen on all interfaces
echo "🔧 Configuring MySQL to accept remote connections..."
if grep -q "bind-address" /etc/my.cnf.d/mariadb-server.cnf; then
    sed -i 's/^bind-address.*/bind-address = 0.0.0.0/' /etc/my.cnf.d/mariadb-server.cnf
    echo "✅ MySQL bind-address updated"
else
    echo "[mysqld]" >> /etc/my.cnf.d/mariadb-server.cnf
    echo "bind-address = 0.0.0.0" >> /etc/my.cnf.d/mariadb-server.cnf
    echo "✅ MySQL bind-address added"
fi

# Restart MySQL
echo "🔄 Restarting MySQL..."
systemctl restart mariadb
if [ $? -eq 0 ]; then
    echo "✅ MySQL restarted successfully"
else
    echo "❌ Failed to restart MySQL"
    exit 1
fi

# Open firewall port 3306
echo "🔥 Opening firewall port 3306..."
firewall-cmd --permanent --add-port=3306/tcp
firewall-cmd --reload
if [ $? -eq 0 ]; then
    echo "✅ Firewall port 3306 opened"
else
    echo "⚠️  Firewall configuration may have failed (check manually)"
fi

# Verify MySQL is listening on all interfaces
echo ""
echo "📊 MySQL Status:"
ss -tulpn | grep 3306

echo ""
echo "✅ Remote MySQL access setup complete!"
echo ""
echo "📝 Connection Details:"
echo "   Host: 72.60.215.188"
echo "   Port: 3306"
echo "   Database: wms_production"
echo "   Username: wms_user"
echo "   Password: WmsSecure2024Pass"
echo ""
echo "🔧 You can now connect using:"
echo "   - MySQL Workbench"
echo "   - DBeaver"
echo "   - Prisma Studio"
echo "   - Any MySQL client"
