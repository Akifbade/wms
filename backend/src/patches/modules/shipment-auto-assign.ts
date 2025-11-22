import { PatchModule } from '../types';

const shipmentAutoAssignPatch: PatchModule = {
    id: 'shipment-auto-assign',
    description: 'Smart rack allocation for new shipments',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger, prisma }) => {
        logger.info('Initializing smart shipment assignment...');

        // API endpoint to get shipment statistics (public)
        app.get('/plugins/auto-assign/stats', async (req, res) => {
            try {
                const totalShipments = await prisma.shipment.count();
                const totalRacks = await prisma.rack.count();

                res.json({
                    totalShipments,
                    totalRacks,
                    averagePerRack: totalRacks > 0 ? (totalShipments / totalRacks).toFixed(2) : 0,
                    message: 'Auto-assign plugin active',
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        logger.info('Smart shipment stats API active');
    },
};

export default shipmentAutoAssignPatch;
