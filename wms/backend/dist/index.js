"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const shipments_1 = __importDefault(require("./routes/shipments"));
const racks_1 = __importDefault(require("./routes/racks"));
const jobs_1 = __importDefault(require("./routes/jobs"));
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
// Load environment variables FIRST
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
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
// Serve static files for uploads
app.use('/uploads', express_1.default.static('public/uploads'));
// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Warehouse Management API is running',
        timestamp: new Date().toISOString()
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/shipments', shipments_1.default);
app.use('/api/racks', racks_1.default);
app.use('/api/jobs', jobs_1.default);
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
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handling middleware
app.use((err, req, res, next) => {
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
