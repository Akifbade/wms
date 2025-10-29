"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all withdrawals (with filters)
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, search, startDate, endDate, shipmentId } = req.query;
        const where = { companyId };
        if (status)
            where.status = status;
        if (shipmentId)
            where.shipmentId = shipmentId;
        if (search) {
            where.OR = [
                { withdrawnBy: { contains: search, mode: 'insensitive' } },
                { receiptNumber: { contains: search, mode: 'insensitive' } },
                { shipment: { clientName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (startDate || endDate) {
            where.withdrawalDate = {};
            if (startDate)
                where.withdrawalDate.gte = new Date(startDate);
            if (endDate)
                where.withdrawalDate.lte = new Date(endDate);
        }
        const withdrawals = await prisma.withdrawal.findMany({
            where,
            include: {
                shipment: {
                    select: {
                        id: true,
                        referenceId: true,
                        clientName: true,
                        clientPhone: true,
                        currentBoxCount: true,
                        originalBoxCount: true,
                    }
                }
            },
            orderBy: { withdrawalDate: 'desc' },
        });
        res.json({ withdrawals });
    }
    catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get single withdrawal
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const withdrawal = await prisma.withdrawal.findFirst({
            where: { id, companyId },
            include: {
                shipment: {
                    include: {
                        boxes: {
                            include: {
                                rack: true,
                            },
                        },
                    }
                }
            },
        });
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        res.json({ withdrawal });
    }
    catch (error) {
        console.error('Get withdrawal error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Create withdrawal (partial or full release)
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const { shipmentId, withdrawnBoxCount, reason, notes, photos, withdrawnBy, receiptNumber, } = req.body;
        // Validate shipment
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        if (withdrawnBoxCount > shipment.currentBoxCount) {
            return res.status(400).json({
                error: `Cannot withdraw ${withdrawnBoxCount} boxes. Only ${shipment.currentBoxCount} boxes available.`
            });
        }
        const remainingBoxCount = shipment.currentBoxCount - withdrawnBoxCount;
        // Create withdrawal record
        const withdrawal = await prisma.withdrawal.create({
            data: {
                companyId,
                shipmentId,
                withdrawnBoxCount,
                remainingBoxCount,
                reason,
                notes,
                photos: photos ? JSON.stringify(photos) : null,
                withdrawnBy,
                receiptNumber,
                authorizedBy: userId,
                status: 'COMPLETED',
            },
            include: {
                shipment: true,
            }
        });
        // Update shipment box count and status
        const newStatus = remainingBoxCount === 0
            ? 'RELEASED'
            : (withdrawnBoxCount < shipment.currentBoxCount ? 'PARTIAL' : 'ACTIVE');
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                currentBoxCount: remainingBoxCount,
                status: newStatus,
                releasedAt: remainingBoxCount === 0 ? new Date() : null,
            },
        });
        res.status(201).json({
            withdrawal,
            message: remainingBoxCount === 0
                ? 'Shipment fully released'
                : `Partial withdrawal completed. ${remainingBoxCount} boxes remaining.`
        });
    }
    catch (error) {
        console.error('Create withdrawal error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update withdrawal status
router.put('/:id/status', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const { status } = req.body;
        const withdrawal = await prisma.withdrawal.findFirst({
            where: { id, companyId },
        });
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        const updated = await prisma.withdrawal.update({
            where: { id },
            data: { status },
        });
        res.json({ withdrawal: updated, message: 'Withdrawal status updated' });
    }
    catch (error) {
        console.error('Update withdrawal status error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Delete withdrawal (Admin only)
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const withdrawal = await prisma.withdrawal.findFirst({
            where: { id, companyId },
        });
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        await prisma.withdrawal.delete({
            where: { id },
        });
        res.json({ message: 'Withdrawal deleted successfully' });
    }
    catch (error) {
        console.error('Delete withdrawal error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
