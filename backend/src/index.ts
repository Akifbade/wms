import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth';
import shipmentRoutes from './routes/shipments';
import rackRoutes from './routes/racks';
import dashboardRoutes from './routes/dashboard';
import billingRoutes from './routes/billing';
import withdrawalRoutes from './routes/withdrawals';
import expenseRoutes from './routes/expenses';
import companyRoutes from './routes/company';
import userRoutes from './routes/users';
import invoiceSettingsRoutes from './routes/invoice-settings';
import notificationPreferencesRoutes from './routes/notification-preferences';
import customFieldsRoutes from './routes/custom-fields';
import customFieldValuesRoutes from './routes/custom-field-values';
import warehouseRoutes from './routes/warehouse';
import shipmentSettingsRoutes from './routes/shipment-settings';
import templateRoutes from './routes/templates';
import uploadRoutes from './routes/upload';
import permissionsRoutes from './routes/permissions';
import movingJobsRoutes from './routes/moving-jobs';
import materialsRoutes from './routes/materials';
import reportsRoutes from './routes/reports';
import pluginsRoutes from './routes/plugins';
import jobFilesRoutes from './routes/job-files'; // NEW: Job file uploads
// NEW: Enhanced warehouse routes
import shipmentItemsRoutes from './routes/shipment-items';
import customerMaterialsRoutes from './routes/customer-materials';
import workerDashboardRoutes from './routes/worker-dashboard';
import categoriesRoutes from './routes/categories'; // NEW: Category management
import companiesRoutes from './routes/companies'; // NEW: Company profiles management

// Load environment variables FIRST (but allow env vars to override .env)
dotenv.config({ override: false });

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware - Allow mobile/network access
app.use(cors({
  origin: true, // Allow all origins for mobile access
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable caching for all API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Warehouse Management API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/racks', rackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invoice-settings', invoiceSettingsRoutes);
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/custom-fields', customFieldsRoutes);
app.use('/api/custom-field-values', customFieldValuesRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/shipment-settings', shipmentSettingsRoutes);
app.use('/api/template-settings', templateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/moving-jobs', movingJobsRoutes);
// app.use('/api/jobs', jobsRoutes); // REMOVED: Duplicate of moving-jobs
app.use('/api/materials', materialsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/plugins', pluginsRoutes);
app.use('/api/job-files', jobFilesRoutes); // NEW: Job file management
app.use('/api/categories', categoriesRoutes); // NEW: Category management
app.use('/api/company-profiles', companiesRoutes); // NEW: Company profiles (DIOR, JAZEERA, etc)
// NEW: Enhanced warehouse routes
app.use('/api', shipmentItemsRoutes); // Handles /api/shipments/:id/items
app.use('/api', customerMaterialsRoutes); // Handles /api/customers/*
app.use('/api', workerDashboardRoutes); // Handles /api/worker/*

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
  console.log(`🚛 Fleet Management: ${process.env.FLEET_ENABLED === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
