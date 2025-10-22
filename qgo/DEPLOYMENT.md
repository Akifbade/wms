# QGO Job File Management System - Deployment Guide

## Overview
This is a full-stack application with:
- **Frontend**: React 19 + Vite (port 3000)
- **Backend**: Node.js + Express (port 5000)
- **Database**: MySQL 8.0
- **ORM**: Prisma

## Prerequisites

### Local Development
- Node.js 18+ and npm
- MySQL 8.0 (local) or Docker
- Git

### VPS Deployment
- Ubuntu 20.04+ or similar
- Docker and Docker Compose
- 2GB+ RAM minimum
- 10GB+ storage

---

## Local Development Setup

### 1. Clone and Install

```bash
cd your-project-directory
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and update:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL="mysql://root:password@localhost:3306/qgo_cargo"
JWT_SECRET="your-secret-key-here"
GEMINI_API_KEY="your-gemini-api-key"
FRONTEND_URL="http://localhost:3000"
```

### 3. Setup Database

For local MySQL:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE qgo_cargo;"

# Run Prisma migrations
npm run prisma:migrate

# Seed database (creates default users)
npm run prisma:seed
```

For Docker MySQL:

```bash
# Start MySQL in Docker
docker run --name qgo-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=qgo_cargo \
  -p 3306:3306 \
  -d mysql:8.0-alpine

# Wait a few seconds, then run migrations
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Development Servers

**Option A: Run client and server separately**

Terminal 1 (Frontend):
```bash
npm run dev:client
# Frontend available at http://localhost:3000
```

Terminal 2 (Backend):
```bash
npm run dev:server
# API available at http://localhost:5000/api
```

**Option B: Run both concurrently**

```bash
npm run dev:all
# Frontend: http://localhost:3000
# API: http://localhost:5000/api
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000/api
- **Database Studio**: `npm run prisma:studio`

### Default Credentials

| Role   | Email          | Password  |
|--------|----------------|-----------|
| Admin  | admin@qgo.com  | admin123  |
| User   | user@qgo.com   | password  |
| Checker| checker@qgo.com| password  |

---

## VPS Deployment with Docker

### 1. Prerequisites on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group (optional)
sudo usermod -aG docker $USER
```

### 2. Upload Application

```bash
# From your local machine
scp -r . user@vps-ip:/home/user/qgo-app

# Or use Git
git clone your-repo-url /home/user/qgo-app
```

### 3. Configure Environment

```bash
cd /home/user/qgo-app

# Create .env file from example
cp .env.example .env

# Edit .env with production values
nano .env
```

Update these values in `.env`:

```
DATABASE_URL="mysql://qgo_user:secure_password@mysql:3306/qgo_cargo"
DB_PASSWORD="secure_password"
DB_USER="qgo_user"
API_PORT=5000
NODE_ENV="production"
JWT_SECRET="your-very-secure-random-secret-key-here"
FRONTEND_URL="https://yourdomain.com"
GEMINI_API_KEY="your-api-key"
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Deploy with Docker Compose

```bash
# Build and start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Seed database (first time only)
docker-compose exec app npm run prisma:seed
```

### 5. Set Up Nginx Reverse Proxy (Recommended)

Create `/etc/nginx/sites-available/qgo`:

```nginx
upstream app_backend {
    server localhost:5000;
}

upstream app_frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # API requests
    location /api/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        proxy_pass http://app_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable Nginx site:
```bash
sudo ln -s /etc/nginx/sites-available/qgo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Backup Strategy

```bash
# Backup database
docker-compose exec mysql mysqldump -u qgo_user -p qgo_cargo > backup-$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v qgo-mysql_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mysql-backup-$(date +%Y%m%d).tar.gz /data

# Create automated backup script
cat > /home/user/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups"
mkdir -p $BACKUP_DIR
cd /home/user/qgo-app

# Database backup
docker-compose exec -T mysql mysqldump -u qgo_user -pPASSWORD qgo_cargo > \
  $BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db-*.sql" -mtime +7 -delete
EOF

chmod +x /home/user/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/user/backup.sh
```

### 8. Monitoring and Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f mysql

# Check resource usage
docker stats

# Health check endpoint
curl http://localhost:5000/api/health
```

### 9. Updating Application

```bash
cd /home/user/qgo-app

# Pull latest code
git pull origin main

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Run migrations if schema changed
docker-compose exec app npm run prisma:migrate:deploy
```

### 10. Database Access

**Via Adminer (included in docker-compose)**:
- URL: http://vps-ip:8080
- Server: mysql
- Username: qgo_user
- Password: (from .env)
- Database: qgo_cargo

**Via CLI**:
```bash
docker-compose exec mysql mysql -u qgo_user -p qgo_cargo
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check if MySQL is running
docker-compose ps

# Restart MySQL
docker-compose restart mysql

# Check database URL in .env
cat .env | grep DATABASE_URL
```

### Migrations Failed

```bash
# View migration status
docker-compose exec app npm run prisma:migrate status

# Create new migration
docker-compose exec app npm run prisma:migrate -- --name migration_name

# Reset database (caution!)
docker-compose exec app npx prisma migrate reset
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a
docker volume prune

# View Docker images size
docker images --format "table {{.Repository}}\t{{.Size}}"
```

---

## API Documentation

### Authentication Endpoints

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@qgo.com",
  "password": "admin123"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "uid": "admin-1",
    "email": "admin@qgo.com",
    "displayName": "Admin User",
    "role": "admin",
    "status": "active"
  }
}
```

**Register**
```bash
POST /api/auth/register
```

**Get Current User**
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Jobs Endpoints

**Get All Jobs**
```bash
GET /api/jobs?status=approved&skip=0&take=20
Authorization: Bearer <token>
```

**Get Job by ID**
```bash
GET /api/jobs/:id
Authorization: Bearer <token>
```

**Create Job**
```bash
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{ ...job data... }
```

**Approve Job**
```bash
POST /api/jobs/:id/approve
Authorization: Bearer <token>
```

**Reject Job**
```bash
POST /api/jobs/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{ "reason": "Reason for rejection" }
```

### Clients Endpoints

**Get All Clients**
```bash
GET /api/clients
Authorization: Bearer <token>
```

**Create Client**
```bash
POST /api/clients
Authorization: Bearer <token>
```

### Dashboard Stats

**Get Summary**
```bash
GET /api/stats/dashboard/summary
Authorization: Bearer <token>
```

---

## Performance Optimization

### 1. Database Indexing
Already implemented in schema.prisma on key fields: email, role, status, jfn, etc.

### 2. Caching
Add Redis for session/cache (future enhancement):
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 3. Load Balancing
For multiple app instances, use docker-compose override with multiple app services.

### 4. Database Backups
Automated daily backups recommended (see Backup Strategy section).

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable database authentication
- [ ] Regular backups configured
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Use environment variables for secrets
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerts
- [ ] Regular security audits

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this guide's Troubleshooting section
3. Check Prisma documentation: https://www.prisma.io/docs
4. Check Express documentation: https://expressjs.com

---

**Last Updated**: October 20, 2025
