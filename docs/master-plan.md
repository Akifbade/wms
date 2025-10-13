# 📋 **Complete Warehouse Management SaaS - Master Plan Document**

## 🎯 **Project Overview**
**Project Name**: Warehouse Management SaaS with Moving Operations  
**Technology Stack**: Node.js + TypeScript + MySQL + React + Prisma  
**Currency**: Kuwaiti Dinars (KWD)  
**Deployment**: Local Development → Hostinger VPS  

---

## 🏗️ **System Architecture**

### **Core Components**
```
warehouse-wms/
├── backend/              # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/          # Database schema & migrations
│   └── uploads/         # Local file storage
├── frontend/            # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
└── docs/               # Documentation & plans
```

### **Database Design Philosophy**
- **RACK-CENTRIC**: Everything connects through racks as central hub
- **Multi-Tenant**: Complete SaaS isolation per company
- **Real-Time**: Automatic updates across all connected systems
- **Audit Trail**: Complete activity logging with photos

---

## 🗄️ **Complete Database Schema**

### **Core Tables**
```sql
-- Multi-Tenant Structure
companies               # SaaS tenants
users                  # Admin + Workers with roles
subscriptions          # Billing plans

-- Rack-Centric Hub (MOST IMPORTANT)
racks                  # Central integration point
rack_inventory         # Real-time stock tracking
rack_activities        # All activities logged
items_master           # Universal item tracking
movement_transactions  # Every change recorded

-- Warehouse Operations
shipments              # Customer storage items
shipment_items         # Individual items tracking
partial_withdrawals    # Items taken from storage
withdrawal_photos      # Photo proof system

-- Moving Operations
moving_jobs            # Local & International moves
job_assignments        # Staff, drivers, vehicles
packing_inventory      # Materials used/returned
warehouse_materials    # Bubble wrap, boxes, etc.
vehicle_management     # Fleet tracking
labor_tracking         # Worker performance

-- Asset & Waste Management
asset_disposal         # Sold/donated/scrapped items
waste_management       # Garbage, recyclables
disposal_methods       # Sale, donation, recycle
buyer_vendors          # People who buy old items

-- Expense Management
warehouse_expenses     # All operational costs
maintenance_logs       # Equipment/facility maintenance
truck_expenses         # Vehicle costs
expense_categories     # Custom expense types
vendor_management      # Suppliers

-- User Management
user_schedules         # Daily/weekly schedules
job_templates          # Pre-defined job plans
skill_matrix           # User skills & certifications
performance_logs       # Performance tracking
user_availability      # Working hours, skills

-- Company Customization
invoice_settings       # Custom templates & branding
custom_fields          # Dynamic form fields
invoices              # Billing in KWD

-- WhatsApp Integration
whatsapp_messages      # Message templates
notification_logs      # Message history
```

---

## 🎯 **Core Features Overview**

### **1. Multi-Tenant SaaS System**
- Company registration & onboarding
- Subscription management (Basic/Pro/Enterprise)
- User management with roles (Admin/Workers)
- Complete data isolation between companies

### **2. Warehouse Management**
- Shipment intake with QR generation
- Rack assignment system
- Partial withdrawal with photo proof
- Real-time inventory tracking
- Billing in Kuwaiti Dinars

### **3. Moving Operations**
- Local & International moves
- Job scheduling & planning
- Worker/driver/vehicle assignment
- Material tracking (out/return)
- Cost calculation per job

### **4. Asset & Waste Management**
- Old equipment disposal (sale/donation/recycle)
- Waste tracking (recyclable/hazardous/general)
- Revenue generation from asset sales
- Environmental compliance tracking

### **5. Expense Management**
- Maintenance bill uploads
- Truck expenses tracking
- Vendor management
- Receipt scanning with OCR

### **6. Advanced User Management**
- Real-time status (Available/Busy/Break/Off)
- Skill-based job assignment
- Performance tracking
- Schedule optimization

### **7. Mobile-First Design**
- QR scanner for all operations
- Photo capture with GPS
- Offline functionality
- Real-time synchronization

### **8. WhatsApp Integration**
- Job details sharing
- Schedule broadcasting
- Real-time updates
- Pre-built message templates

### **9. Company Customization**
- Invoice templates & branding
- Custom fields system
- Rate settings in KWD
- Report customization

---

## 📱 **Mobile App Features**

### **Worker Mobile App**
```
📱 Worker Dashboard
├── 📊 Today's Overview
├── 📷 Universal QR Scanner
│   ├── Shipment operations
│   ├── Rack assignments
│   ├── Material checkout/return
│   ├── Asset disposal
│   └── Maintenance logging
├── 🚛 Moving Jobs
│   ├── Job details & team
│   ├── Material requirements
│   ├── Progress tracking
│   └── Customer communication
├── 💰 Expense Management
│   ├── Bill uploads
│   ├── Receipt scanning
│   ├── Vendor selection
│   └── Approval tracking
├── 📊 My Performance
│   ├── Jobs completed
│   ├── Ratings received
│   ├── Earnings tracking
│   └── Skill development
└── 💬 WhatsApp Integration
    ├── Job notifications
    ├── Schedule updates
    ├── Team communication
    └── Emergency alerts
```

---

## 🔄 **Rack-Centric Integration**

### **Everything Connects Through Racks**
- **Shipments**: Stored in racks, tracked real-time
- **Materials**: Packing supplies organized by racks
- **Assets**: Old equipment stored before disposal
- **Activities**: All actions logged with rack reference
- **Costs**: Allocated based on rack usage
- **Analytics**: Performance measured per rack

### **Real-Time Updates**
- Scan QR → Instant database update
- Mobile action → All dashboards refresh
- Inventory change → Automatic alerts
- Photo capture → Audit trail created

---

## 💰 **Business Model**

### **SaaS Subscription Plans**
- **Basic**: 50 KWD/month (100 shipments)
- **Pro**: 120 KWD/month (500 shipments)  
- **Enterprise**: 300 KWD/month (unlimited)

### **Revenue Streams**
- Monthly subscriptions
- Storage charges (per day in KWD)
- Moving service fees
- Asset disposal revenue
- Additional user licenses

---

## 🚀 **Development Phases**

### **Phase 1**: Foundation (4 weeks)
- Multi-tenant database setup
- User authentication system
- Basic rack management
- Mobile QR scanner

### **Phase 2**: Core Warehouse (3 weeks)
- Shipment management
- Inventory tracking
- Partial withdrawals
- Photo proof system

### **Phase 3**: Moving Operations (5 weeks)
- Job management
- Material tracking
- Vehicle/worker assignment
- Cost calculation

### **Phase 4**: Advanced Features (4 weeks)
- Asset disposal system
- Expense management
- WhatsApp integration
- Performance analytics

### **Phase 5**: Company Customization (3 weeks)
- Invoice templates
- Custom fields
- Reporting system
- Admin dashboard

### **Phase 6**: Mobile Optimization (2 weeks)
- Offline functionality
- Performance tuning
- User experience polish
- Testing & deployment

---

## 🛠️ **Technical Specifications**

### **Backend**
- Node.js + Express + TypeScript
- Prisma ORM with auto-migrations
- MySQL database
- JWT authentication
- File upload handling
- WhatsApp API integration

### **Frontend**
- React + TypeScript
- Tailwind CSS for styling
- React Query for data fetching
- QR code scanning library
- Camera integration
- PWA capabilities

### **Database**
- MySQL with Prisma migrations
- Automatic schema updates
- Multi-tenant isolation
- Full audit trails
- Real-time synchronization

### **Deployment**
- Local development first
- Hostinger VPS for production
- Domain & SSL setup
- File storage on VPS
- Database on VPS

---

*Last Updated: October 12, 2025*