"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const version_1 = require("./config/version");
const activityTracker_1 = require("./middleware/activityTracker");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const shipments_1 = __importDefault(require("./routes/shipments"));
const racks_1 = __importDefault(require("./routes/racks"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const billing_1 = __importDefault(require("./routes/billing"));
const withdrawals_1 = __importDefault(require("./routes/withdrawals"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const company_1 = __importDefault(require("./routes/company"));
const users_1 = __importDefault(require("./routes/users"));
const invoice_settings_1 = __importDefault(require("./routes/invoice-settings"));
const notification_preferences_1 = __importDefault(require("./routes/notification-preferences"));
const custom_fields_1 = __importDefault(require("./routes/custom-fields"));
const custom_field_values_1 = __importDefault(require("./routes/custom-field-values"));
const warehouse_1 = __importDefault(require("./routes/warehouse"));
const shipment_settings_1 = __importDefault(require("./routes/shipment-settings"));
const templates_1 = __importDefault(require("./routes/templates"));
const upload_1 = __importDefault(require("./routes/upload"));
const permissions_1 = __importDefault(require("./routes/permissions"));
const moving_jobs_1 = __importDefault(require("./routes/moving-jobs"));
const materials_1 = __importDefault(require("./routes/materials"));
const reports_1 = __importDefault(require("./routes/reports"));
const plugins_1 = __importDefault(require("./routes/plugins"));
const job_files_1 = __importDefault(require("./routes/job-files")); // NEW: Job file uploads
// NEW: Enhanced warehouse routes
const shipment_items_1 = __importDefault(require("./routes/shipment-items"));
const customer_materials_1 = __importDefault(require("./routes/customer-materials"));
const worker_dashboard_1 = __importDefault(require("./routes/worker-dashboard"));
const categories_1 = __importDefault(require("./routes/categories")); // NEW: Category management
const companies_1 = __importDefault(require("./routes/companies")); // NEW: Company profiles management
const backups_1 = __importDefault(require("./routes/backups")); // NEW: Backup management
const system_1 = __importDefault(require("./routes/system")); // NEW: System monitoring
// Load environment variables FIRST (but allow env vars to override .env)
dotenv_1.default.config({ override: false });
// Initialize Express app
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
let server;
// Middleware - Allow mobile/network access
app.use((0, cors_1.default)({
    origin: true, // Allow all origins for mobile access
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Disable caching for all API responses
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});
// Track user activity for all authenticated requests
app.use('/api', activityTracker_1.activityTrackerMiddleware);
// Smart static handler for company logos (fallback between legacy/new filenames)
app.get('/uploads/company-logos/:name', (req, res, next) => {
    try {
        const filename = req.params.name;
        const baseDir = path_1.default.join(process.cwd(), 'uploads', 'company-logos');
        const tryPaths = [];
        // 1) Requested filename as-is
        tryPaths.push(path_1.default.join(baseDir, filename));
        // 2) If request is company-logo-XXXX, also try company-XXXX
        if (filename.startsWith('company-logo-')) {
            const alt = 'company-' + filename.substring('company-logo-'.length);
            tryPaths.push(path_1.default.join(baseDir, alt));
        }
        // 3) If request is company-XXXX, also try company-logo-XXXX
        if (filename.startsWith('company-') && !filename.startsWith('company-logo-')) {
            const alt = 'company-logo-' + filename.substring('company-'.length);
            tryPaths.push(path_1.default.join(baseDir, alt));
        }
        for (const p of tryPaths) {
            if (fs_1.default.existsSync(p)) {
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
    }
    catch (e) {
        console.error('Logo static fallback error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Serve generic static files for uploads (after logo-specific fallback)
app.use('/uploads', express_1.default.static('uploads'));
// Health check route with version info
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Warehouse Management API is running',
        version: version_1.APP_VERSION,
        versionInfo: (0, version_1.getVersionInfo)(),
        timestamp: new Date().toISOString()
    });
});
// Version info endpoint
app.get('/api/version', (req, res) => {
    const info = (0, version_1.getVersionInfo)();
    res.json({
        version: version_1.APP_VERSION,
        environment: info.environment,
        stage: info.stage,
        buildDate: info.buildDate,
        commitHash: info.commitHash,
        timestamp: info.timestamp
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/shipments', shipments_1.default);
app.use('/api/racks', racks_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/withdrawals', withdrawals_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/company', company_1.default);
app.use('/api/users', users_1.default);
app.use('/api/invoice-settings', invoice_settings_1.default);
app.use('/api/notification-preferences', notification_preferences_1.default);
app.use('/api/custom-fields', custom_fields_1.default);
app.use('/api/custom-field-values', custom_field_values_1.default);
app.use('/api/warehouse', warehouse_1.default);
app.use('/api/shipment-settings', shipment_settings_1.default);
app.use('/api/template-settings', templates_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/permissions', permissions_1.default);
app.use('/api/moving-jobs', moving_jobs_1.default);
// app.use('/api/jobs', jobsRoutes); // REMOVED: Duplicate of moving-jobs
app.use('/api/materials', materials_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/plugins', plugins_1.default);
app.use('/api/job-files', job_files_1.default); // NEW: Job file management
app.use('/api/categories', categories_1.default); // NEW: Category management
app.use('/api/companies', companies_1.default); // NEW: Company profiles (DIOR, JAZEERA, etc) - matches frontend /api/companies/:profileId/analytics
app.use('/api/company-profiles', companies_1.default); // Legacy alias for older frontend calls
app.use('/api/backups', backups_1.default); // NEW: Backup management system
app.use('/api/system', system_1.default); // NEW: System monitoring
// Plugin routes will be added dynamically by patch system
// These are registered in patches/modules/* via app.get/post/etc
// NEW: Enhanced warehouse routes
app.use('/api', shipment_items_1.default); // Handles /api/shipments/:id/items
app.use('/api', customer_materials_1.default); // Handles /api/customers/*
app.use('/api', worker_dashboard_1.default); // Handles /api/worker/*
// Error handling middleware
app.use((err, req, res, next) => {
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
    }
    catch (error) {
        console.error('⚠️  Server initialization error:', error);
    }
    server = app.listen(PORT, () => {
        (0, version_1.logVersionInfo)();
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
