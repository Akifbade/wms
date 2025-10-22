<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# QGO Job File Management System

A comprehensive full-stack application for managing job files, deliveries, and client interactions with role-based access control, real-time analytics, and professional POD (Proof of Delivery) management.

**Status**: ✅ **Production Ready** - Full-stack with Node.js + MySQL + Prisma

## 🚀 Key Features

- ✅ **Authentication & Authorization** - JWT-based with role-based access control (Admin, User, Checker, Driver)
- ✅ **Job Management** - Complete workflow (Create → Check → Approve)
- ✅ **Client Management** - Shipper and Consignee management
- ✅ **POD System** - Proof of Delivery with signatures and geolocation
- ✅ **Analytics Dashboard** - Real-time job statistics and metrics
- ✅ **User Management** - Multi-role user system with permissions
- ✅ **Feedback System** - Customer feedback and ratings
- ✅ **Docker Ready** - One-command deployment
- ✅ **Database Migrations** - Automated schema management with Prisma
- ✅ **Responsive UI** - React 19 with modern styling

## 📋 Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Chart.js** - Analytics visualizations

### Backend
- **Node.js + Express** - Server framework
- **Prisma** - Database ORM
- **MySQL 8.0** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### DevOps
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy (optional)
- **Let's Encrypt** - SSL certificates

## 🏃 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- MySQL 8.0 (or Docker)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your database credentials

# 3. Setup database
npm run prisma:migrate
npm run prisma:seed

# 4. Run development servers
npm run dev:all

# Or run separately:
# Terminal 1: npm run dev:client  (Frontend on port 3000)
# Terminal 2: npm run dev:server  (Backend on port 5000)
```

**Access the app:**
- Frontend: http://localhost:3000
- API: http://localhost:5000/api
- Database Studio: `npm run prisma:studio`

**Default Credentials:**
- Email: `admin@qgo.com` / Password: `admin123`

### Docker Deployment

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Start all services
docker-compose up -d

# 3. Seed database (first time only)
docker-compose exec app npm run prisma:seed

# Access the app at http://localhost:3000
```

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete VPS deployment guide
- **[SETUP_SUMMARY.md](./SETUP_SUMMARY.md)** - Detailed setup summary
- **[server/README.md](./server/README.md)** - API documentation

## 🗂️ Project Structure

```
project/
├── server/                    # Node.js backend
│   ├── index.ts              # Express server entry
│   ├── middleware/           # Authentication middleware
│   └── routes/               # API routes
├── components/               # React components
├── hooks/                    # React hooks
├── services/                 # API services & utilities
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts              # Database seed
│   └── migrations/          # Auto-generated migrations
├── types.ts                 # TypeScript type definitions
├── App.tsx                  # Main React component
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── Dockerfile               # Docker image
├── docker-compose.yml       # Docker services
├── .env.example             # Environment template
├── DEPLOYMENT.md            # Deployment guide
├── QUICKSTART.md            # Quick start guide
└── README.md               # This file
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - Login
GET    /api/auth/me           - Get current user
POST   /api/auth/verify       - Verify token
```

### Jobs
```
GET    /api/jobs              - List jobs (with filters)
GET    /api/jobs/:id          - Get job details
POST   /api/jobs              - Create job
PUT    /api/jobs/:id          - Update job
POST   /api/jobs/:id/check    - Check job (checker)
POST   /api/jobs/:id/approve  - Approve job (admin)
POST   /api/jobs/:id/reject   - Reject job
DELETE /api/jobs/:id          - Delete job (admin)
```

### Users (Admin)
```
GET    /api/users             - List all users
POST   /api/users             - Create user
PUT    /api/users/:id         - Update user
DELETE /api/users/:id         - Delete user
```

### Clients
```
GET    /api/clients           - List clients
POST   /api/clients           - Create client
PUT    /api/clients/:id       - Update client
DELETE /api/clients/:id       - Delete client
```

### Dashboard
```
GET    /api/stats/dashboard/summary  - Summary stats
GET    /api/stats/jobs/by-status     - Jobs by status
GET    /api/stats/activity/recent    - Recent activity
```

See [server/README.md](./server/README.md) for complete API documentation.

## 🗄️ Database Schema

Core models:
- **User** - Application users with roles (admin, user, checker, driver)
- **JobFile** - Job records with workflow status
- **Charge** - Charges associated with jobs
- **Client** - Customer information (Shippers, Consignees)
- **Feedback** - User feedback and ratings
- **AppSetting** - Application configuration
- **CustomLink** - Custom URLs

See `prisma/schema.prisma` for detailed schema.

## 🔐 Role-Based Access Control

| Feature | Admin | Checker | User | Driver |
|---------|-------|---------|------|--------|
| Create Job | ✓ | ✓ | ✓ | ✗ |
| Edit Job | ✓ | ✓ | ✓ | ✗ |
| Delete Job | ✓ | ✗ | ✗ | ✗ |
| Check Job | ✓ | ✓ | ✗ | ✗ |
| Approve Job | ✓ | ✗ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Analytics | ✓ | ✓ | ✗ | ✗ |
| Manage Settings | ✓ | ✗ | ✗ | ✗ |

## 🛠️ Commands

```bash
# Development
npm run dev:client           # Frontend only
npm run dev:server          # Backend only
npm run dev:all             # Frontend + Backend

# Build & Production
npm run build               # Build client + server
npm run start               # Run production build
npm run preview             # Preview production build

# Database
npm run prisma:generate     # Generate Prisma Client
npm run prisma:migrate      # Create/apply migrations
npm run prisma:migrate:deploy  # Deploy migrations (production)
npm run prisma:studio       # Open Prisma Studio UI
npm run prisma:seed         # Seed database

# Docker
docker-compose up -d        # Start services
docker-compose down         # Stop services
docker-compose logs -f app  # View logs
```

## 🌍 Environment Variables

Create `.env` or `.env.local`:

```
# Database
DATABASE_URL="mysql://user:password@localhost:3306/qgo_cargo"
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD="password"
DB_NAME="qgo_cargo"

# API
API_PORT=5000
NODE_ENV="development"

# Security
JWT_SECRET="your-secure-random-secret"
JWT_EXPIRY="7d"

# Frontend
FRONTEND_URL="http://localhost:3000"
VITE_API_URL="http://localhost:5000/api"

# APIs
GEMINI_API_KEY="your-api-key"
```

## 📦 Installation

### From Source

```bash
# Clone repository
git clone <repository-url> qgo-app
cd qgo-app

# Install dependencies
npm install

# Setup database
npm run prisma:migrate
npm run prisma:seed

# Run development
npm run dev:all
```

### With Docker

```bash
docker-compose up -d
docker-compose exec app npm run prisma:seed
```

## 🚀 Production Deployment

### VPS Deployment (Ubuntu/Debian)

1. **Prerequisites**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install docker.io docker-compose -y
   ```

2. **Deploy Application**
   ```bash
   git clone <repo> /home/user/qgo-app
   cd /home/user/qgo-app
   cp .env.example .env
   # Edit .env with production values
   docker-compose up -d
   docker-compose exec app npm run prisma:seed
   ```

3. **Setup Nginx Reverse Proxy**
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup

4. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot certonly --nginx -d yourdomain.com
   ```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed VPS deployment instructions.

## 🔍 Monitoring & Troubleshooting

```bash
# View logs
docker-compose logs -f app
docker-compose logs -f mysql

# Check health
curl http://localhost:5000/api/health

# Database access
docker-compose exec mysql mysql -u root -p qgo_cargo

# Reset database (⚠️ deletes data)
npx prisma migrate reset
docker-compose exec app npx prisma migrate reset
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

This project is proprietary software.

## 📞 Support

- Documentation: See `DEPLOYMENT.md` and `server/README.md`
- Issues: Check existing documentation first
- Database: See `prisma/schema.prisma`

## ✨ What's New

**Version 1.0.0** (Production Ready)
- ✅ Full-stack architecture with Node.js backend
- ✅ MySQL database with Prisma ORM
- ✅ Complete API with role-based access control
- ✅ Docker deployment ready
- ✅ Comprehensive documentation
- ✅ Prisma migrations and seeding
- ✅ JWT authentication
- ✅ Dashboard statistics

---

**Ready to deploy!** Start with [QUICKSTART.md](./QUICKSTART.md)
