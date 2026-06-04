import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Helper to get company ID from request
const getCompanyId = (req: any) => req.user?.companyId;

// GET /api/finance/overview
// High-level financial stats
router.get('/overview', authenticateToken, async (req: any, res) => {
    try {
        const companyId = getCompanyId(req);
        const { startDate, endDate } = req.query;

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        // 1. Revenue (Invoices)
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                paymentStatus: { notIn: ['DRAFT', 'CANCELLED'] },
                ...dateFilter
            },
            select: { totalAmount: true, paidAmount: true, balanceDue: true }
        });

        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
        const totalPending = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

        // 2. Expenses (General Expenses)
        const expenses = await prisma.expense.findMany({
            where: {
                companyId,
                ...dateFilter
            },
            select: { amount: true }
        });
        const totalGeneralExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        // 3. Material Costs (Purchase Orders)
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
                companyId,
                status: { in: ['RECEIVED', 'APPROVED'] },
                ...dateFilter
            },
            select: { totalAmount: true }
        });
        const totalMaterialPurchases = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);

        // 4. Material Damages (Losses)
        // Need to calculate cost from quantity * unitCost (need to fetch material cost)
        const damages = await prisma.materialDamage.findMany({
            where: {
                companyId,
                status: 'APPROVED',
                ...dateFilter
            },
            include: { material: true }
        });

        // Approximate damage cost using current unit cost (or historical if available, but keeping simple)
        const totalDamageCost = damages.reduce((sum, dmg) => {
            return sum + (dmg.quantity * (dmg.material.unitCost || 0));
        }, 0);

        const totalExpenses = totalGeneralExpenses + totalMaterialPurchases + totalDamageCost;
        const netProfit = totalRevenue - totalExpenses;

        res.json({
            totalRevenue,
            totalCollected,
            totalPending,
            totalExpenses,
            breakdown: {
                generalExpenses: totalGeneralExpenses,
                materialPurchases: totalMaterialPurchases,
                damageLosses: totalDamageCost
            },
            netProfit
        });

    } catch (error) {
        console.error('Error fetching finance overview:', error);
        res.status(500).json({ error: 'Failed to fetch finance overview' });
    }
});

// GET /api/finance/top-customers
// Top customers by revenue
router.get('/top-customers', authenticateToken, async (req: any, res) => {
    try {
        const companyId = getCompanyId(req);
        const { startDate, endDate } = req.query;

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        // Fetch invoices grouped by companyProfileId
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                paymentStatus: { notIn: ['DRAFT', 'CANCELLED'] },
                ...dateFilter
            },
            select: {
                totalAmount: true,
                clientName: true,
                companyProfileId: true,
                companyProfile: {
                    select: { id: true, name: true }
                }
            }
        });

        // Group by customer and calculate totals
        const customerMap: Record<string, { id: string, name: string, totalRevenue: number, totalInvoices: number }> = {};

        invoices.forEach(inv => {
            const customerId = inv.companyProfileId || inv.clientName || 'unknown';
            const customerName = inv.companyProfile?.name || inv.clientName || 'Unknown';
            
            if (!customerMap[customerId]) {
                customerMap[customerId] = {
                    id: customerId,
                    name: customerName,
                    totalRevenue: 0,
                    totalInvoices: 0
                };
            }
            customerMap[customerId].totalRevenue += inv.totalAmount;
            customerMap[customerId].totalInvoices += 1;
        });

        // Convert to array and sort by revenue
        const topCustomers = Object.values(customerMap)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 10);

        res.json(topCustomers);

    } catch (error) {
        console.error('Error fetching top customers:', error);
        res.status(500).json({ error: 'Failed to fetch top customers' });
    }
});

// GET /api/finance/companies
// Company-wise financial breakdown
router.get('/companies', authenticateToken, async (req: any, res) => {
    try {
        const companyId = getCompanyId(req);

        // Fetch all company profiles (customers)
        const profiles = await prisma.companyProfile.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: { shipments: true }
                }
            }
        });

        // We need to aggregate invoices/payments per profile.
        // Since Prisma doesn't support deep aggregation easily in one go for this structure,
        // we might need to fetch invoices grouped by companyProfileId if linked, 
        // OR fetch all invoices and map them in JS.
        // Assuming Invoice has `companyProfileId` or linked via Shipment.
        // Let's check Invoice schema. 
        // If Invoice is linked to Shipment, and Shipment to Profile.
        // Or Invoice directly to Profile.

        // Let's assume Invoice has `billToId` or similar which is the Profile ID.
        // I'll fetch all invoices for the company and aggregate.

        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                paymentStatus: { notIn: ['DRAFT', 'CANCELLED'] }
            },
            select: {
                id: true,
                totalAmount: true,
                paidAmount: true,
                balanceDue: true,
                companyProfileId: true // Assuming this field exists, need to verify
            }
        });

        // Map stats
        const stats: Record<string, { billed: number, paid: number, pending: number }> = {};

        invoices.forEach(inv => {
            if (inv.companyProfileId) {
                if (!stats[inv.companyProfileId]) {
                    stats[inv.companyProfileId] = { billed: 0, paid: 0, pending: 0 };
                }
                stats[inv.companyProfileId].billed += inv.totalAmount;
                stats[inv.companyProfileId].paid += inv.paidAmount;
                stats[inv.companyProfileId].pending += inv.balanceDue;
            }
        });

        const result = profiles.map(p => ({
            id: p.id,
            name: p.name,
            contactPerson: p.contactPerson,
            totalShipments: p._count?.shipments || 0,
            financials: stats[p.id] || { billed: 0, paid: 0, pending: 0 }
        }));

        res.json(result);

    } catch (error) {
        console.error('Error fetching company financials:', error);
        res.status(500).json({ error: 'Failed to fetch company financials' });
    }
});

// GET /api/finance/transactions
// Global ledger (Payments, Expenses, Purchases)
router.get('/transactions', authenticateToken, async (req: any, res) => {
    try {
        const companyId = getCompanyId(req);
        const limit = parseInt(req.query.limit as string) || 50;

        // 1. Payments (Inflow)
        const payments = await prisma.payment.findMany({
            where: { companyId },
            take: limit,
            orderBy: { paymentDate: 'desc' },
            include: { invoice: { select: { invoiceNumber: true, clientName: true, companyProfile: { select: { name: true } } } } }
        });

        // 2. Expenses (Outflow)
        const expenses = await prisma.expense.findMany({
            where: { companyId },
            take: limit,
            orderBy: { expenseDate: 'desc' },
            // include: { category: true } // Category is a string in schema, not a relation
        });

        // 3. Purchases (Outflow)
        const purchases = await prisma.purchaseOrder.findMany({
            where: { companyId, status: { in: ['RECEIVED', 'APPROVED'] } },
            take: limit,
            orderBy: { orderDate: 'desc' },
            include: { vendor: true }
        });

        // Combine and sort
        const combined = [
            ...payments.map(p => ({
                id: p.id,
                date: p.paymentDate,
                type: 'INCOME',
                category: 'Payment Received',
                description: `Inv #${p.invoice?.invoiceNumber} - ${p.invoice?.companyProfile?.name || p.invoice?.clientName || 'Unknown'}`,
                amount: p.amount,
                reference: p.transactionRef
            })),
            ...expenses.map(e => ({
                id: e.id,
                date: e.expenseDate,
                type: 'EXPENSE',
                category: e.category || 'General',
                description: e.description,
                amount: -e.amount, // Negative for expense
                reference: null
            })),
            ...purchases.map(p => ({
                id: p.id,
                date: p.orderDate,
                type: 'PURCHASE',
                category: 'Material Purchase',
                description: `PO #${p.orderNumber} - ${p.vendor?.name || 'Unknown'}`,
                amount: -p.totalAmount, // Negative for expense
                reference: p.orderNumber
            }))
        ];

        // Sort by date desc
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(combined.slice(0, limit));

    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// GET /api/finance/inventory
// Material financial breakdown
router.get('/inventory', authenticateToken, async (req: any, res) => {
    try {
        const companyId = getCompanyId(req);

        // Fetch all materials
        const materials = await prisma.packingMaterial.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: {
                        materialUsages: true,
                        materialDamages: true
                    }
                }
            }
        });

        // We need to aggregate costs. 
        // This might be heavy if we have tons of usage records, but for now let's try aggregation.

        // 1. Usage Costs (COGS)
        const usageStats = await prisma.materialUsage.groupBy({
            by: ['materialId'],
            where: { companyId },
            _sum: {
                totalCost: true,
                quantityUsed: true
            }
        });

        // 2. Damage Costs
        // Damages don't store totalCost usually, just quantity. We need to calculate.
        // Or we can fetch them and calculate.
        const damages = await prisma.materialDamage.findMany({
            where: { companyId, status: 'APPROVED' },
            select: { materialId: true, quantity: true, material: { select: { unitCost: true } } }
        });

        const damageStats: Record<string, { qty: number, cost: number }> = {};
        damages.forEach(d => {
            if (!damageStats[d.materialId]) damageStats[d.materialId] = { qty: 0, cost: 0 };
            damageStats[d.materialId].qty += d.quantity;
            damageStats[d.materialId].cost += (d.quantity * (d.material.unitCost || 0));
        });

        // 3. Purchase Costs
        const purchaseItems = await prisma.purchaseOrderItem.groupBy({
            by: ['materialId'],
            where: { companyId, purchaseOrder: { status: { in: ['RECEIVED', 'APPROVED'] } } },
            _sum: {
                totalCost: true,
                quantity: true
            }
        });

        // Map everything to materials
        const result = materials.map(m => {
            const usage = usageStats.find(u => u.materialId === m.id);
            const purchase = purchaseItems.find(p => p.materialId === m.id);
            const damage = damageStats[m.id];

            return {
                id: m.id,
                name: m.name,
                sku: m.sku,
                currentStock: m.totalQuantity,
                unitCost: m.unitCost,
                financials: {
                    purchased: {
                        qty: purchase?._sum.quantity || 0,
                        cost: purchase?._sum.totalCost || 0
                    },
                    used: {
                        qty: usage?._sum.quantityUsed || 0,
                        cost: usage?._sum.totalCost || 0
                    },
                    damaged: {
                        qty: damage?.qty || 0,
                        cost: damage?.cost || 0
                    }
                }
            };
        });

        res.json(result);

    } catch (error) {
        console.error('Error fetching inventory financials:', error);
        res.status(500).json({ error: 'Failed to fetch inventory financials' });
    }
});

export default router;
