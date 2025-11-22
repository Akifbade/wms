import { PatchModule } from '../types';

const materialExpiryAlertPatch: PatchModule = {
    id: 'material-expiry-alert',
    description: 'Alert for materials nearing expiry date (7 days warning)',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger, prisma }) => {
        logger.info('Initializing material expiry monitoring...');

        const EXPIRY_WARNING_DAYS = 7; // Alert 7 days before expiry

        // Check expiring materials
        const checkExpiringMaterials = async () => {
            try {
                const now = new Date();
                const warningDate = new Date();
                warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

                // Find materials with expiry dates (if your schema has expiryDate field)
                // For now, using createdAt as demo (replace with actual expiry field)
                const materials = await prisma.material.findMany({
                    where: {
                        // Add your expiry date logic here
                        // expiryDate: { lte: warningDate, gte: now }
                    },
                    include: {
                        company: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                if (materials.length > 0) {
                    logger.warn(`Found ${materials.length} materials nearing expiry`);
                    materials.forEach((material) => {
                        logger.warn(
                            `Expiring soon: ${material.name} (${material.company?.name}) - Qty: ${material.quantity}`
                        );
                    });
                } else {
                    logger.info('No materials nearing expiry');
                }

                return materials;
            } catch (error: any) {
                logger.error(`Expiry check failed: ${error.message}`);
                return [];
            }
        };

        // Run check every 24 hours
        setInterval(checkExpiringMaterials, 24 * 60 * 60 * 1000);

        // Run initial check after 5 seconds
        setTimeout(checkExpiringMaterials, 5000);

        // API: Get expiring materials
        app.get('/plugins/material-expiry/check', async (req, res) => {
            try {
                const materials = await checkExpiringMaterials();
                res.json({
                    count: materials.length,
                    warningDays: EXPIRY_WARNING_DAYS,
                    materials: materials.map((m) => ({
                        id: m.id,
                        name: m.name,
                        quantity: m.quantity,
                        unit: m.unit,
                        company: m.company?.name,
                        // expiryDate: m.expiryDate, // Add this when field exists
                    })),
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Get materials by storage duration (how long stored)
        app.get('/plugins/material-expiry/old-stock', async (req, res) => {
            try {
                const daysOld = parseInt(req.query.days as string) || 30;
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysOld);

                const oldMaterials = await prisma.material.findMany({
                    where: {
                        createdAt: {
                            lte: cutoffDate,
                        },
                    },
                    include: {
                        company: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                    take: 50,
                });

                res.json({
                    count: oldMaterials.length,
                    daysThreshold: daysOld,
                    materials: oldMaterials.map((m) => ({
                        id: m.id,
                        name: m.name,
                        quantity: m.quantity,
                        unit: m.unit,
                        company: m.company?.name,
                        storageDuration: Math.floor(
                            (Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24)
                        ),
                        createdAt: m.createdAt,
                    })),
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Get material storage statistics
        app.get('/plugins/material-expiry/stats', async (req, res) => {
            try {
                const totalMaterials = await prisma.material.count();

                // Materials stored > 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const oldStock = await prisma.material.count({
                    where: {
                        createdAt: {
                            lte: thirtyDaysAgo,
                        },
                    },
                });

                // Materials stored > 90 days
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const veryOldStock = await prisma.material.count({
                    where: {
                        createdAt: {
                            lte: ninetyDaysAgo,
                        },
                    },
                });

                res.json({
                    totalMaterials,
                    oldStock30Days: oldStock,
                    veryOldStock90Days: veryOldStock,
                    percentageOld: totalMaterials > 0 ? ((oldStock / totalMaterials) * 100).toFixed(2) : 0,
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        logger.info('Material expiry monitoring active (checking every 24 hours)');
    },
};

export default materialExpiryAlertPatch;
