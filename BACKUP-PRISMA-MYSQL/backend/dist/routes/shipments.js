"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Validation schema
const shipmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    referenceId: zod_1.z.string(),
    originalBoxCount: zod_1.z.number().int().positive(),
    type: zod_1.z.enum(['PERSONAL', 'COMMERCIAL']),
    clientName: zod_1.z.string().optional(),
    clientPhone: zod_1.z.string().optional(),
    rackId: zod_1.z.string().optional(),
});
// Get all shipments
router.get('/', async (req, res) => {
    try {
        const { status, search, isWarehouseShipment, page = '1', limit = '50' } = req.query;
        const companyId = req.user.companyId;
        const where = { companyId };
        if (status) {
            where.status = status;
        }
        if (isWarehouseShipment !== undefined) {
            where.isWarehouseShipment = isWarehouseShipment === 'true';
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { referenceId: { contains: search } },
                { clientName: { contains: search } },
            ];
        }
        const [shipments, total] = await Promise.all([
            prisma.shipment.findMany({
                where,
                include: {
                    rack: {
                        select: {
                            id: true,
                            code: true,
                            location: true,
                        },
                    },
                    boxes: {
                        select: {
                            id: true,
                            boxNumber: true,
                            status: true,
                            rackId: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma.shipment.count({ where }),
        ]);
        // Add computed box counts and rack locations to each shipment
        const shipmentsWithCounts = await Promise.all(shipments.map(async (shipment) => {
            const totalBoxes = shipment.boxes.length;
            const assignedBoxes = shipment.boxes.filter((b) => b.rackId !== null).length;
            const releasedBoxes = shipment.boxes.filter((b) => b.status === 'RELEASED').length;
            const inStorageBoxes = shipment.boxes.filter((b) => b.status === 'IN_STORAGE').length;
            // Get unique rack codes where boxes are located
            const rackIds = [...new Set(shipment.boxes.filter((b) => b.rackId).map((b) => b.rackId))];
            const racks = rackIds.length > 0 ? await prisma.rack.findMany({
                where: { id: { in: rackIds } },
                select: { code: true }
            }) : [];
            const rackCodes = racks.map(r => r.code).join(', ');
            return {
                ...shipment,
                totalBoxes,
                assignedBoxes,
                releasedBoxes,
                inStorageBoxes,
                rackLocations: rackCodes || null, // Comma-separated rack codes
                // Don't override currentBoxCount - it's the source of truth from database
            };
        }));
        res.json({
            shipments: shipmentsWithCounts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get shipments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single shipment
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const shipment = await prisma.shipment.findFirst({
            where: { id, companyId },
            include: {
                rack: true,
                boxes: {
                    include: {
                        rack: {
                            select: {
                                code: true,
                                location: true,
                            },
                        },
                    },
                    orderBy: { boxNumber: 'asc' },
                },
                withdrawals: {
                    orderBy: { withdrawalDate: 'desc' },
                },
            },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // Add computed box counts
        const totalBoxes = shipment.boxes.length;
        const assignedBoxes = shipment.boxes.filter((b) => b.rackId !== null).length;
        const releasedBoxes = shipment.boxes.filter((b) => b.status === 'RELEASED').length;
        const inStorageBoxes = shipment.boxes.filter((b) => b.status === 'IN_STORAGE').length;
        res.json({
            shipment: {
                ...shipment,
                totalBoxes,
                assignedBoxes,
                releasedBoxes,
                inStorageBoxes,
                // Don't override currentBoxCount - it's the source of truth
            },
        });
    }
    catch (error) {
        console.error('Get shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create shipment
router.post('/', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const totalBoxCount = data.totalBoxCount || data.originalBoxCount;
        // 🚀 FETCH SHIPMENT SETTINGS
        let settings = await prisma.shipmentSettings.findUnique({
            where: { companyId }
        });
        // Create default settings if not exist
        if (!settings) {
            settings = await prisma.shipmentSettings.create({
                data: { companyId }
            });
        }
        // ✅ VALIDATE REQUIRED FIELDS BASED ON SETTINGS
        if (settings.requireClientEmail && !data.clientEmail) {
            return res.status(400).json({ error: 'Client email is required by company settings' });
        }
        if (settings.requireClientPhone && !data.clientPhone) {
            return res.status(400).json({ error: 'Client phone is required by company settings' });
        }
        if (settings.requireEstimatedValue && !data.estimatedValue) {
            return res.status(400).json({ error: 'Estimated value is required by company settings' });
        }
        if (settings.requireRackAssignment && !data.rackId) {
            return res.status(400).json({ error: 'Rack assignment is required by company settings' });
        }
        // Generate master QR code for shipment using settings prefix
        const qrPrefix = settings.autoGenerateQR ? settings.qrCodePrefix : 'QR-SH';
        const masterQR = `${qrPrefix}-${Date.now()}`;
        // 🚀 USE DEFAULT STORAGE TYPE FROM SETTINGS IF NOT PROVIDED
        const shipmentType = data.type || settings.defaultStorageType;
        const shipment = await prisma.shipment.create({
            data: {
                name: data.name || `Shipment for ${data.clientName}`,
                referenceId: data.referenceId || `SH-${Date.now()}`,
                originalBoxCount: totalBoxCount,
                currentBoxCount: data.currentBoxCount || totalBoxCount,
                type: shipmentType, // 🚀 FROM SETTINGS
                clientName: data.clientName,
                clientPhone: data.clientPhone,
                clientEmail: data.clientEmail,
                description: data.description,
                estimatedValue: data.estimatedValue,
                notes: data.notes,
                rackId: data.rackId,
                companyId,
                qrCode: masterQR,
                arrivalDate: new Date(),
                status: data.rackId ? 'IN_STORAGE' : 'PENDING', // ✅ PENDING if no rack, IN_STORAGE if rack assigned
                createdById: userId, // User ID who created
                assignedById: data.rackId ? userId : null, // Track who assigned if rack is provided
                assignedAt: data.rackId ? new Date() : null,
            },
            include: { rack: true },
        });
        // ✅ CREATE INDIVIDUAL QR CODES FOR EACH BOX
        const boxesToCreate = [];
        for (let i = 1; i <= totalBoxCount; i++) {
            boxesToCreate.push({
                shipmentId: shipment.id,
                boxNumber: i,
                qrCode: `${masterQR}-BOX-${i}`,
                rackId: data.rackId || null, // Assign to rack if provided
                status: data.rackId ? 'IN_STORAGE' : 'PENDING', // ✅ PENDING if no rack, IN_STORAGE if rack assigned
                assignedAt: data.rackId ? new Date() : null,
                companyId,
            });
        }
        await prisma.shipmentBox.createMany({
            data: boxesToCreate,
        });
        // If rack assigned, update rack capacity
        if (data.rackId) {
            await prisma.rack.update({
                where: { id: data.rackId },
                data: {
                    capacityUsed: { increment: data.originalBoxCount },
                    lastActivity: new Date(),
                },
            });
            // Create rack inventory entry
            await prisma.rackInventory.create({
                data: {
                    rackId: data.rackId,
                    companyId,
                    itemType: 'SHIPMENT',
                    itemId: shipment.id,
                    quantityCurrent: data.originalBoxCount,
                },
            });
            // Log activity
            await prisma.rackActivity.create({
                data: {
                    rackId: data.rackId,
                    userId: req.user.id,
                    companyId,
                    activityType: 'ASSIGN',
                    itemDetails: `Shipment ${data.referenceId} - ${data.originalBoxCount} boxes`,
                    quantityAfter: data.originalBoxCount,
                },
            });
        }
        res.status(201).json({ shipment });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update shipment
router.put('/:id', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const userId = req.user.id;
        const existing = await prisma.shipment.findFirst({
            where: { id, companyId },
            include: { rack: true }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // If shipment is being RELEASED, clear the rack assignment
        const updateData = {
            ...req.body
        };
        if (req.body.status === 'RELEASED' && existing.rackId) {
            updateData.rackId = null; // Remove from rack
            updateData.releasedAt = new Date();
            updateData.releasedById = userId; // Track who released
            // Update rack capacity (decrease by released boxes)
            const boxesToRelease = req.body.currentBoxCount !== undefined
                ? existing.currentBoxCount - req.body.currentBoxCount
                : existing.currentBoxCount;
            await prisma.rack.update({
                where: { id: existing.rackId },
                data: {
                    capacityUsed: {
                        decrement: boxesToRelease
                    }
                }
            });
        }
        const shipment = await prisma.shipment.update({
            where: { id },
            data: updateData,
            include: { rack: true },
        });
        res.json({ shipment });
    }
    catch (error) {
        console.error('Update shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get shipment boxes with QR codes
router.get('/:id/boxes', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const boxes = await prisma.shipmentBox.findMany({
            where: {
                shipmentId: id,
                companyId
            },
            include: {
                rack: {
                    select: {
                        id: true,
                        code: true,
                        location: true,
                    },
                },
            },
            orderBy: { boxNumber: 'asc' },
        });
        res.json({ boxes });
    }
    catch (error) {
        console.error('Get shipment boxes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Assign boxes to rack (for scanner & manual)
router.post('/:id/assign-boxes', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER', 'WORKER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rackId, boxNumbers } = req.body; // boxNumbers = [1,2,3]
        const companyId = req.user.companyId;
        if (!rackId || !boxNumbers || boxNumbers.length === 0) {
            return res.status(400).json({ error: 'Rack ID and box numbers required' });
        }
        // Update boxes
        await prisma.shipmentBox.updateMany({
            where: {
                shipmentId: id,
                boxNumber: { in: boxNumbers },
                companyId,
            },
            data: {
                rackId,
                status: 'IN_STORAGE',
                assignedAt: new Date(),
            },
        });
        // Update rack capacity
        await prisma.rack.update({
            where: { id: rackId },
            data: {
                capacityUsed: { increment: boxNumbers.length },
                lastActivity: new Date(),
            },
        });
        // Check if all boxes are now assigned
        const allBoxes = await prisma.shipmentBox.findMany({
            where: { shipmentId: id, companyId },
            select: { rackId: true },
        });
        const allAssigned = allBoxes.every(box => box.rackId !== null);
        // Update shipment status if all boxes are assigned
        if (allAssigned) {
            await prisma.shipment.update({
                where: { id },
                data: {
                    status: 'IN_STORAGE',
                    assignedAt: new Date(),
                },
            });
        }
        // Log activity
        await prisma.rackActivity.create({
            data: {
                rackId,
                userId: req.user.id,
                companyId,
                activityType: 'ASSIGN',
                itemDetails: `${boxNumbers.length} boxes from shipment ${id}`,
                quantityAfter: boxNumbers.length,
            },
        });
        res.json({ success: true, assigned: boxNumbers.length });
    }
    catch (error) {
        console.error('Assign boxes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Release boxes from shipment
router.post('/:id/release-boxes', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { boxNumbers, releaseAll, collectorID, releasePhotos } = req.body; // boxNumbers = [1,2,3] or releaseAll = true
        const companyId = req.user.companyId;
        // 🚀 FETCH SHIPMENT SETTINGS
        let settings = await prisma.shipmentSettings.findUnique({
            where: { companyId }
        });
        if (!settings) {
            settings = await prisma.shipmentSettings.create({
                data: { companyId }
            });
        }
        // ✅ VALIDATE RELEASE REQUIREMENTS BASED ON SETTINGS
        if (settings.requireIDVerification && !collectorID) {
            return res.status(400).json({ error: 'Collector ID verification is required by company settings' });
        }
        if (settings.requireReleasePhotos && (!releasePhotos || releasePhotos.length === 0)) {
            return res.status(400).json({ error: 'Release photos are required by company settings' });
        }
        // Get shipment with boxes
        const shipment = await prisma.shipment.findFirst({
            where: { id, companyId },
            include: {
                boxes: {
                    include: { rack: true },
                },
            },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // ✅ CHECK PARTIAL RELEASE SETTINGS
        if (!releaseAll && !settings.allowPartialRelease) {
            return res.status(400).json({ error: 'Partial release is not allowed by company settings' });
        }
        if (!releaseAll && boxNumbers && boxNumbers.length < settings.partialReleaseMinBoxes) {
            return res.status(400).json({
                error: `Minimum ${settings.partialReleaseMinBoxes} boxes required for partial release`
            });
        }
        // Determine which boxes to release
        const boxesToRelease = releaseAll
            ? shipment.boxes.filter((b) => b.status === 'IN_STORAGE')
            : shipment.boxes.filter((b) => boxNumbers.includes(b.boxNumber) && b.status === 'IN_STORAGE');
        if (boxesToRelease.length === 0) {
            return res.status(400).json({ error: 'No boxes available to release' });
        }
        // Group boxes by rack to update capacity
        const rackUpdates = {};
        boxesToRelease.forEach((box) => {
            if (box.rackId) {
                rackUpdates[box.rackId] = (rackUpdates[box.rackId] || 0) + 1;
            }
        });
        // Update boxes to RELEASED status
        await prisma.shipmentBox.updateMany({
            where: {
                shipmentId: id,
                boxNumber: { in: boxesToRelease.map((b) => b.boxNumber) },
            },
            data: {
                status: 'RELEASED',
                releasedAt: new Date(),
                rackId: null, // Remove from rack
            },
        });
        // Update rack capacities
        for (const [rackId, count] of Object.entries(rackUpdates)) {
            await prisma.rack.update({
                where: { id: rackId },
                data: {
                    capacityUsed: { decrement: count },
                    lastActivity: new Date(),
                },
            });
            // Log activity
            await prisma.rackActivity.create({
                data: {
                    rackId,
                    userId: req.user.id,
                    companyId,
                    activityType: 'RELEASE',
                    itemDetails: `Released ${count} boxes from shipment ${shipment.referenceId}`,
                    quantityAfter: count,
                },
            });
        }
        // Check if all boxes are released
        const remainingBoxes = shipment.boxes.filter((b) => !boxesToRelease.some((rb) => rb.id === b.id) && b.status === 'IN_STORAGE');
        // Update shipment status
        const newStatus = remainingBoxes.length === 0 ? 'RELEASED' : 'PARTIAL';
        await prisma.shipment.update({
            where: { id },
            data: {
                status: newStatus,
                releasedAt: remainingBoxes.length === 0 ? new Date() : null,
                currentBoxCount: remainingBoxes.length,
            },
        });
        // 🚀 CALCULATE CHARGES BASED ON SETTINGS
        let totalCharges = 0;
        if (settings.generateReleaseInvoice) {
            const storageDays = Math.ceil((new Date().getTime() - new Date(shipment.arrivalDate).getTime()) / (1000 * 60 * 60 * 24));
            const chargeableDays = Math.max(storageDays, settings.minimumChargeDays);
            // Storage charges
            totalCharges += chargeableDays * settings.storageRatePerDay;
            if (settings.storageRatePerBox > 0) {
                totalCharges += boxesToRelease.length * settings.storageRatePerBox;
            }
            // Release fees
            totalCharges += settings.releaseHandlingFee;
            totalCharges += boxesToRelease.length * settings.releasePerBoxFee;
            totalCharges += settings.releaseTransportFee;
        }
        // 🚀 SEND NOTIFICATION IF ENABLED
        let notificationSent = false;
        if (settings.notifyClientOnRelease && shipment.clientPhone) {
            // TODO: Integrate with notification service
            notificationSent = true;
            console.log(`📱 Notification sent to ${shipment.clientPhone}: ${boxesToRelease.length} boxes released`);
        }
        res.json({
            success: true,
            releasedCount: boxesToRelease.length,
            remainingCount: remainingBoxes.length,
            shipmentStatus: newStatus,
            charges: settings.generateReleaseInvoice ? {
                total: totalCharges,
                currency: 'KWD',
                breakdown: {
                    storage: settings.storageRatePerDay * Math.max(1, settings.minimumChargeDays),
                    boxes: boxesToRelease.length * settings.storageRatePerBox,
                    handling: settings.releaseHandlingFee,
                    perBox: boxesToRelease.length * settings.releasePerBoxFee,
                    transport: settings.releaseTransportFee
                }
            } : undefined,
            notificationSent
        });
    }
    catch (error) {
        console.error('Release boxes error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete shipment
router.delete('/:id', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const existing = await prisma.shipment.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        await prisma.shipment.delete({ where: { id } });
        res.json({ message: 'Shipment deleted successfully' });
    }
    catch (error) {
        console.error('Delete shipment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
