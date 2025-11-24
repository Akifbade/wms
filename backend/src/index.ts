import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Server } from 'http';
import { APP_VERSION, getVersionInfo, logVersionInfo } from './config/version';
import { activityTrackerMiddleware } from './middleware/activityTracker';

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
import backupsRoutes from './routes/backups'; // NEW: Backup management
import systemRoutes from './routes/system'; // NEW: System monitoring

// Load environment variables FIRST (but allow env vars to override .env)
dotenv.config({ override: false });

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
let server: Server;

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

// Track user activity for all authenticated requests
app.use('/api', activityTrackerMiddleware);

// Smart static handler for company logos (fallback between legacy/new filenames)
app.get('/uploads/company-logos/:name', (req, res, next) => {
  try {
    const filename = req.params.name;
    const baseDir = path.join(process.cwd(), 'uploads', 'company-logos');
    const tryPaths: string[] = [];

    // 1) Requested filename as-is
    tryPaths.push(path.join(baseDir, filename));

    // 2) If request is company-logo-XXXX, also try company-XXXX
    if (filename.startsWith('company-logo-')) {
      const alt = 'company-' + filename.substring('company-logo-'.length);
      tryPaths.push(path.join(baseDir, alt));
    }

    // 3) If request is company-XXXX, also try company-logo-XXXX
    if (filename.startsWith('company-') && !filename.startsWith('company-logo-')) {
      const alt = 'company-logo-' + filename.substring('company-'.length);
      tryPaths.push(path.join(baseDir, alt));
    }

    for (const p of tryPaths) {
      if (fs.existsSync(p)) {
        // Add no-cache headers for images too
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.sendFile(p);
      }
    }

    // If no file found, log the error and return 404 with proper message
    console.warn(`⚠️ Company logo not found: ${filename}`);
    console.warn(`Tried paths:`, tryPaths);
    return res.status(404).json({
      error: 'Logo not found',
      filename,
      message: 'The requested company logo does not exist'
    });
  } catch (e) {
    console.error('Logo static fallback error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve generic static files for uploads (after logo-specific fallback)
app.use('/uploads', express.static('uploads'));

// Health check route with version info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Warehouse Management API is running',
    version: APP_VERSION,
    versionInfo: getVersionInfo(),
    timestamp: new Date().toISOString()
  });
});

// Version info endpoint
app.get('/api/version', (req, res) => {
  const info = getVersionInfo();
  res.json({
    version: APP_VERSION,
    environment: info.environment,
    stage: info.stage,
    buildDate: info.buildDate,
    commitHash: info.commitHash,
    timestamp: info.timestamp
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
app.use('/api/companies', companiesRoutes); // NEW: Company profiles (DIOR, JAZEERA, etc) - matches frontend /api/companies/:profileId/analytics
app.use('/api/company-profiles', companiesRoutes); // Legacy alias for older frontend calls
app.use('/api/backups', backupsRoutes); // NEW: Backup management system
app.use('/api/system', systemRoutes); // NEW: System monitoring

// Plugin routes will be added dynamically by patch system
// These are registered in patches/modules/* via app.get/post/etc

// NEW: Enhanced warehouse routes
app.use('/api', shipmentItemsRoutes); // Handles /api/shipments/:id/items
app.use('/api', customerMaterialsRoutes); // Handles /api/customers/*
app.use('/api', workerDashboardRoutes); // Handles /api/worker/*

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const startServer = async () => {
  try {
    // 404 handler - registered AFTER plugins so their routes work
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  } catch (error) {
    console.error('⚠️  Server initialization error:', error);
  }

  server = app.listen(PORT, () => {
    logVersionInfo();
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
    console.log(`🚛 Fleet Management: ${process.env.FLEET_ENABLED === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
  });
};

startServer().catch((error) => {
  console.error('❌ Failed to start server', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server?.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  server?.close();
  await prisma.$disconnect();
  process.exit(0);
});
