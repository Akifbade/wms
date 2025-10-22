# Local Development Guide - Step by Step

This guide walks you through setting up and running the entire application locally.

## Prerequisites

Before starting, ensure you have:
- **Node.js 18+** - Download from https://nodejs.org
- **MySQL 8.0** - Download from https://dev.mysql.com/downloads/mysql/ OR use Docker
- **Git** (optional but recommended)

## Option 1: Using Docker (Recommended - Easiest)

### Step 1: Extract and Setup

```bash
cd your-project-directory
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="mysql://qgo_user:password@mysql:3306/qgo_cargo"
DB_PASSWORD="password"
DB_USER="qgo_user"
API_PORT=5000
NODE_ENV="development"
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:3000"
```

### Step 3: Start Application

```bash
# Start all services (MySQL, App)
docker-compose up -d

# Check if everything is running
docker-compose ps

# You should see 3-4 services running
```

### Step 4: Initialize Database (First Time Only)

```bash
# Wait 10 seconds for MySQL to be ready, then:
docker-compose exec app npm run prisma:seed

# You should see: "✅ Database seeded successfully!"
```

### Step 5: Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000/api
- **Database Admin**: http://localhost:8080

### Step 6: Login

```
Email: admin@qgo.com
Password: admin123
```

### View Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f mysql

# Stop following logs (Ctrl+C)
```

### Stop Application

```bash
docker-compose down
```

---

## Option 2: Using Local MySQL

### Step 1: Install and Start MySQL

**Windows:**
1. Download MySQL from https://dev.mysql.com/downloads/mysql/
2. Run installer with default settings
3. MySQL will auto-start on reboot

**Mac (with Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Step 2: Create Database and User

```bash
mysql -u root -p
# Enter your MySQL root password

# Create database
CREATE DATABASE qgo_cargo;

# Create user
CREATE USER 'qgo_user'@'localhost' IDENTIFIED BY 'password';

# Grant privileges
GRANT ALL PRIVILEGES ON qgo_cargo.* TO 'qgo_user'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### Step 3: Setup Project

```bash
cd your-project-directory
npm install
```

### Step 4: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL="mysql://qgo_user:password@localhost:3306/qgo_cargo"
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="qgo_user"
DB_PASSWORD="password"
DB_NAME="qgo_cargo"
API_PORT=5000
NODE_ENV="development"
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:3000"
```

### Step 5: Run Migrations and Seed

```bash
# Generate Prisma Client
npm run prisma:generate

# Create tables
npm run prisma:migrate

# Seed data
npm run prisma:seed
```

### Step 6: Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev:client
# Waits for Vite to start on port 3000
```

**Terminal 2 - Backend:**
```bash
npm run dev:server
# Server running on port 5000
```

Or run both together:
```bash
npm run dev:all
```

### Step 7: Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000/api
- **Prisma Studio**: Run `npm run prisma:studio`

### Step 8: Login

```
Email: admin@qgo.com
Password: admin123
```

---

## Common Tasks

### View Database with Prisma Studio

```bash
npm run prisma:studio

# Opens http://localhost:5555
# You can browse and edit data directly
```

### Create New Database User

```bash
mysql -u root -p

CREATE USER 'newuser'@'localhost' IDENTIFIED BY 'newpassword';
GRANT ALL PRIVILEGES ON qgo_cargo.* TO 'newuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Reset Database (⚠️ Deletes All Data)

```bash
npx prisma migrate reset

# or with Docker:
docker-compose exec app npx prisma migrate reset
```

### Create Job File Programmatically

```bash
# 1. Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qgo.com","password":"admin123"}'

# 2. Use token to create job
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jfn": "QGO/A/TEST/01",
    "d": "2024-05-20",
    "sh": "Global Imports",
    "co": "Kuwait Retailers",
    "charges": [{"l":"Freight","c":"100","s":"120","n":""}],
    "totalCost": 100,
    "totalSelling": 120,
    "totalProfit": 20
  }'
```

### Check Database Connection

```bash
# With Docker
docker-compose exec mysql mysql -u qgo_user -p -e "SELECT 1;"

# Local MySQL
mysql -u qgo_user -p -e "SELECT 1;"
```

### View Application Logs

```bash
# With Docker
docker-compose logs -f app

# Frontend errors appear in browser console (F12)
# Backend errors appear in terminal running npm run dev:server
```

### Stop and Remove Everything (Docker)

```bash
docker-compose down
docker volume prune  # Remove data volumes
```

---

## Troubleshooting

### Issue: "Port 3000 already in use"

**Solution 1:** Kill the process
```bash
lsof -i :3000
kill -9 <PID>
```

**Solution 2:** Change the port in `vite.config.ts`
```typescript
server: {
  port: 3001,  // Change to 3001
}
```

### Issue: "Cannot connect to database"

**Checklist:**
- [ ] MySQL is running: `sudo systemctl status mysql` (Linux)
- [ ] DATABASE_URL is correct in `.env` or `.env.local`
- [ ] Database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- [ ] User has permissions: `mysql -u qgo_user -p -e "SELECT 1;"`

### Issue: "Prisma migration failed"

```bash
# Reset to clean state
npx prisma migrate reset

# or step by step
npx prisma migrate status
npx prisma migrate dev --name init
```

### Issue: "EACCES: permission denied"

```bash
# Fix npm permissions
npm install -g npm@latest
sudo chown -R $(whoami) ~/.npm
```

### Issue: "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run prisma:generate
```

### Issue: "API returns 401 Unauthorized"

- Check token is in Authorization header: `Authorization: Bearer {token}`
- Verify token hasn't expired (default 7 days)
- Login again to get a new token

### Issue: Docker containers won't start

```bash
# Check Docker status
docker ps -a

# View logs
docker-compose logs

# Restart Docker
sudo systemctl restart docker

# Try again
docker-compose up -d
```

---

## Development Workflow

### Recommended Setup

1. **Terminal 1** - Backend (npm run dev:server)
2. **Terminal 2** - Frontend (npm run dev:client)
3. **Terminal 3** - Prisma Studio (npm run prisma:studio)
4. **Browser** - Application at http://localhost:3000

### Making Changes

**Backend Changes:**
- Edit files in `server/` directory
- Server auto-restarts (with ts-node)
- Test with API clients (Postman, curl, etc.)

**Frontend Changes:**
- Edit files in `components/` or other React folders
- Browser auto-refreshes (Vite HMR)

**Database Changes:**
- Create migration: `npm run prisma:migrate -- --name feature_name`
- Update queries in `server/` routes
- Restart backend

### Committing Changes

```bash
git add .
git commit -m "feat: description of changes"
git push origin main
```

---

## Performance Tips

1. **Use Prisma Studio** to explore data structure
2. **Check browser DevTools** (F12) for network issues
3. **Monitor API response times** in browser Network tab
4. **Use Docker** for consistent environment
5. **Keep dependencies updated**: `npm audit`

---

## Next Steps

Once you're comfortable with local development:

1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for VPS deployment
2. Review [server/README.md](./server/README.md) for API details
3. Check [VPS_DEPLOYMENT_CHECKLIST.md](./VPS_DEPLOYMENT_CHECKLIST.md) for production

---

## Need Help?

### Resources
- API Docs: [server/README.md](./server/README.md)
- Database: [prisma/schema.prisma](./prisma/schema.prisma)
- Components: [components/](./components/)
- Types: [types.ts](./types.ts)

### Quick Checks
```bash
# System info
npm --version    # Should be 8+
node --version   # Should be 18+
mysql --version  # If using local MySQL

# Application health
curl http://localhost:5000/api/health
curl http://localhost:3000
```

---

**You're all set! Happy coding! 🚀**
