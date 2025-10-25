"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// GET /api/notification-preferences - Get user's notification preferences
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        // For now, return default preferences (can be stored in database later)
        const preferences = {
            email: {
                newShipment: true,
                shipmentRelease: true,
                invoiceGenerated: true,
                paymentReceived: true,
                lowStock: true,
                systemAlerts: true,
            },
            sms: {
                newShipment: false,
                shipmentRelease: true,
                invoiceGenerated: false,
                paymentReceived: true,
                lowStock: false,
                systemAlerts: true,
            },
            push: {
                newShipment: true,
                shipmentRelease: true,
                invoiceGenerated: true,
                paymentReceived: true,
                lowStock: true,
                systemAlerts: true,
            },
            frequency: 'IMMEDIATE', // IMMEDIATE, DAILY_DIGEST, WEEKLY_DIGEST
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
        };
        res.json({ preferences });
    }
    catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
});
// PUT /api/notification-preferences - Update notification preferences
router.put('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, sms, push, frequency, quietHoursEnabled, quietHoursStart, quietHoursEnd } = req.body;
        // Validation
        if (frequency && !['IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST'].includes(frequency)) {
            return res.status(400).json({ error: 'Invalid frequency value' });
        }
        // Time format validation (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (quietHoursStart && !timeRegex.test(quietHoursStart)) {
            return res.status(400).json({ error: 'Invalid quiet hours start time format (use HH:MM)' });
        }
        if (quietHoursEnd && !timeRegex.test(quietHoursEnd)) {
            return res.status(400).json({ error: 'Invalid quiet hours end time format (use HH:MM)' });
        }
        // For now, just return success (can be stored in database later)
        // In a real app, you would save to a NotificationPreferences table
        const preferences = {
            email: email || {},
            sms: sms || {},
            push: push || {},
            frequency: frequency || 'IMMEDIATE',
            quietHoursEnabled: quietHoursEnabled || false,
            quietHoursStart: quietHoursStart || '22:00',
            quietHoursEnd: quietHoursEnd || '08:00',
        };
        res.json({ preferences, message: 'Notification preferences updated successfully' });
    }
    catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Failed to update notification preferences' });
    }
});
// POST /api/notification-preferences/test - Send test notification
router.post('/test', async (req, res) => {
    try {
        const { type } = req.body; // 'email', 'sms', or 'push'
        if (!type || !['email', 'sms', 'push'].includes(type)) {
            return res.status(400).json({ error: 'Invalid notification type' });
        }
        // In a real app, this would send an actual test notification
        res.json({ message: `Test ${type} notification sent successfully` });
    }
    catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});
exports.default = router;
