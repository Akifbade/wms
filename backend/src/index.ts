import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth';
import shipmentRoutes from './routes/shipments';
import rackRoutes from './routes/racks';
import jobRoutes from './routes/jobs';
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

// Load environment variables
dotenv.config();

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
app.use('/api/jobs', jobRoutes);
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
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});