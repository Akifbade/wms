# 🚀 Complete Deployment Guide - Dusre PC/VPS Par Setup

## 📋 Table of Contents
1. [Requirements](#requirements)
2. [Method 1: Docker Setup (Recommended)](#method-1-docker-setup-recommended)
3. [Method 2: Local Development Setup](#method-2-local-development-setup)
4. [VPS Deployment](#vps-deployment)
5. [Troubleshooting](#troubleshooting)

---

## ✅ Requirements

### Basic Requirements:
- **Git** installed
- **Docker** & **Docker Compose** installed (for Docker method)
- **Node.js 18+** & **npm** (for local method)
- **MySQL 8.0** (for local method)
- Internet connection (first time ke liye)

---

## 🐳 Method 1: Docker Setup (Recommended)

### Yeh Sabse Easy Hai - Sirf 4 Commands!

### Step 1: Project Clone Karo
```bash
# GitHub se clone karo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Ya existing folder se copy karo
# Pura "NEW START" folder copy karo
```

### Step 2: Environment File Check Karo
```bash
# .env file already hai, check karo:
# Windows PowerShell:
Get-Content .env

# Linux/Mac:
cat .env
```

### Step 3: Docker Containers Start Karo
```bash
# Windows PowerShell:
.\scripts\docker-start.ps1 -Dev

# Linux/Mac:
./scripts/docker-start.sh -Dev
```

### Step 4: Admin User Create Karo
```bash
docker exec wms-backend-dev npx ts-node create-admin.ts
```

### ✅ Done! Access Karo:
- **Frontend:** http://localhost
- **Backend API:** http://localhost:5000
- **Database:** localhost:3307

### 🔑 Login Credentials:
- **Email:** admin@wms.com
- **Password:** admin123

---

## 💻 Method 2: Local Development Setup

### Agar Docker nahi chahiye to yeh follow karo:

### Step 1: Prerequisites Install Karo
```bash
# Node.js 18+ install karo from nodejs.org
# MySQL 8.0 install karo (XAMPP ya standalone)
```

### Step 2: Project Clone Karo
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 3: Database Setup
```sql
-- MySQL mein yeh commands run karo:
CREATE DATABASE warehouse_wms;
CREATE USER 'wms_user'@'localhost' IDENTIFIED BY 'wmspassword123';
GRANT ALL PRIVILEGES ON warehouse_wms.* TO 'wms_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Backend Setup
```bash
cd backend

# Dependencies install karo
npm install

# .env file edit karo (SQLite se MySQL change karo)
# DATABASE_URL="mysql://wms_user:wmspassword123@localhost:3306/warehouse_wms"

# Prisma schema update karo
# Open: backend/prisma/schema.prisma
# Change: provider = "sqlite" TO provider = "mysql"

# Database schema create karo
npx prisma db push

# Admin user create karo
npx ts-node create-admin.ts

# Backend start karo
npm run dev
```

### Step 5: Frontend Setup
```bash
# Naye terminal mein
cd frontend

# Dependencies install karo
npm install

# Frontend start karo
npm run dev
```

### ✅ Access Karo:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## 🌍 VPS Deployment

### Method 1: Automated Script (Easiest)

```bash
# VPS details .env mein dalo:
VPS_HOST=your-server-ip
VPS_USER=root
VPS_PORT=22

# Deploy karo (one command!)
./scripts/vps-deploy.sh
```

### Method 2: Manual VPS Setup

#### 1. VPS mein SSH karo
```bash
ssh root@your-server-ip
```

#### 2. Docker Install Karo
```bash
# Ubuntu/Debian:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose install karo
apt-get install docker-compose-plugin
```

#### 3. Project Upload Karo
```bash
# Local machine se:
scp -r "NEW START" root@your-server-ip:/var/www/wms

# Ya git se:
ssh root@your-server-ip
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git wms
cd wms
```

#### 4. Production Start Karo
```bash
# VPS par:
cd /var/www/wms

# Environment variables set karo
nano .env
# Set proper values for production

# Production mode mein start karo
docker-compose up -d

# Admin user create karo
docker exec wms-backend npx ts-node create-admin.ts
```

#### 5. Domain Setup (Optional)
```bash
# Nginx reverse proxy setup (already configured)
# Just domain point karo to VPS IP
# Access: http://your-domain.com
```

---

## 📦 Sirf Yeh Files Chahiye Deploy Karne Ke Liye

### Essential Files/Folders:
```
📁 Project Root
├── 📁 backend/              # Complete backend folder
├── 📁 frontend/             # Complete frontend folder
├── 📁 scripts/              # Deployment scripts
├── 📁 nginx/                # Nginx config
├── .env                     # Environment variables
├── .env.docker              # Docker environment
├── docker-compose.yml       # Production config
├── docker-compose.dev.yml   # Development config
└── README.md                # Documentation
```

### Files You DON'T Need:
```
❌ node_modules/             # Will be installed automatically
❌ .git/                     # Optional (only if using git)
❌ backend/dev.db            # SQLite file (not used in Docker)
❌ backend/uploads/          # User uploaded files (backup separately)
❌ *.log files               # Log files
```

### Minimum Required Size:
- Without node_modules: ~50MB
- With node_modules: ~500MB
- Full deployment ready: ~550MB

---

## 🔧 Troubleshooting

### Problem 1: Port Already in Use
```bash
# Windows:
netstat -ano | findstr :80
netstat -ano | findstr :5000
netstat -ano | findstr :3307

# Kill process:
taskkill /PID <PID_NUMBER> /F

# Linux:
sudo lsof -ti:80 | xargs kill -9
sudo lsof -ti:5000 | xargs kill -9
sudo lsof -ti:3307 | xargs kill -9
```

### Problem 2: Docker Containers Not Starting
```bash
# Logs check karo:
docker-compose -f docker-compose.dev.yml logs

# Specific container:
docker logs wms-backend-dev

# Restart karo:
docker-compose -f docker-compose.dev.yml restart
```

### Problem 3: 403/401 Authentication Error
```bash
# Browser console mein:
localStorage.clear()

# Page refresh karo aur phir se login karo
```

### Problem 4: Database Connection Error
```bash
# Database container check karo:
docker ps | grep mysql

# Database accessible hai check karo:
docker exec wms-database-dev mysql -uroot -prootpassword123 -e "SHOW DATABASES;"

# Re-create admin user:
docker exec wms-backend-dev npx ts-node create-admin.ts
```

### Problem 5: Frontend 500 Error
```bash
# Backend logs dekho:
docker logs wms-backend-dev --tail=50

# Frontend rebuild karo:
docker-compose -f docker-compose.dev.yml up -d --build frontend
```

---

## 📝 Quick Commands Cheat Sheet

### Docker Commands:
```bash
# Start all containers
docker-compose -f docker-compose.dev.yml up -d

# Stop all containers
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart specific container
docker-compose -f docker-compose.dev.yml restart backend

# Rebuild container
docker-compose -f docker-compose.dev.yml up -d --build backend

# Check status
docker ps

# Execute command in container
docker exec -it wms-backend-dev sh
```

### Database Commands:
```bash
# Access MySQL
docker exec -it wms-database-dev mysql -uroot -prootpassword123

# Backup database
docker exec wms-database-dev mysqldump -uroot -prootpassword123 warehouse_wms > backup.sql

# Restore database
docker exec -i wms-database-dev mysql -uroot -prootpassword123 warehouse_wms < backup.sql

# Create admin user
docker exec wms-backend-dev npx ts-node create-admin.ts
```

### Git Commands:
```bash
# Clone repository
git clone <repository-url>

# Check status
git status

# View commits
git log --oneline -10

# Pull latest changes
git pull origin master

# Create branch
git checkout -b feature-name
```

---

## 🎯 Summary - Quick Start (Dusre PC Par)

### Option A: Docker (5 Minutes)
```bash
1. git clone <repo>
2. cd project
3. .\scripts\docker-start.ps1 -Dev
4. docker exec wms-backend-dev npx ts-node create-admin.ts
5. Open: http://localhost
```

### Option B: Local (10 Minutes)
```bash
1. Install Node.js + MySQL
2. git clone <repo>
3. cd backend && npm install
4. Setup MySQL database
5. npx prisma db push
6. npx ts-node create-admin.ts
7. npm run dev (backend)
8. cd ../frontend && npm install && npm run dev
9. Open: http://localhost:3000
```

---

## 📧 Support

Agar koi problem aaye to:
1. Logs check karo (`docker logs`)
2. Troubleshooting section dekho
3. GitHub issues create karo

---

**Made with ❤️ for easy deployment anywhere!**
