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
// Bulk update CBM capacity for selected racks
// MOVED TO TOP to avoid route conflicts
router.post('/bulk-cbm-capacity', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        console.log('📦 Bulk CBM update request received:', req.body);
        const { rackIds, cbmCapacity, applyToAll } = req.body;
        const companyId = req.user.companyId;
        if (cbmCapacity === undefined || cbmCapacity === null) {
            return res.status(400).json({ error: 'CBM capacity is required' });
        }
        const cbmValue = parseFloat(cbmCapacity);
        if (isNaN(cbmValue) || cbmValue < 0) {
            return res.status(400).json({ error: 'Invalid CBM capacity value' });
        }
        let updateResult;
        if (applyToAll) {
            // Apply to all racks in company (using any to bypass TypeScript until schema syncs)
            updateResult = await prisma.rack.updateMany({
                where: {
                    companyId,
                    deletedAt: null
                },
                data: { cbmCapacity: cbmValue }
            });
        }
        else if (rackIds && Array.isArray(rackIds) && rackIds.length > 0) {
            // Apply to selected racks only
            updateResult = await prisma.rack.updateMany({
                where: {
                    id: { in: rackIds },
                    companyId,
                    deletedAt: null
                },
                data: { cbmCapacity: cbmValue }
            });
        }
        else {
            return res.status(400).json({ error: 'Either rackIds or applyToAll must be specified' });
        }
        console.log(`✅ Bulk CBM update: ${updateResult.count} racks updated to ${cbmValue} m³`);
        res.json({
            success: true,
            message: `Updated CBM capacity for ${updateResult.count} racks`,
            updatedCount: updateResult.count,
            cbmCapacity: cbmValue
        });
    }
    catch (error) {
        console.error('Bulk CBM update error:', error);
        res.status(500).json({ error: 'Failed to update CBM capacity' });
    }
});
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
    // NEW: Zone and capacity mode fields
    zone: zod_1.z.string().optional(),
    zoneDescription: zod_1.z.string().optional(),
    zoneIcon: zod_1.z.string().optional(), // Custom zone icon
    capacityMode: zod_1.z.enum(['FIXED', 'FLEXIBLE', 'UNLIMITED']).optional(),
    palletCapacity: zod_1.z.number().int().optional(),
    boxCapacity: zod_1.z.number().int().optional(),
    currentPallets: zod_1.z.number().int().optional(),
    currentBoxes: zod_1.z.number().int().optional(),
    capacityNotes: zod_1.z.string().optional(),
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
        const where = {
            companyId,
            deletedAt: null // Only return non-deleted racks
        };
        if (status) {
            where.status = status;
        }
        if (search) {
            // Handle underscore/hyphen variations (GROUND_D -> GROUND-D and vice versa)
            // MySQL is case-insensitive by default, so no mode needed
            const searchStr = search.toUpperCase();
            const searchWithHyphen = searchStr.replace(/_/g, '-');
            const searchWithUnderscore = searchStr.replace(/-/g, '_');
            where.OR = [
                { code: { contains: searchStr } },
                { code: { contains: searchWithHyphen } },
                { code: { contains: searchWithUnderscore } },
                { qrCode: { contains: searchStr } },
                { qrCode: { contains: searchWithHyphen } },
                { qrCode: { contains: searchWithUnderscore } },
            ];
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
                        status: { in: ['IN_STORAGE', 'IN_WAREHOUSE', 'STORED'] }, // Only count stored boxes
                        shipment: {
                            status: { notIn: ['RELEASED'] } // Exclude released shipments
                        }
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
        // Get CBM data for all racks via raw SQL (since not in Prisma schema)
        const cbmData = await prisma.$queryRaw `
      SELECT id, cbmCapacity, cbmUsed FROM racks WHERE companyId = ${companyId} AND deletedAt IS NULL
    `;
        const cbmMap = new Map(cbmData.map(r => [r.id, { cbmCapacity: Number(r.cbmCapacity) || 0, cbmUsed: Number(r.cbmUsed) || 0 }]));
        // Calculate utilization based on pallet usage rather than raw boxes
        const racksWithStats = racks.map((rack) => {
            const palletUsage = (0, rackCapacity_1.calculatePalletUsage)(rack.boxes || []);
            const cbm = cbmMap.get(rack.id) || { cbmCapacity: 0, cbmUsed: 0 };
            return {
                ...rack,
                capacityUsed: palletUsage,
                utilization: rack.capacityTotal > 0
                    ? Math.round((palletUsage / rack.capacityTotal) * 100)
                    : 0,
                // CBM data from raw SQL
                cbmCapacity: cbm.cbmCapacity,
                cbmUsed: cbm.cbmUsed,
                // Pass original DB status instead of overriding it
                // Frontend handles 'FULL' display based on utilization
                status: rack.status,
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
            where: {
                id,
                companyId,
                deletedAt: null // Only return non-deleted racks
            },
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
                        status: { in: ['IN_STORAGE', 'IN_WAREHOUSE', 'STORED'] }, // Only show boxes currently in storage
                        shipment: {
                            status: { notIn: ['RELEASED'] } // Exclude released shipments
                        }
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
                                cbm: true,
                                arrivalDate: true,
                                clientPhone: true,
                                companyProfile: {
                                    select: {
                                        id: true,
                                        name: true,
                                        logo: true,
                                    }
                                },
                                clientName: true,
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
        // Get CBM data via raw SQL (since not in Prisma schema)
        const cbmData = await prisma.$queryRaw `
      SELECT cbmCapacity, cbmUsed FROM racks WHERE id = ${id}
    `;
        const cbm = cbmData[0] || { cbmCapacity: 0, cbmUsed: 0 };
        // Calculate actual capacity used in pallet slots
        const palletUsage = (0, rackCapacity_1.calculatePalletUsage)(rack.boxes || []);
        const derivedStatus = palletUsage >= rack.capacityTotal ? 'FULL' : (rack.status || 'ACTIVE');
        const rackWithStats = {
            ...rack,
            capacityUsed: palletUsage,
            utilization: rack.capacityTotal > 0
                ? Math.round((palletUsage / rack.capacityTotal) * 100)
                : 0,
            cbmCapacity: Number(cbm.cbmCapacity) || 0,
            cbmUsed: Number(cbm.cbmUsed) || 0,
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
                // NEW: Zone and capacity fields
                zone: data.zone,
                zoneDescription: data.zoneDescription,
                capacityMode: data.capacityMode || 'FIXED',
                palletCapacity: data.palletCapacity,
                boxCapacity: data.boxCapacity,
                currentPallets: data.currentPallets || 0,
                currentBoxes: data.currentBoxes || 0,
                capacityNotes: data.capacityNotes,
                companyId,
                qrCode: `RACK_${data.code.replace(/-/g, '_')}`,
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
// Delete rack - with strict delete protection and audit logging
router.delete('/:id', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const existing = await prisma.rack.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            // Log failed deletion attempt
            await prisma.rackAuditLog.create({
                data: {
                    rackId: id,
                    action: 'DELETE',
                    status: 'FAILED',
                    message: 'Rack not found',
                    performedBy: userId,
                    companyId,
                },
            });
            return res.status(404).json({ error: 'Rack not found' });
        }
        // Check if ACTIVE boxes (IN_STORAGE) are allocated to this rack
        // Exclude RELEASED boxes - they no longer occupy the rack
        const activeBoxes = await prisma.shipmentBox.findMany({
            where: {
                rackId: id,
                status: 'IN_STORAGE', // Only check boxes currently in storage
            },
            select: {
                id: true,
                shipmentId: true,
                boxNumber: true,
                status: true,
            },
        });
        // Check if active boxes are allocated to this rack
        if (activeBoxes.length > 0) {
            // Log failed deletion due to allocated materials
            const boxDetails = activeBoxes.map(box => ({
                id: box.id,
                shipmentId: box.shipmentId,
                boxNumber: box.boxNumber,
                status: box.status,
            }));
            await prisma.rackAuditLog.create({
                data: {
                    rackId: id,
                    action: 'DELETE',
                    status: 'FAILED',
                    message: `Cannot delete: ${activeBoxes.length} box(es) currently in storage on this rack`,
                    details: JSON.stringify({
                        reason: 'MATERIALS_IN_STORAGE',
                        boxCount: activeBoxes.length,
                        boxes: boxDetails,
                    }),
                    performedBy: userId,
                    companyId,
                },
            });
            return res.status(400).json({
                error: `Cannot delete rack: ${activeBoxes.length} box(es) with materials are currently IN STORAGE`,
                details: {
                    reason: 'MATERIALS_IN_STORAGE',
                    boxCount: activeBoxes.length,
                    boxes: boxDetails,
                    message: 'Only boxes with status IN_STORAGE block deletion. Released boxes do not prevent deletion.',
                },
            });
        }
        // Perform soft delete
        const deletedRack = await prisma.rack.update({
            where: { id },
            data: { deletedAt: new Date() },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        // Log successful deletion
        await prisma.rackAuditLog.create({
            data: {
                rackId: id,
                action: 'DELETE',
                status: 'SUCCESS',
                message: `Rack "${existing.code}" successfully deleted (soft delete)`,
                details: JSON.stringify({
                    rackCode: existing.code,
                    rackType: existing.rackType,
                    location: existing.location,
                    deletedAt: deletedRack.deletedAt,
                }),
                performedBy: userId,
                companyId,
            },
        });
        res.json({
            message: 'Rack deleted successfully',
            rack: deletedRack,
        });
    }
    catch (error) {
        console.error('Delete rack error:', error);
        // Log error
        try {
            await prisma.rackAuditLog.create({
                data: {
                    rackId: req.params.id,
                    action: 'DELETE',
                    status: 'FAILED',
                    message: `Error during deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    performedBy: req.user.id,
                    companyId: req.user.companyId,
                },
            });
        }
        catch (logError) {
            console.error('Failed to log deletion error:', logError);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get audit trail for a specific rack
router.get('/:id/audit', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const { limit = 50, offset = 0 } = req.query;
        // Verify rack exists
        const rack = await prisma.rack.findFirst({
            where: { id, companyId },
            select: { id: true, code: true, companyId: true },
        });
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        // Get audit logs
        const auditLogs = await prisma.rackAuditLog.findMany({
            where: { rackId: id, companyId },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit) || 50,
            skip: parseInt(offset) || 0,
        });
        // Get total count
        const totalCount = await prisma.rackAuditLog.count({
            where: { rackId: id, companyId },
        });
        // Enrich logs with user information if available
        const enrichedLogs = auditLogs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null,
        }));
        res.json({
            rackId: id,
            rackCode: rack.code,
            totalLogs: totalCount,
            logs: enrichedLogs,
            pagination: {
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0,
                total: totalCount,
            },
        });
    }
    catch (error) {
        console.error('Get rack audit trail error:', error);
        res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
});
exports.default = router;
