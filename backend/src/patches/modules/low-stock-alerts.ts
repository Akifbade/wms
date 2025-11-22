import { PatchModule } from '../types';

const lowStockAlertsPatch: PatchModule = {
    id: 'low-stock-alerts',
    description: 'Real-time monitoring and alerts for materials below stock threshold',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger, prisma }) => {
        logger.info('Initializing stock monitoring...');

        const LOW_STOCK_THRESHOLD = 10;

        // Immediate check on startup
        const checkStock = async () => {
            try {
                const lowStockMaterials = await prisma.material.findMany({
                    where: {
                        quantity: {
                            lt: LOW_STOCK_THRESHOLD,
                        },
                    },
                    include: {
                        company: true,
                    },
                });

                if (lowStockMaterials.length > 0) {
                    logger.warn(`Found ${lowStockMaterials.length} materials with low stock`);
                    lowStockMaterials.forEach((material) => {
                        logger.warn(
                            `Low stock: ${material.name} (${material.company?.name}): ${material.quantity} ${material.unit}`
                        );
                    });
                } else {
                    logger.info('All materials have sufficient stock');
                }
            } catch (error: any) {
                logger.error(`Stock check failed: ${error.message}`);
            }
        };

        // Run immediately (wait 5 seconds for full initialization)
        setTimeout(() => checkStock(), 5000);

        // Check stock levels every 1 hour
        setInterval(checkStock, 60 * 60 * 1000);

        // API endpoint (public for monitoring)
        app.get('/plugins/low-stock-alerts', async (req, res) => {
            try {
                const lowStock = await prisma.material.findMany({
                    where: {
                        quantity: {
                            lt: LOW_STOCK_THRESHOLD,
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
                        quantity: 'asc',
                    },
                });

                res.json({
                    count: lowStock.length,
                    threshold: LOW_STOCK_THRESHOLD,
                    materials: lowStock,
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        logger.info('Stock monitoring active (checking every hour)');
    },
};

export default lowStockAlertsPatch;
