"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        // Get counts
        const [totalShipments, pendingShipments, inStorageShipments, releasedShipments, activeShipments, totalRacks, activeRacks, totalJobs, scheduledJobs, inProgressJobs, completedJobs,] = await Promise.all([
            prisma.shipment.count({ where: { companyId } }),
            prisma.shipment.count({ where: { companyId, status: 'PENDING' } }),
            prisma.shipment.count({ where: { companyId, status: 'IN_STORAGE' } }),
            prisma.shipment.count({ where: { companyId, status: 'RELEASED' } }),
            prisma.shipment.count({ where: { companyId, status: 'IN_STORAGE' } }), // Active = In Storage
            prisma.rack.count({ where: { companyId } }),
            prisma.rack.count({ where: { companyId, status: 'ACTIVE' } }),
            prisma.movingJob.count({ where: { companyId } }),
            prisma.movingJob.count({ where: { companyId, status: 'SCHEDULED' } }),
            prisma.movingJob.count({ where: { companyId, status: 'IN_PROGRESS' } }),
            prisma.movingJob.count({ where: { companyId, status: 'COMPLETED' } }),
        ]);
        // Get rack utilization
        const racks = await prisma.rack.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: {
                capacityTotal: true,
                capacityUsed: true,
            },
        });
        const totalCapacity = racks.reduce((sum, r) => sum + r.capacityTotal, 0);
        const usedCapacity = racks.reduce((sum, r) => sum + r.capacityUsed, 0);
        const rackUtilization = totalCapacity > 0
            ? Math.round((usedCapacity / totalCapacity) * 100)
            : 0;
        // Get revenue from job cost snapshots
        const costSnapshots = await prisma.jobCostSnapshot.findMany({
            where: { companyId },
            select: { revenue: true },
        });
        const totalRevenue = costSnapshots.reduce((sum, snapshot) => sum + (snapshot.revenue || 0), 0);
        // Get invoice revenue and outstanding
        const invoices = await prisma.invoice.findMany({
            where: { companyId },
            select: {
                totalAmount: true,
                paidAmount: true,
                paymentStatus: true,
            },
        });
        const invoiceRevenue = {
            total: invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0),
            paid: invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || '0'), 0),
            outstanding: invoices.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount || '0')), 0),
            count: invoices.length,
            paidCount: invoices.filter((inv) => inv.paymentStatus === 'PAID').length,
        };
        // Get this month revenue
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                invoiceDate: { gte: firstDayOfMonth },
            },
            select: { paidAmount: true },
        });
        const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || '0'), 0);
        // Get withdrawals count
        const totalWithdrawals = await prisma.withdrawal.count({ where: { companyId } });
        const thisMonthWithdrawals = await prisma.withdrawal.count({
            where: {
                companyId,
                withdrawalDate: { gte: firstDayOfMonth },
            },
        });
        // Get top clients by invoice value
        const topClients = await prisma.invoice.groupBy({
            by: ['clientName'],
            where: { companyId },
            _sum: {
                totalAmount: true,
            },
            _count: {
                id: true,
            },
            orderBy: {
                _sum: {
                    totalAmount: 'desc',
                },
            },
            take: 5,
        });
        // Get storage utilization by rack type
        const racksByType = await prisma.rack.groupBy({
            by: ['rackType'],
            where: { companyId, status: 'ACTIVE' },
            _sum: {
                capacityTotal: true,
                capacityUsed: true,
            },
            _count: {
                id: true,
            },
        });
        // Get recent shipments
        const recentShipments = []; // TODO: Fix after schema migration
        // await prisma.shipment.findMany({...})
        // Get recent jobs
        const recentJobs = []; // TODO: Fix after schema migration
        // await prisma.movingJob.findMany({...})
        // Get recent activities
        const recentActivities = []; // TODO: Fix after schema migration
        // await prisma.rackActivity.findMany({...})
        res.json({
            stats: {
                shipments: {
                    total: totalShipments,
                    active: activeShipments,
                },
                racks: {
                    total: totalRacks,
                    active: activeRacks,
                    utilization: rackUtilization,
                    capacity: {
                        total: totalCapacity,
                        used: usedCapacity,
                        available: totalCapacity - usedCapacity,
                    },
                },
                jobs: {
                    total: totalJobs,
                    scheduled: scheduledJobs,
                    inProgress: inProgressJobs,
                    completed: completedJobs,
                },
                revenue: {
                    total: totalRevenue,
                    currency: 'KWD',
                },
                invoiceRevenue: {
                    total: invoiceRevenue.total,
                    paid: invoiceRevenue.paid,
                    outstanding: invoiceRevenue.outstanding,
                    count: invoiceRevenue.count,
                    paidCount: invoiceRevenue.paidCount,
                    currency: 'KWD',
                },
                thisMonthRevenue: {
                    amount: thisMonthRevenue,
                    currency: 'KWD',
                },
                withdrawals: {
                    total: totalWithdrawals,
                    thisMonth: thisMonthWithdrawals,
                },
                shipmentStatusBreakdown: {
                    pending: pendingShipments,
                    inStorage: inStorageShipments,
                    released: releasedShipments,
                    total: totalShipments,
                },
            },
            topClients: topClients.map((client) => ({
                name: client.clientName,
                totalInvoices: client._count.id,
                totalAmount: parseFloat(client._sum.totalAmount?.toString() || '0'),
                currency: 'KWD',
            })),
            storageBySection: racksByType.map((type) => ({
                section: type.rackType,
                totalRacks: type._count?.id || 0,
                capacityTotal: type._sum?.capacityTotal || 0,
                capacityUsed: type._sum?.capacityUsed || 0,
                utilization: type._sum?.capacityTotal
                    ? Math.round(((type._sum.capacityUsed || 0) / type._sum.capacityTotal) * 100)
                    : 0,
            })),
            recentShipments,
            recentJobs,
            recentActivities,
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
