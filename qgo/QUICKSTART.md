# Quick Start Guide

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database

#### Option A: Local MySQL
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE qgo_cargo;"

# Run migrations
npm run prisma:migrate

# Seed data
npm run prisma:seed
```

#### Option B: Docker MySQL
```bash
docker run --name qgo-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=qgo_cargo -p 3306:3306 -d mysql:8.0-alpine

# Wait 30 seconds, then:
npm run prisma:migrate
npm run prisma:seed
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

### 4. Start Development

**Terminal 1 - Frontend:**
```bash
npm run dev:client
# Open http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
npm run dev:server
# API at http://localhost:5000/api
```

Or run both together:
```bash
npm run dev:all
```

### 5. Login
- Email: `admin@qgo.com`
- Password: `admin123`

---

## 🐳 Docker Deployment

### Quick Docker Compose Start

```bash
# Copy example env
cp .env.example .env

# Edit .env with your settings
nano .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Seed database (first time only)
docker-compose exec app npm run prisma:seed
```

**Access:**
- App: http://localhost:3000
- API: http://localhost:5000/api
- DB Admin: http://localhost:8080 (Adminer)

---

## 📊 Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# View database migrations
npm run prisma:migrate status

# Create new migration
npm run prisma:migrate -- --name feature_name
```

---

## 🛠️ Common Commands

```bash
# Build for production
npm run build

# Run production build
npm run start

# Check for updates
npm audit

# Generate Prisma Client
npm run prisma:generate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

---

## 📋 Project Structure

```
.
├── server/                 # Node.js + Express backend
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   └── index.ts          # Main server
├── components/            # React components
├── hooks/                # React hooks
├── services/             # API services
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── types.ts              # TypeScript types
├── App.tsx               # Main React app
└── vite.config.ts        # Vite config
```

---

## 🔐 Security Notes

- Change default passwords immediately
- Generate a strong JWT_SECRET for production
- Use HTTPS in production
- Keep dependencies updated: `npm audit fix`
- Never commit .env files

---

## 🆘 Troubleshooting

**Port 3000/5000 already in use?**
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or change in vite.config.ts
```

**Database connection failed?**
```bash
# Check DATABASE_URL in .env
# Verify MySQL is running
# Check credentials
```

**Migrations failed?**
```bash
# Reset migrations (loses data!)
npx prisma migrate reset

# Or view status
npx prisma migrate status
```

---

For detailed deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)
