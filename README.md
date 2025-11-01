# 🏗️ Warehouse Management SaaS - Setup Instructions

## 📋 Project Overview
Complete warehouse management system with moving operations, built with Node.js, TypeScript, React, and MySQL.

## 🛠️ Technology Stack
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: MySQL
- **Development**: Local environment first, then deploy to Hostinger VPS

## 🚀 Quick Setup

### Prerequisites
```bash
# Install Node.js (v18 or higher)
# Install MySQL (or use XAMPP)
# Install Git
```

### 1. Clone and Setup
```bash
# Navigate to project directory
cd "NEW START"

# Install root dependencies
npm install

# Setup backend
cd backend
npm install
cp .env.example .env

# Setup frontend
cd ../frontend
npm install
```

### 2. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE warehouse_wms_local;
EXIT;

# Update backend/.env with your database credentials
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/warehouse_wms_local"

# Run database migrations
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3. Start Development Servers
```bash
# From root directory - starts both backend and frontend
npm run dev

# Or start individually:
# Backend: npm run backend
# Frontend: npm run frontend
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Prisma Studio**: `npx prisma studio` (from backend folder)

## 📱 Key Features

### 🏢 Company Management
- Complete company profile setup
- Logo upload and branding
- Business hours and timezone
- Storage rates in KWD

### 👥 User Management  
- Role-based access (Admin/Manager/Worker)
- Skills and certifications tracking
- Real-time status monitoring
- Performance analytics

### 🏪 Rack-Centric System
- Visual warehouse layout
- QR code generation and printing
- Real-time inventory tracking
- Capacity management

### 📦 Warehouse Operations
- Shipment intake and storage
- Partial withdrawal with photos
- Asset disposal management
- Waste tracking and recycling

### 🚛 Moving Operations
- Local and international moves
- Job scheduling and planning
- Material tracking (out/return)
- Team assignment optimization

### 💰 Financial Management
- Billing in Kuwaiti Dinars
- Expense management with receipts
- Invoice customization
- Revenue tracking

### 📱 Mobile Features
- QR scanner for all operations
- Photo capture with GPS
- Offline functionality
- WhatsApp integration

## 🗂️ Project Structure

```
warehouse-wms/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, validation
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # DB migrations
│   ├── uploads/            # File storage
│   └── .env                # Environment variables
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Route components
│   │   │   └── Settings/   # Comprehensive settings
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Helper functions
│   └── tailwind.config.js  # Styling config
├── docs/
│   └── master-plan.md      # Complete system plan
└── package.json            # Root scripts
```

## 🎛️ Settings Configuration

### Company Settings
- Basic information and branding
- Business hours and contact details
- Storage rates and currency
- Logo upload and management

### User Management
- Add/edit team members
- Role and permission assignment
- Skills and certification tracking
- Performance monitoring

### System Configuration
- Rack layout and management
- QR code generation and printing
- Custom fields for forms
- Operational settings

### Invoice Settings
- Template customization
- Brand colors and styling
- Custom fields on invoices
- Automated billing setup

### Integrations
- WhatsApp API configuration
- SMS and email settings
- Third-party service connections
- Webhook configurations

## 🔧 Development Commands

```bash
# Root level commands
npm run dev              # Start both servers
npm run setup           # Install all dependencies
npm run build           # Build both applications

# Backend commands (from /backend)
npm run dev             # Start development server
npm run migrate         # Run database migrations
npm run generate        # Generate Prisma client
npm run studio          # Open Prisma Studio
npm run seed            # Seed database with test data

# Frontend commands (from /frontend)
npm start               # Start development server
npm run build           # Build for production
npm test                # Run tests
```

## 📊 Database Schema

### Core Tables
- `companies` - Multi-tenant organizations
- `users` - Team members with roles
- `racks` - Central storage locations (MAIN HUB)
- `shipments` - Customer items in storage
- `moving_jobs` - Local/international moves
- `expenses` - All operational costs
- `invoices` - Billing in KWD

### Integration Tables
- `rack_inventory` - Real-time stock tracking
- `rack_activities` - Complete audit trail
- `custom_fields` - Dynamic form fields
- `invoice_settings` - Template customization

## 🚀 Deployment (Future)

### Hostinger VPS Setup
```bash
# Upload code to VPS
# Configure MySQL on server
# Set environment variables
# Setup domain and SSL
# Configure file uploads
```

## 📱 Mobile PWA Features
- Install as native app
- Camera access for QR scanning
- Offline functionality
- Push notifications
- GPS location tracking

## 🔐 Security Features
- JWT authentication
- Role-based permissions
- Photo watermarking
- Audit trail logging
- Data encryption

## 📞 Support
For setup issues or questions, refer to the master plan document in `/docs/master-plan.md`

---

**Ready to revolutionize warehouse management! 🚀📦**