"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cors_1 = require("cors");
const dotenv_1 = require("dotenv");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.API_PORT || 5000;
// CORS
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'QGO Server is running!' });
});
// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});
// Login endpoint (dummy)
app.post('/api/auth/login', (req, res) => {
    res.json({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', role: 'admin' }
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 QGO Server running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
});
