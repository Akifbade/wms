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
                _count: {
                    select: {
                        shipments: {
                            where: { status: 'IN_STORAGE' } // Count only active shipments, exclude RELEASED
                        },
                        activities: true,
                    },
                },
            },
            orderBy: { code: 'asc' },
        });
        // Calculate utilization
        const racksWithStats = racks.map((rack) => ({
            ...rack,
            utilization: rack.capacityTotal > 0
                ? Math.round((rack.capacityUsed / rack.capacityTotal) * 100)
                : 0,
        }));
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
                shipments: {
                    where: {
                        status: 'IN_STORAGE' // Only show shipments currently in storage, exclude RELEASED
                    },
                    select: {
                        id: true,
                        referenceId: true,
                        clientName: true,
                        currentBoxCount: true,
                        status: true,
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
        res.json({ rack });
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
        const rack = await prisma.rack.create({
            data: {
                ...data,
                companyId,
                qrCode: `QR-${data.code}`,
                capacityTotal: data.capacityTotal || 100,
                capacityUsed: 0,
                status: 'ACTIVE',
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
        const rack = await prisma.rack.update({
            where: { id },
            data: req.body,
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
                shipments: true,
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        if (existing.shipments.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete rack with active shipments'
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
