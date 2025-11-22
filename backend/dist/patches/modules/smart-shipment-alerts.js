"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Example Patch: Smart Shipment Alerts
 *
 * Demonstrates:
 * - New API endpoint via patch
 * - Database query via Prisma
 * - Error handling & fallbacks
 * - Logger integration
 */
exports.default = {
    id: 'smart-shipment-alerts',
    description: 'AI-powered alerts for shipment delays and issues',
    async apply(context) {
        const { app, prisma, logger, config } = context;
        logger.info('Smart Shipment Alerts patch loading...');
        /**
         * Check for delayed shipments and return alerts
         * Usage: GET /api/alerts/shipment-status
         */
        app.get('/api/alerts/shipment-status', async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                // Find shipments that might have issues
                const problematicShipments = await prisma.shipment.findMany({
                    where: {
                        companyId,
                        status: { in: ['PENDING', 'ACTIVE', 'PARTIAL'] },
                    },
                    include: {
                        boxes: true,
                        invoices: true,
                    },
                    take: 50,
                });
                // Generate alerts based on logic
                const alerts = problematicShipments
                    .map((shipment) => {
                    const issues = [];
                    // Check if pending for too long
                    const daysSincePending = Math.floor((Date.now() - new Date(shipment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    if (daysSincePending > 7 && shipment.status === 'PENDING') {
                        issues.push({
                            type: 'LONG_PENDING',
                            message: `Shipment pending for ${daysSincePending} days`,
                            severity: 'HIGH',
                        });
                    }
                    // Check if partial (some boxes missing)
                    if (shipment.status === 'PARTIAL' && shipment.boxes.length < shipment.originalBoxCount) {
                        issues.push({
                            type: 'PARTIAL_SHIPMENT',
                            message: `Only ${shipment.boxes.length}/${shipment.originalBoxCount} boxes arrived`,
                            severity: 'MEDIUM',
                        });
                    }
                    // Check if invoices unpaid
                    const unpaidInvoices = shipment.invoices?.filter((inv) => inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'OVERDUE') || [];
                    if (unpaidInvoices.length > 0) {
                        issues.push({
                            type: 'UNPAID_INVOICE',
                            message: `${unpaidInvoices.length} invoice(s) unpaid`,
                            severity: unpaidInvoices.some((inv) => inv.paymentStatus === 'OVERDUE') ? 'HIGH' : 'LOW',
                        });
                    }
                    return {
                        shipmentId: shipment.id,
                        referenceId: shipment.referenceId,
                        clientName: shipment.clientName,
                        status: shipment.status,
                        daysInWarehouse: daysSincePending,
                        alerts: issues,
                        hasIssues: issues.length > 0,
                    };
                })
                    .filter((s) => s.hasIssues); // Only return shipments with issues
                logger.info(`Generated ${alerts.length} shipment alerts for company ${companyId}`);
                res.json({
                    alertCount: alerts.length,
                    alerts,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                logger.error('Failed to generate alerts', { error: error?.message });
                // Fallback response
                res.json({
                    fallback: true,
                    alertCount: 0,
                    alerts: [],
                    message: 'Alert system temporarily unavailable',
                });
            }
        });
        /**
         * Get alert statistics and trends
         * Usage: GET /api/alerts/statistics
         */
        app.get('/api/alerts/statistics', async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                // Count shipments by status
                const statusCounts = await prisma.shipment.groupBy({
                    by: ['status'],
                    where: { companyId },
                    _count: true,
                });
                // Count overdue invoices
                const overdueInvoices = await prisma.invoice.count({
                    where: {
                        companyId,
                        paymentStatus: 'OVERDUE',
                    },
                });
                logger.info('Generated alert statistics', { companyId });
                res.json({
                    shipmentsByStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
                    overdueInvoices,
                    alertsGenerated: true,
                });
            }
            catch (error) {
                logger.error('Failed to get statistics', { error: error?.message });
                res.status(500).json({
                    error: 'Failed to get alert statistics',
                    details: error?.message,
                });
            }
        });
        logger.info('✅ Smart Shipment Alerts patch successfully loaded');
    },
};
