"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ============================================
// PREPAID BALANCE MANAGEMENT
// ============================================
// Get all prepaid balances for company
router.get('/balances', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const balances = await prisma.customerPrepaidBalance.findMany({
            where: { companyId },
            include: {
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                        contactPerson: true,
                        contactPhone: true,
                        description: true
                    }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5 // Last 5 transactions
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(balances);
    }
    catch (error) {
        console.error('Get prepaid balances error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get prepaid balance for specific customer
router.get('/balance/:companyProfileId', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { companyProfileId } = req.params;
        const balance = await prisma.customerPrepaidBalance.findFirst({
            where: {
                companyId,
                companyProfileId
            },
            include: {
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                        contactPerson: true,
                        contactPhone: true
                    }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });
        if (!balance) {
            return res.json({
                companyProfileId,
                totalPaid: 0,
                balanceRemaining: 0,
                status: 'NO_ACCOUNT',
                transactions: []
            });
        }
        res.json(balance);
    }
    catch (error) {
        console.error('Get prepaid balance error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Create or update prepaid balance (Add payment)
router.post('/balance', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { companyProfileId, amount, monthlyRate, validUntil, notes, extendDays // NEW: Option to extend contract days
         } = req.body;
        if (!companyProfileId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Company profile and valid amount are required' });
        }
        // Find existing balance/contract
        const existingBalance = await prisma.customerPrepaidBalance.findFirst({
            where: { companyId, companyProfileId }
        });
        const generateId = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 25; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        let balance;
        let newEndDate = validUntil ? new Date(validUntil) : undefined;
        // Handle automatic extension if requested
        if (extendDays && existingBalance) {
            const currentEndDate = existingBalance.contractEndDate || existingBalance.validUntil || new Date();
            // If expired, start from today, else add to current end date
            const baseDate = new Date(currentEndDate) < new Date() ? new Date() : new Date(currentEndDate);
            baseDate.setDate(baseDate.getDate() + parseInt(extendDays));
            newEndDate = baseDate;
            // Log history for extension using raw SQL
            const historyId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const startDate = existingBalance.contractStartDate || existingBalance.validFrom || new Date();
            const endDate = existingBalance.contractEndDate || existingBalance.validUntil;
            const userId = req.user.id;
            await prisma.$executeRaw `
                INSERT INTO contract_history (id, customerPrepaidBalanceId, monthlyRate, contractStartDate, contractEndDate, reason, changedByUserId, createdAt)
                VALUES (${historyId}, ${existingBalance.id}, ${existingBalance.monthlyRate}, ${startDate}, ${endDate}, ${`Payment Extension (+${extendDays} days)`}, ${userId}, NOW())
            `;
        }
        if (existingBalance) {
            // Update existing
            const updateData = {
                totalPaid: { increment: parseFloat(amount) },
                balanceRemaining: { increment: parseFloat(amount) }, // Add to balance
                notes: notes ? `${existingBalance.notes}\n${notes}` : existingBalance.notes
            };
            if (monthlyRate)
                updateData.monthlyRate = monthlyRate;
            if (newEndDate) {
                updateData.validUntil = newEndDate;
            }
            balance = await prisma.customerPrepaidBalance.update({
                where: { id: existingBalance.id },
                data: updateData
            });
            // Sync newEndDate to contractEndDate if changed
            if (newEndDate) {
                await prisma.$executeRaw `
                    UPDATE customer_prepaid_balances 
                    SET contractEndDate = ${newEndDate}
                    WHERE id = ${existingBalance.id}
                `;
            }
            // Record Transaction
            await prisma.prepaidTransaction.create({
                data: {
                    id: generateId(),
                    prepaidBalanceId: existingBalance.id,
                    amount: parseFloat(amount),
                    type: 'CREDIT',
                    description: notes || 'Payment Received',
                    referenceId: `PAY-${Date.now()}`,
                    balanceBefore: existingBalance.balanceRemaining,
                    balanceAfter: existingBalance.balanceRemaining + parseFloat(amount),
                    referenceType: 'MANUAL'
                }
            });
        }
        else {
            // Create new balance
            balance = await prisma.customerPrepaidBalance.create({
                data: {
                    id: generateId(),
                    companyId,
                    companyProfileId,
                    totalPaid: parseFloat(amount),
                    balanceRemaining: parseFloat(amount),
                    monthlyRate: monthlyRate || 0,
                    validUntil: newEndDate || (validUntil ? new Date(validUntil) : null),
                    status: 'ACTIVE',
                    notes: notes || ''
                }
            });
            // Record transaction
            await prisma.prepaidTransaction.create({
                data: {
                    id: generateId(),
                    prepaidBalanceId: balance.id,
                    type: 'CREDIT',
                    amount: parseFloat(amount),
                    balanceBefore: 0,
                    balanceAfter: parseFloat(amount),
                    referenceType: 'MANUAL',
                    description: notes || `Initial prepaid payment: ${amount} KWD`
                }
            });
        }
        // Fetch updated balance with relations
        const updatedBalance = await prisma.customerPrepaidBalance.findUnique({
            where: { id: balance.id },
            include: {
                companyProfile: {
                    select: { id: true, name: true }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
        res.json(updatedBalance);
    }
    catch (error) {
        console.error('Create/update prepaid balance error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Deduct from prepaid balance (called when releasing shipment)
router.post('/deduct', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { companyProfileId, amount, shipmentId, description } = req.body;
        if (!companyProfileId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Company profile and valid amount are required' });
        }
        const balance = await prisma.customerPrepaidBalance.findFirst({
            where: { companyId, companyProfileId }
        });
        if (!balance) {
            return res.status(404).json({ error: 'No prepaid balance found for this customer' });
        }
        if (balance.balanceRemaining < amount) {
            return res.status(400).json({
                error: 'Insufficient prepaid balance',
                available: balance.balanceRemaining,
                required: amount
            });
        }
        const generateId = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 25; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        const balanceBefore = balance.balanceRemaining;
        const balanceAfter = balanceBefore - amount;
        // Update balance
        const updatedBalance = await prisma.customerPrepaidBalance.update({
            where: { id: balance.id },
            data: {
                balanceRemaining: balanceAfter,
                status: balanceAfter <= 0 ? 'EXHAUSTED' : 'ACTIVE'
            }
        });
        // Record transaction
        await prisma.prepaidTransaction.create({
            data: {
                id: generateId(),
                prepaidBalanceId: balance.id,
                type: 'DEBIT',
                amount,
                balanceBefore,
                balanceAfter,
                referenceType: shipmentId ? 'SHIPMENT' : 'MANUAL',
                referenceId: shipmentId,
                description: description || `Charge deducted: ${amount} KWD`
            }
        });
        res.json({
            success: true,
            deducted: amount,
            newBalance: balanceAfter,
            status: updatedBalance.status
        });
    }
    catch (error) {
        console.error('Deduct prepaid balance error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get transaction history for a customer
router.get('/transactions/:companyProfileId', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { companyProfileId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const balance = await prisma.customerPrepaidBalance.findFirst({
            where: { companyId, companyProfileId }
        });
        if (!balance) {
            return res.json({ transactions: [], total: 0 });
        }
        const [transactions, total] = await Promise.all([
            prisma.prepaidTransaction.findMany({
                where: { prepaidBalanceId: balance.id },
                orderBy: { createdAt: 'desc' },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit)
            }),
            prisma.prepaidTransaction.count({
                where: { prepaidBalanceId: balance.id }
            })
        ]);
        res.json({
            transactions,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Adjust balance (manual correction)
router.post('/adjust', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { companyProfileId, adjustment, // positive or negative
        reason } = req.body;
        if (!companyProfileId || adjustment === undefined || adjustment === 0) {
            return res.status(400).json({ error: 'Company profile and non-zero adjustment are required' });
        }
        const balance = await prisma.customerPrepaidBalance.findFirst({
            where: { companyId, companyProfileId }
        });
        if (!balance) {
            return res.status(404).json({ error: 'No prepaid balance found for this customer' });
        }
        const generateId = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 25; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        const balanceBefore = balance.balanceRemaining;
        const balanceAfter = balanceBefore + adjustment;
        if (balanceAfter < 0) {
            return res.status(400).json({ error: 'Adjustment would result in negative balance' });
        }
        // Update balance
        const updatedBalance = await prisma.customerPrepaidBalance.update({
            where: { id: balance.id },
            data: {
                balanceRemaining: balanceAfter,
                totalPaid: adjustment > 0 ? { increment: adjustment } : balance.totalPaid,
                status: balanceAfter <= 0 ? 'EXHAUSTED' : 'ACTIVE'
            }
        });
        // Record transaction
        await prisma.prepaidTransaction.create({
            data: {
                id: generateId(),
                prepaidBalanceId: balance.id,
                type: 'ADJUSTMENT',
                amount: Math.abs(adjustment),
                balanceBefore,
                balanceAfter,
                referenceType: 'MANUAL',
                description: reason || `Balance adjustment: ${adjustment > 0 ? '+' : ''}${adjustment} KWD`
            }
        });
        res.json({
            success: true,
            adjustment,
            newBalance: balanceAfter,
            status: updatedBalance.status
        });
    }
    catch (error) {
        console.error('Adjust balance error:', error);
        res.status(500).json({ error: error.message });
    }
});
// UPDATE prepaid balance (edit balance, expiry date, status)
router.put('/balance/:prepaidBalanceId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { prepaidBalanceId } = req.params;
        const { balanceRemaining, monthlyRate, validUntil, status, notes } = req.body;
        // Find existing balance
        const existingBalance = await prisma.customerPrepaidBalance.findFirst({
            where: { id: prepaidBalanceId, companyId }
        });
        if (!existingBalance) {
            return res.status(404).json({ error: 'Prepaid balance not found' });
        }
        const generateId = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 25; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        // Build update data
        const updateData = {};
        if (balanceRemaining !== undefined && balanceRemaining !== existingBalance.balanceRemaining) {
            // Record the adjustment as a transaction
            const balanceBefore = existingBalance.balanceRemaining;
            const balanceAfter = balanceRemaining;
            const adjustmentAmount = balanceAfter - balanceBefore;
            await prisma.prepaidTransaction.create({
                data: {
                    id: generateId(),
                    prepaidBalanceId: existingBalance.id,
                    type: adjustmentAmount >= 0 ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT',
                    amount: Math.abs(adjustmentAmount),
                    balanceBefore,
                    balanceAfter,
                    referenceType: 'MANUAL_EDIT',
                    description: `Manual balance adjustment by admin. ${notes || ''}`
                }
            });
            updateData.balanceRemaining = balanceRemaining;
        }
        if (monthlyRate !== undefined) {
            updateData.monthlyRate = monthlyRate;
        }
        if (validUntil !== undefined) {
            updateData.validUntil = validUntil ? new Date(validUntil) : null;
        }
        if (status !== undefined) {
            updateData.status = status;
        }
        if (notes !== undefined) {
            updateData.notes = notes;
        }
        // Auto-update status based on expiry
        if (updateData.validUntil && new Date(updateData.validUntil) < new Date()) {
            updateData.status = 'EXPIRED';
        }
        const updatedBalance = await prisma.customerPrepaidBalance.update({
            where: { id: prepaidBalanceId },
            data: updateData,
            include: {
                companyProfile: {
                    select: { id: true, name: true }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
        res.json({
            success: true,
            message: 'Prepaid balance updated successfully',
            balance: updatedBalance
        });
    }
    catch (error) {
        console.error('Update prepaid balance error:', error);
        res.status(500).json({ error: error.message });
    }
});
// CHECK if prepaid is valid (not expired) - used by frontend before operations
router.get('/check-validity/:companyProfileId', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { companyProfileId } = req.params;
        const balance = await prisma.customerPrepaidBalance.findFirst({
            where: { companyId, companyProfileId },
            include: {
                companyProfile: {
                    select: { id: true, name: true }
                }
            }
        });
        if (!balance) {
            // No prepaid account - allow operations (not a prepaid customer)
            return res.json({
                hasPrepaid: false,
                isValid: true,
                canOperate: true,
                message: 'No prepaid account - regular customer'
            });
        }
        const now = new Date();
        const isExpired = balance.validUntil && new Date(balance.validUntil) < now;
        const isExhausted = balance.balanceRemaining <= 0;
        const isCancelled = balance.status === 'CANCELLED';
        // Auto-update status if expired
        if (isExpired && balance.status !== 'EXPIRED') {
            await prisma.customerPrepaidBalance.update({
                where: { id: balance.id },
                data: { status: 'EXPIRED' }
            });
        }
        const canOperate = !isExpired && !isCancelled;
        res.json({
            hasPrepaid: true,
            isValid: canOperate,
            canOperate,
            isExpired,
            isExhausted,
            isCancelled,
            status: isExpired ? 'EXPIRED' : balance.status,
            validUntil: balance.validUntil,
            balanceRemaining: balance.balanceRemaining,
            customerName: balance.companyProfile?.name,
            message: isExpired
                ? `⛔ PREPAID EXPIRED on ${new Date(balance.validUntil).toLocaleDateString()}. Contact admin to renew.`
                : isCancelled
                    ? '⛔ PREPAID CANCELLED. Contact admin.'
                    : isExhausted
                        ? '⚠️ PREPAID EXHAUSTED but still valid. Can operate with payment.'
                        : '✅ PREPAID VALID'
        });
    }
    catch (error) {
        console.error('Check prepaid validity error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get prepaid summary for analytics
router.get('/summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const balances = await prisma.customerPrepaidBalance.findMany({
            where: { companyId },
            include: {
                companyProfile: {
                    select: { id: true, name: true }
                }
            }
        });
        // Check and update expired statuses
        const now = new Date();
        for (const balance of balances) {
            if (balance.validUntil && new Date(balance.validUntil) < now && balance.status !== 'EXPIRED') {
                await prisma.customerPrepaidBalance.update({
                    where: { id: balance.id },
                    data: { status: 'EXPIRED' }
                });
                balance.status = 'EXPIRED';
            }
        }
        const summary = {
            totalCustomers: balances.length,
            totalPrepaidReceived: balances.reduce((sum, b) => sum + b.totalPaid, 0),
            totalBalanceRemaining: balances.reduce((sum, b) => sum + b.balanceRemaining, 0),
            activeAccounts: balances.filter(b => b.status === 'ACTIVE').length,
            exhaustedAccounts: balances.filter(b => b.status === 'EXHAUSTED').length,
            expiredAccounts: balances.filter(b => b.status === 'EXPIRED').length,
            customerBreakdown: balances.map(b => ({
                id: b.id,
                customerName: b.companyProfile?.name || 'Unknown',
                companyProfileId: b.companyProfileId,
                totalPaid: b.totalPaid,
                balanceRemaining: b.balanceRemaining,
                monthlyRate: b.monthlyRate,
                validUntil: b.validUntil,
                status: b.status
            }))
        };
        res.json(summary);
    }
    catch (error) {
        console.error('Get prepaid summary error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
