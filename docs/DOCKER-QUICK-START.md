# 🚀 Quick Start - Docker Edition

Get your WMS running in Docker in 2 minutes!

## ⚡ Super Quick Start

### Windows

```powershell
# 1. Copy environment file
Copy-Item .env.docker .env

# 2. Start everything
.\scripts\docker-start.ps1 -Dev

# 3. Open browser
start http://localhost:3000
```

**Done! Your app is running** 🎉

---

## 🎯 What's Running?

| Service | URL | Port |
|---------|-----|------|
| **Frontend** | http://localhost:3000 | 3000 |
| **Backend API** | http://localhost:5000 | 5000 |
| **Database** | localhost | 3306 |
| **Auto Git Commits** | - | - |

---

## 📝 Common Commands

### Start/Stop

```powershell
# Start development
.\scripts\docker-start.ps1 -Dev

# Stop development
.\scripts\docker-stop.ps1 -Dev

# Restart
.\scripts\docker-stop.ps1 -Dev
.\scripts\docker-start.ps1 -Dev
```

### View Logs

```powershell
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Just backend
docker logs -f wms-backend-dev

# Just frontend
docker logs -f wms-frontend-dev
```

### Database

```powershell
# Access MySQL
docker exec -it wms-database-dev mysql -u root -p
# Password: rootpassword

# Backup database
.\scripts\backup.ps1
```

### Auto Git Commits

```powershell
# View commit logs
docker logs -f wms-git-watcher-dev

# See recent commits
git log --oneline -10
```

---

## 🔧 Troubleshooting

### "Docker is not running"
```powershell
# Start Docker Desktop and wait 30 seconds
```

### "Port already in use"
```powershell
# Edit .env and change ports
FRONTEND_PORT=3001
BACKEND_PORT=5001
```

### Reset Everything
```powershell
# Nuclear option - removes all data
.\scripts\docker-stop.ps1 -Dev -Clean
.\scripts\docker-start.ps1 -Dev -Build
```

---

## 📚 Full Documentation

See [DOCKER-SETUP-GUIDE.md](DOCKER-SETUP-GUIDE.md) for:
- ✅ Production deployment
- ✅ VPS setup
- ✅ SSL configuration
- ✅ Advanced troubleshooting

---

## 🎨 Default Login

```
Username: admin@example.com
Password: password123
```

**⚠️ Change this immediately in production!**

---

**Need help?** Check logs: `docker-compose -f docker-compose.dev.yml logs -f`
