"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
const rackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    rackType: zod_1.z.enum(['STORAGE', 'MATERIALS', 'EQUIPMENT']).optional(),
    location: zod_1.z.string().optional(),
    capacityTotal: zod_1.z.number().positive().optional(),
    categoryId: zod_1.z.string().optional(), // NEW: Category reference
    length: zod_1.z.number().positive().optional(),
    width: zod_1.z.number().positive().optional(),
    height: zod_1.z.number().positive().optional(),
    dimensionUnit: zod_1.z.enum(['CM', 'INCHES', 'METERS']).optional(),
});
// Get all racks
router.get('/', async (req, res) => {
    try {
        const { status, section, search } = req.query;
        const companyId = req.user.companyId;
        const where = { companyId };
        if (status) {
            where.status = status;
        }
        if (search) {
            where.code = { contains: search };
        }
        const racks = await prisma.rack.findMany({
            where,
            include: {
                inventory: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        color: true,
                        icon: true,
                    },
                },
                boxes: {
                    where: {
                        status: { in: ['IN_STORAGE', 'STORED'] } // Only count stored boxes
                    },
                    select: {
                        id: true,
                        shipmentId: true,
                        status: true,
                    },
                },
                _count: {
                    select: {
                        activities: true,
                    },
                },
            },
            orderBy: { code: 'asc' },
        });
        // Calculate utilization based on actual stored boxes
        const racksWithStats = racks.map((rack) => {
            const actualCapacityUsed = rack.boxes?.filter((box) => box.status === 'IN_STORAGE' || box.status === 'STORED').length || 0;
            return {
                ...rack,
                capacityUsed: actualCapacityUsed, // Override with actual count
                utilization: rack.capacityTotal > 0
                    ? Math.round((actualCapacityUsed / rack.capacityTotal) * 100)
                    : 0,
                status: actualCapacityUsed >= rack.capacityTotal ? 'FULL' : 'ACTIVE',
            };
        });
        res.json({ racks: racksWithStats });
    }
    catch (error) {
        console.error('Get racks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single rack
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const rack = await prisma.rack.findFirst({
            where: { id, companyId },
            include: {
                inventory: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        color: true,
                        icon: true,
                    },
                },
                boxes: {
                    where: {
                        status: { in: ['IN_STORAGE', 'STORED'] } // Only show boxes currently in storage
                    },
                    include: {
                        shipment: {
                            select: {
                                id: true,
                                referenceId: true,
                                shipper: true,
                                consignee: true,
                                status: true,
                            },
                        },
                    },
                },
                activities: {
                    orderBy: { timestamp: 'desc' },
                    take: 10,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        // Calculate actual capacity used
        const actualCapacityUsed = rack.boxes?.filter((box) => box.status === 'IN_STORAGE' || box.status === 'STORED').length || 0;
        const rackWithStats = {
            ...rack,
            capacityUsed: actualCapacityUsed,
            utilization: rack.capacityTotal > 0
                ? Math.round((actualCapacityUsed / rack.capacityTotal) * 100)
                : 0,
            status: actualCapacityUsed >= rack.capacityTotal ? 'FULL' : 'ACTIVE',
        };
        res.json({ rack: rackWithStats });
    }
    catch (error) {
        console.error('Get rack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create rack
router.post('/', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = rackSchema.parse(req.body);
        const companyId = req.user.companyId;
        // Check if rack code already exists
        const existing = await prisma.rack.findFirst({
            where: {
                code: data.code,
                companyId,
            },
        });
        if (existing) {
            return res.status(400).json({ error: 'Rack code already exists' });
        }
        // Validate categoryId if provided
        if (data.categoryId) {
            const category = await prisma.category.findFirst({
                where: {
                    id: data.categoryId,
                    companyId,
                },
            });
            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }
        }
        const rack = await prisma.rack.create({
            data: {
                code: data.code,
                rackType: data.rackType || 'STORAGE',
                location: data.location,
                categoryId: data.categoryId,
                length: data.length,
                width: data.width,
                height: data.height,
                dimensionUnit: data.dimensionUnit,
                companyId,
                qrCode: `QR-${data.code}`,
                capacityTotal: data.capacityTotal || 100,
                capacityUsed: 0,
                status: 'ACTIVE',
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        color: true,
                        icon: true,
                    },
                },
            },
        });
        res.status(201).json({ rack });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create rack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update rack
router.put('/:id', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const existing = await prisma.rack.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        // Validate categoryId if provided
        if (req.body.categoryId) {
            const category = await prisma.category.findFirst({
                where: {
                    id: req.body.categoryId,
                    companyId,
                },
            });
            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }
        }
        const rack = await prisma.rack.update({
            where: { id },
            data: req.body,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        color: true,
                        icon: true,
                    },
                },
            },
        });
        res.json({ rack });
    }
    catch (error) {
        console.error('Update rack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete rack
router.delete('/:id', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const existing = await prisma.rack.findFirst({
            where: { id, companyId },
            include: {
                boxes: {
                    where: { status: 'IN_STORAGE' },
                },
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        if (existing.boxes.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete rack with boxes in storage'
            });
        }
        await prisma.rack.delete({ where: { id } });
        res.json({ message: 'Rack deleted successfully' });
    }
    catch (error) {
        console.error('Delete rack error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
