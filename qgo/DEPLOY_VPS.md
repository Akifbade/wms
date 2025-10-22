# VPS Deployment Guide

**VPS Details:**
- Host: 72.60.215.188
- User: root
- Password: Akif@8788881688

## Quick Start - Deploy to VPS

### Step 1: SSH into VPS
```bash
ssh root@72.60.215.188
# Password: Akif@8788881688
```

### Step 2: Clone/Upload Application
```bash
# Option A: If git is available
git clone <your-repo> /app
cd /app

# Option B: Upload via SCP (from your local machine)
scp -r . root@72.60.215.188:/app
```

### Step 3: Install Dependencies
```bash
cd /app
npm install
```

### Step 4: Setup Database (MySQL)
```bash
# Update .env for production
cat > .env << 'EOF'
# Database
DATABASE_URL="mysql://root:your_mysql_password@localhost:3306/qgo_production"
API_PORT=5000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=http://72.60.215.188:3000
EOF

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate -- --name production

# Seed database (optional)
npm run prisma:seed
```

### Step 5: Start Application with PM2
```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start both frontend and backend
pm2 start npm --name "qgo-frontend" -- run dev:client
pm2 start npm --name "qgo-backend" -- run dev:server

# Save PM2 config
pm2 save

# (Optional) Setup startup on reboot
pm2 startup
```

### Step 6: Access Application
- Frontend: http://72.60.215.188:3000
- Backend API: http://72.60.215.188:5000
- API Health: http://72.60.215.188:5000/api/health

### Default Credentials
- Email: admin@qgo.com
- Password: admin123

---

## Docker Deployment (Alternative)

If Docker is available on VPS:

### Step 1: Build and Deploy with Docker
```bash
cd /app

# Build Docker image
docker build -t qgo-app .

# Run with MySQL
docker-compose up -d
```

This will start:
- MySQL on port 3306
- Backend API on port 5000
- Frontend on port 3000

---

## Production Checklist

- [ ] Set strong JWT_SECRET in .env
- [ ] Set strong MySQL password in DATABASE_URL
- [ ] Update FRONTEND_URL to your domain
- [ ] Configure SSL/TLS with Nginx reverse proxy
- [ ] Setup backups for MySQL database
- [ ] Monitor application logs with PM2

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Database Connection Error
```bash
# Check MySQL is running
systemctl status mysql

# Check DATABASE_URL format
cat .env | grep DATABASE_URL
```

### View Logs
```bash
pm2 logs qgo-frontend
pm2 logs qgo-backend
pm2 logs
```

### Restart Application
```bash
pm2 restart all
```

---

## Nginx Reverse Proxy Setup (Optional)

```nginx
upstream backend {
    server localhost:5000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name 72.60.215.188;

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Maintenance

### Stop Application
```bash
pm2 stop all
```

### Restart Application
```bash
pm2 restart all
```

### View Status
```bash
pm2 status
```

### Cleanup
```bash
pm2 delete all
```
