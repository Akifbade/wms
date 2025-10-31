"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Get pending shipments for rack assignment
router.get('/worker/pending', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { category, priority = 'all' } = req.query;
        const where = {
            companyId,
            isWarehouseShipment: true,
        };
        // Filter by category if provided
        if (category && category !== 'all') {
            where.category = category;
        }
        // Get shipments with pending boxes
        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                boxes: {
                    where: {
                        status: 'PENDING', // Only pending boxes
                    },
                    select: {
                        id: true,
                        boxNumber: true,
                        qrCode: true,
                        status: true,
                        pieceWeight: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        itemName: true,
                        category: true,
                        quantity: true,
                    },
                },
            },
            orderBy: { arrivalDate: 'asc' }, // Oldest first
        });
        // Filter only shipments that have pending boxes
        const pendingShipments = shipments
            .filter(s => s.boxes.length > 0)
            .map(shipment => {
            // Parse items
            const items = shipment.items.map(item => ({
                ...item,
            }));
            return {
                id: shipment.id,
                name: shipment.name,
                referenceId: shipment.referenceId,
                customerName: shipment.shipper,
                category: 'WAREHOUSE',
                awbNumber: shipment.referenceId,
                arrivalDate: shipment.arrivalDate,
                totalBoxes: shipment.originalBoxCount,
                pendingBoxes: shipment.boxes.length,
                boxes: shipment.boxes,
                items,
                // Priority calculation (older = higher priority)
                daysSinceArrival: Math.floor((Date.now() - new Date(shipment.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)),
            };
        });
        // Sort by priority
        if (priority === 'high') {
            pendingShipments.sort((a, b) => b.daysSinceArrival - a.daysSinceArrival);
        }
        else if (priority === 'low') {
            pendingShipments.sort((a, b) => a.daysSinceArrival - b.daysSinceArrival);
        }
        res.json({
            pendingShipments,
            total: pendingShipments.length,
            totalPendingBoxes: pendingShipments.reduce((sum, s) => sum + s.pendingBoxes, 0),
        });
    }
    catch (error) {
        console.error('Error fetching pending shipments:', error);
        res.status(500).json({ error: 'Failed to fetch pending shipments' });
    }
});
// Get today's worker tasks
router.get('/worker/tasks', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Get today's rack activities by this user
        const activities = await prisma.rackActivity.findMany({
            where: {
                companyId,
                userId,
                timestamp: {
                    gte: today,
                },
            },
            include: {
                rack: {
                    select: {
                        code: true,
                        location: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });
        // Get shipments assigned today
        const assignedToday = await prisma.shipmentBox.findMany({
            where: {
                companyId,
                assignedAt: {
                    gte: today,
                },
            },
            include: {
                shipment: {
                    select: {
                        id: true,
                        name: true,
                        referenceId: true,
                        shipper: true,
                    },
                },
                rack: {
                    select: {
                        code: true,
                        location: true,
                    },
                },
            },
        });
        // Get pending count
        const pendingCount = await prisma.shipmentBox.count({
            where: {
                companyId,
                status: 'PENDING',
            },
        });
        res.json({
            activities: activities.map(a => ({
                ...a,
                itemDetails: a.itemDetails,
            })),
            assignedToday: assignedToday.length,
            activitiesToday: activities.length,
            pendingBoxes: pendingCount,
            assignmentDetails: assignedToday.map(box => ({
                shipmentName: box.shipment.name,
                customerName: box.shipment.shipper,
                boxNumber: box.boxNumber,
                rackCode: box.rack?.code,
                rackLocation: box.rack?.location,
                assignedAt: box.assignedAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching worker tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});
// Quick assign boxes to rack
router.post('/worker/quick-assign', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const { boxIds, rackId } = req.body;
        if (!Array.isArray(boxIds) || boxIds.length === 0) {
            return res.status(400).json({ error: 'Box IDs array is required' });
        }
        if (!rackId) {
            return res.status(400).json({ error: 'Rack ID is required' });
        }
        // Verify rack exists and has capacity
        const rack = await prisma.rack.findFirst({
            where: { id: rackId, companyId },
        });
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        // Check current capacity
        const currentBoxes = await prisma.shipmentBox.count({
            where: { rackId, status: 'IN_STORAGE' },
        });
        if (currentBoxes + boxIds.length > rack.capacityTotal) {
            return res.status(400).json({
                error: 'Rack capacity exceeded',
                available: rack.capacityTotal - currentBoxes,
                requested: boxIds.length,
            });
        }
        // Verify all boxes belong to company and are pending
        const boxes = await prisma.shipmentBox.findMany({
            where: {
                id: { in: boxIds },
                companyId,
                status: 'PENDING',
            },
            include: {
                shipment: true,
            },
        });
        if (boxes.length !== boxIds.length) {
            return res.status(400).json({
                error: 'Some boxes are not found or already assigned',
            });
        }
        // Perform assignment in transaction
        const result = await prisma.$transaction(async (tx) => {
            const now = new Date();
            // Update boxes
            await tx.shipmentBox.updateMany({
                where: { id: { in: boxIds } },
                data: {
                    rackId,
                    status: 'IN_STORAGE',
                    assignedAt: now,
                },
            });
            // Create rack activities for each box
            const activities = await Promise.all(boxes.map(box => tx.rackActivity.create({
                data: {
                    rackId,
                    userId,
                    companyId,
                    activityType: 'ASSIGN',
                    itemDetails: `Assigned box #${box.boxNumber} from shipment ${box.shipment.name}`,
                    timestamp: now,
                },
            })));
            // Update shipment status for each affected shipment
            const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];
            for (const shipmentId of shipmentIds) {
                const shipment = await tx.shipment.findUnique({
                    where: { id: shipmentId },
                    include: { boxes: true },
                });
                if (shipment) {
                    const allAssigned = shipment.boxes.every(b => boxIds.includes(b.id) || b.status === 'IN_STORAGE');
                    const someAssigned = shipment.boxes.some(b => boxIds.includes(b.id) || b.status === 'IN_STORAGE');
                    await tx.shipment.update({
                        where: { id: shipmentId },
                        data: {
                            status: allAssigned ? 'ACTIVE' : someAssigned ? 'PARTIAL' : 'ACTIVE',
                            assignedAt: allAssigned ? now : shipment.assignedAt,
                            assignedById: userId,
                        },
                    });
                }
            }
            return { activities, updatedBoxes: boxes.length };
        });
        res.json({
            message: 'Boxes assigned successfully',
            assignedCount: result.updatedBoxes,
            rackCode: rack.code,
            rackLocation: rack.location,
        });
    }
    catch (error) {
        console.error('Error in quick assign:', error);
        res.status(500).json({ error: 'Failed to assign boxes' });
    }
});
// Mark task as complete
router.post('/worker/complete/:activityId', async (req, res) => {
    try {
        const { activityId } = req.params;
        const companyId = req.user.companyId;
        const { notes } = req.body;
        // Verify activity belongs to company
        const activity = await prisma.rackActivity.findFirst({
            where: { id: activityId, companyId },
        });
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        // Update notes if provided
        if (notes) {
            await prisma.rackActivity.update({
                where: { id: activityId },
                data: { notes },
            });
        }
        res.json({ message: 'Task marked as complete' });
    }
    catch (error) {
        console.error('Error marking task complete:', error);
        res.status(500).json({ error: 'Failed to mark task complete' });
    }
});
// Get available racks for assignment
router.get('/worker/available-racks', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { minCapacity = '1' } = req.query;
        const racks = await prisma.rack.findMany({
            where: { companyId },
            include: {
                boxes: {
                    where: { status: 'IN_STORAGE' },
                    select: { id: true },
                },
            },
            orderBy: [{ location: 'asc' }, { code: 'asc' }],
        });
        // Calculate available capacity
        const availableRacks = racks
            .map(rack => ({
            id: rack.id,
            code: rack.code,
            location: rack.location,
            capacity: rack.capacityTotal,
            currentBoxes: rack.boxes.length,
            availableCapacity: rack.capacityTotal - rack.boxes.length,
            utilizationPercent: Math.round((rack.boxes.length / rack.capacityTotal) * 100),
            qrCode: rack.qrCode,
        }))
            .filter(rack => rack.availableCapacity >= parseInt(minCapacity))
            .sort((a, b) => b.availableCapacity - a.availableCapacity); // Most available first
        res.json({ racks: availableRacks });
    }
    catch (error) {
        console.error('Error fetching available racks:', error);
        res.status(500).json({ error: 'Failed to fetch available racks' });
    }
});
exports.default = router;
