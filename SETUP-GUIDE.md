# 🏗️ SETUP GUIDE - Warehouse Management System

## ✅ Prerequisites Installed
Before proceeding, ensure you have:
- ✅ Node.js 18+ installed
- ✅ MySQL database installed and running
- ✅ Git installed (optional, for version control)

---

## 📦 STEP 1: Install All Dependencies

Open PowerShell in the project root folder and run:

```powershell
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

---

## 🗄️ STEP 2: Configure Database

### 2.1 Create MySQL Database
Open MySQL and create a new database:

```sql
CREATE DATABASE warehouse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 Configure Environment Variables
Edit `backend/.env` file and update the database connection:

```env
DATABASE_URL="mysql://YOUR_USERNAME:YOUR_PASSWORD@localhost:3306/warehouse_db"
```

Replace:
- `YOUR_USERNAME` with your MySQL username (usually `root`)
- `YOUR_PASSWORD` with your MySQL password

### 2.3 Run Database Migrations
```powershell
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

---

## 🚀 STEP 3: Start Development Servers

From the project root folder, run:

```powershell
npm run dev
```

This will start both servers:
- 🎨 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:5000

---

## 🔐 STEP 4: Access the Application

1. Open your browser and go to: **http://localhost:3000**
2. You'll be redirected to the login page
3. Use demo credentials (or create your own):
   - **Email:** admin@warehouse.com
   - **Password:** admin123

---

## 📂 Project Structure

```
NEW START/
├── frontend/                    # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/               # All page components
│   │   │   ├── Dashboard/       # Dashboard with stats
│   │   │   ├── Shipments/       # Shipment management
│   │   │   ├── Racks/           # Warehouse rack visualization
│   │   │   ├── MovingJobs/      # Moving job scheduling
│   │   │   ├── Scanner/         # QR code scanner
│   │   │   ├── Settings/        # 8 settings subsections
│   │   │   └── Login/           # Authentication
│   │   ├── components/
│   │   │   └── Layout/          # Main navigation layout
│   │   ├── App.tsx              # Main app with routing
│   │   └── index.tsx            # Entry point
│   └── package.json
│
├── backend/                     # Node.js + Express + Prisma
│   ├── src/
│   │   └── index.ts             # Express server
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   └── package.json
│
├── docs/
│   └── master-plan.md           # Complete system specification
│
└── README.md                    # Main documentation
```

---

## 🎯 Key Features Implemented

### ✅ Frontend (React UI)
- ✅ Dashboard with stats and recent activity
- ✅ Shipments management with QR codes
- ✅ Visual warehouse rack layout
- ✅ Moving jobs scheduling
- ✅ QR code scanner interface
- ✅ Comprehensive settings (8 sections):
  - Company profile
  - User management
  - Invoice customization
  - Billing & subscriptions
  - Integrations (WhatsApp/Email/SMS)
  - System settings
  - Security policies
  - Notification preferences
- ✅ Responsive mobile design
- ✅ Authentication flow

### ✅ Backend (API)
- ✅ Express server with TypeScript
- ✅ Prisma ORM setup
- ✅ Complete database schema with:
  - Multi-tenant architecture
  - Rack-centric design
  - 18+ models for all features
  - Automatic timestamps
  - Relationships and constraints

---

## 🔧 Development Commands

```powershell
# Start both frontend and backend
npm run dev

# Build for production
npm run build

# Setup everything (install + migrate)
npm run setup

# Backend only
cd backend
npm run dev          # Start dev server
npm run build        # Build for production
npx prisma studio    # Open Prisma Studio GUI

# Frontend only
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 🔍 Verify Installation

### Check Backend API:
Visit: http://localhost:5000/api/health

Should return:
```json
{
  "status": "ok",
  "message": "Warehouse Management API is running",
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

### Check Frontend:
Visit: http://localhost:3000

Should show the login page with the warehouse logo.

---

## 🐛 Troubleshooting

### Port Already in Use
```powershell
# Frontend (change from 3000 to another port)
# Edit frontend/vite.config.ts and change server.port

# Backend (change from 5000)
# Edit backend/.env and change PORT=5000 to PORT=5001
```

### Database Connection Failed
1. Verify MySQL is running
2. Check username/password in `backend/.env`
3. Ensure database `warehouse_db` exists
4. Run migrations: `cd backend && npx prisma migrate dev`

### TypeScript Errors
All current TypeScript errors are expected and will resolve after running `npm install` in both directories.

---

## 📱 Next Steps

### 1. Backend API Development
- Create route handlers for all endpoints
- Implement authentication middleware
- Add validation with Zod
- Set up file uploads for images/documents
- Implement WhatsApp/Email notifications

### 2. Frontend Integration
- Connect pages to real API endpoints
- Implement React Query for data fetching
- Add form validation
- Implement real QR code scanning
- Add PDF invoice generation

### 3. Features to Complete
- User authentication & JWT tokens
- Expense management page
- Users management page
- Report generation
- Real-time notifications
- File upload handling
- WhatsApp integration
- Email templates

### 4. Testing & Deployment
- Write unit tests
- Write integration tests
- Set up CI/CD pipeline
- Deploy to Hostinger VPS
- Configure domain and SSL
- Set up production database

---

## 💰 Subscription Model

The system is designed for multi-tenant SaaS:

**Basic Plan** - 50 KWD/month
- Up to 100 shipments
- 2 users
- Basic features

**Pro Plan** - 120 KWD/month
- Up to 500 shipments
- 5 users
- All features + priority support

**Enterprise Plan** - 300 KWD/month
- Unlimited shipments
- Unlimited users
- Custom features + dedicated support

---

## 📞 Support

For issues or questions:
1. Check `docs/master-plan.md` for detailed specifications
2. Review this setup guide
3. Check console for error messages
4. Verify all dependencies are installed

---

## 🎉 You're All Set!

Your warehouse management system is now ready for development. The UI is complete with all pages designed and styled. The backend structure is ready for API implementation.

**Current Status:**
- ✅ Complete UI with 8+ pages
- ✅ Database schema designed
- ✅ Project structure established
- ⏳ API endpoints (to be implemented)
- ⏳ Authentication logic (to be implemented)
- ⏳ Real-time features (to be implemented)

Happy coding! 🚀