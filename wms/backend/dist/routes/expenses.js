"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Get all expenses with filters
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { category, status, startDate, endDate, search } = req.query;
        const where = { companyId };
        if (category) {
            where.category = category;
        }
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.expenseDate = {};
            if (startDate) {
                where.expenseDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.expenseDate.lte = new Date(endDate);
            }
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { expenseDate: 'desc' },
        });
        // Calculate totals
        const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
        const pendingAmount = expenses
            .filter((exp) => exp.status === 'PENDING')
            .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
        const approvedAmount = expenses
            .filter((exp) => exp.status === 'APPROVED')
            .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
        res.json({
            expenses,
            summary: {
                total: totalAmount,
                pending: pendingAmount,
                approved: approvedAmount,
                count: expenses.length,
                currency: 'KWD',
            },
        });
    }
    catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single expense
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const expense = await prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json({ expense });
    }
    catch (error) {
        console.error('Get expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create expense
router.post('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { title, category, amount, currency, description, receipts, expenseDate, } = req.body;
        // Validation
        if (!title || !category || !amount || !expenseDate) {
            return res.status(400).json({
                error: 'Title, category, amount, and expense date are required'
            });
        }
        const expense = await prisma.expense.create({
            data: {
                companyId,
                title,
                category,
                amount: parseFloat(amount),
                currency: currency || 'KWD',
                description,
                receipts: receipts ? JSON.stringify(receipts) : null,
                expenseDate: new Date(expenseDate),
                status: 'PENDING',
            },
        });
        res.status(201).json({ expense });
    }
    catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update expense
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const { title, category, amount, currency, description, receipts, expenseDate, status, } = req.body;
        // Check if expense exists
        const existing = await prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (category !== undefined)
            updateData.category = category;
        if (amount !== undefined)
            updateData.amount = parseFloat(amount);
        if (currency !== undefined)
            updateData.currency = currency;
        if (description !== undefined)
            updateData.description = description;
        if (receipts !== undefined)
            updateData.receipts = JSON.stringify(receipts);
        if (expenseDate !== undefined)
            updateData.expenseDate = new Date(expenseDate);
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'APPROVED') {
                updateData.approvedBy = req.user.id;
            }
        }
        const expense = await prisma.expense.update({
            where: { id },
            data: updateData,
        });
        res.json({ expense });
    }
    catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const userRole = req.user.role;
        // Only ADMIN can delete expenses
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can delete expenses' });
        }
        const existing = await prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        await prisma.expense.delete({
            where: { id },
        });
        res.json({ message: 'Expense deleted successfully' });
    }
    catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Approve/Reject expense
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status } = req.body;
        // Only ADMIN or MANAGER can approve/reject
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
            return res.status(403).json({
                error: 'Only admins and managers can approve/reject expenses'
            });
        }
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                error: 'Status must be APPROVED or REJECTED'
            });
        }
        const existing = await prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        const expense = await prisma.expense.update({
            where: { id },
            data: {
                status,
                approvedBy: status === 'APPROVED' ? userId : null,
            },
        });
        res.json({ expense });
    }
    catch (error) {
        console.error('Update expense status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get expense statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { startDate, endDate } = req.query;
        const where = { companyId };
        if (startDate || endDate) {
            where.expenseDate = {};
            if (startDate) {
                where.expenseDate.gte = new Date(startDate);
            }
            if (endDate) {
                where.expenseDate.lte = new Date(endDate);
            }
        }
        const expenses = await prisma.expense.findMany({
            where,
        });
        // Group by category
        const byCategory = expenses.reduce((acc, exp) => {
            const category = exp.category;
            if (!acc[category]) {
                acc[category] = { total: 0, count: 0 };
            }
            acc[category].total += parseFloat(exp.amount.toString());
            acc[category].count += 1;
            return acc;
        }, {});
        // Group by status
        const byStatus = expenses.reduce((acc, exp) => {
            const status = exp.status;
            if (!acc[status]) {
                acc[status] = { total: 0, count: 0 };
            }
            acc[status].total += parseFloat(exp.amount.toString());
            acc[status].count += 1;
            return acc;
        }, {});
        const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
        res.json({
            totalAmount,
            totalCount: expenses.length,
            byCategory,
            byStatus,
            currency: 'KWD',
        });
    }
    catch (error) {
        console.error('Get expense stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
