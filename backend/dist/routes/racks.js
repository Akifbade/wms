"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const rackCapacity_1 = require("../utils/rackCapacity");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
const rackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    rackType: zod_1.z.enum(['STORAGE', 'MATERIALS', 'EQUIPMENT']).optional(),
    location: zod_1.z.string().optional(),
    capacityTotal: zod_1.z.number().positive().optional(),
    categoryId: zod_1.z.string().optional(), // NEW: Category reference
    companyProfileId: zod_1.z.string().optional(), // NEW: Company profile reference
    length: zod_1.z.number().positive().optional(),
    width: zod_1.z.number().positive().optional(),
    height: zod_1.z.number().positive().optional(),
    dimensionUnit: zod_1.z.enum(['CM', 'INCHES', 'METERS']).optional(),
});
// Get categories for rack assignment
router.get('/categories/list', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const profiles = await prisma.companyProfile.findMany({
            where: {
                companyId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                contractStatus: true,
                contactPerson: true,
                contactPhone: true,
            },
            orderBy: { name: 'asc' },
        });
        console.log('Loaded company profiles for racks dropdown', profiles.length, 'companyId:', companyId);
        res.json({
            categories: profiles.map(profile => ({
                id: profile.id,
                name: profile.name,
                description: profile.description,
                logo: profile.logo,
                // Frontend still expects optional color/icon fields when rendering badges
                color: '#5B21B6',
                icon: '????',
                contractStatus: profile.contractStatus,
                contactPerson: profile.contactPerson,
                contactPhone: profile.contactPhone,
            })),
        });
    }
    catch (error) {
        console.error('Get rack company profiles error:', error);
        res.status(500).json({ error: 'Failed to fetch company profiles' });
    }
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
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        description: true,
                        contractStatus: true,
                        contactPerson: true,
                        contactPhone: true,
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
                        boxNumber: true,
                        photos: true,
                        shipment: {
                            select: {
                                id: true,
                                boxesPerPallet: true,
                                palletCount: true,
                            },
                        },
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
        // Calculate utilization based on pallet usage rather than raw boxes
        const racksWithStats = racks.map((rack) => {
            const palletUsage = (0, rackCapacity_1.calculatePalletUsage)(rack.boxes || []);
            const derivedStatus = palletUsage >= rack.capacityTotal ? 'FULL' : (rack.status || 'ACTIVE');
            return {
                ...rack,
                capacityUsed: palletUsage,
                utilization: rack.capacityTotal > 0
                    ? Math.round((palletUsage / rack.capacityTotal) * 100)
                    : 0,
                status: derivedStatus,
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
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        description: true,
                        contactPerson: true,
                        contactPhone: true,
                        contractStatus: true,
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
                                boxesPerPallet: true,
                                palletCount: true,
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
        // Calculate actual capacity used in pallet slots
        const palletUsage = (0, rackCapacity_1.calculatePalletUsage)(rack.boxes || []);
        const derivedStatus = palletUsage >= rack.capacityTotal ? 'FULL' : (rack.status || 'ACTIVE');
        const rackWithStats = {
            ...rack,
            capacityUsed: palletUsage,
            utilization: rack.capacityTotal > 0
                ? Math.round((palletUsage / rack.capacityTotal) * 100)
                : 0,
            status: derivedStatus,
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
        // Validate companyProfileId if provided
        if (data.companyProfileId) {
            const companyProfile = await prisma.companyProfile.findFirst({
                where: {
                    id: data.companyProfileId,
                    companyId,
                },
            });
            if (!companyProfile) {
                return res.status(404).json({ error: 'Company profile not found' });
            }
        }
        const rack = await prisma.rack.create({
            data: {
                code: data.code,
                rackType: data.rackType || 'STORAGE',
                location: data.location,
                categoryId: data.categoryId,
                companyProfileId: data.companyProfileId,
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
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
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
        // Validate companyProfileId if provided
        if (req.body.companyProfileId) {
            const companyProfile = await prisma.companyProfile.findFirst({
                where: {
                    id: req.body.companyProfileId,
                    companyId,
                },
            });
            if (!companyProfile) {
                return res.status(404).json({ error: 'Company profile not found' });
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
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
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
