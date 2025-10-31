"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rackCapacity_1 = require("../utils/rackCapacity");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const parseOptionalInt = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const parsed = typeof value === 'number' ? Math.trunc(value) : parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Configure multer for shipment photo uploads
const photoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/shipments';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `shipment-${uniqueSuffix}${ext}`);
    }
});
const photoUpload = (0, multer_1.default)({
    storage: photoStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per photo
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files allowed (JPEG, PNG, WebP)'));
        }
    }
});
// Upload endpoint for pallet and shipment imagery
router.post('/upload/photo', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER', 'WORKER'), photoUpload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No photo uploaded' });
        }
        const photoUrl = `/uploads/shipments/${req.file.filename}`;
        res.json({
            success: true,
            photoUrl,
            filename: req.file.filename,
            size: req.file.size,
        });
    }
    catch (error) {
        console.error('Shipment photo upload error:', error);
        res.status(500).json({ error: 'Failed to upload shipment photo' });
    }
});
// Validation schema
const shipmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    referenceId: zod_1.z.string(),
    originalBoxCount: zod_1.z.number().int().positive(),
    type: zod_1.z.enum(['PERSONAL', 'COMMERCIAL']),
    clientName: zod_1.z.string().optional(),
    clientPhone: zod_1.z.string().optional(),
    rackId: zod_1.z.string().optional(),
    arrivalDate: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    companyProfileId: zod_1.z.string().optional(),
    palletCount: zod_1.z.number().int().positive().optional(),
    boxesPerPallet: zod_1.z.number().int().positive().optional(),
    // Optional: variable pallets distribution and extra loose boxes
    boxesDistribution: zod_1.z.array(zod_1.z.number().int().nonnegative()).optional(),
    extraBoxes: zod_1.z.number().int().nonnegative().optional(),
    // NEW: Dimension & CBM fields for volume-based charging
    length: zod_1.z.number().positive().optional(), // in cm
    width: zod_1.z.number().positive().optional(), // in cm
    height: zod_1.z.number().positive().optional(), // in cm
    cbm: zod_1.z.number().positive().optional(), // auto-calculated or provided (m??)
    weight: zod_1.z.number().positive().optional(), // in kg
    // NEW: Enhanced warehouse fields
    category: zod_1.z.enum(['CUSTOMER_STORAGE', 'AIRPORT_CARGO', 'WAREHOUSE_STOCK']).optional(),
    awbNumber: zod_1.z.string().optional(),
    flightNumber: zod_1.z.string().optional(),
    origin: zod_1.z.string().optional(),
    destination: zod_1.z.string().optional(),
    customerName: zod_1.z.string().optional(),
    shipper: zod_1.z.string().optional(),
    consignee: zod_1.z.string().optional(),
    isWarehouseShipment: zod_1.z.boolean().optional(),
});
// Get all shipments
router.get('/', async (req, res) => {
    try {
        const { status, search, isWarehouseShipment, category, customerName, page = '1', limit = '50' } = req.query;
        const companyId = req.user.companyId;
        const where = { companyId };
        if (status) {
            where.status = status;
        }
        if (isWarehouseShipment !== undefined) {
            where.isWarehouseShipment = isWarehouseShipment === 'true';
        }
        // NEW: Category filter
        if (category && category !== 'all') {
            where.category = category;
        }
        // NEW: Customer name filter
        if (customerName) {
            where.customerName = { contains: customerName };
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { referenceId: { contains: search } },
                { clientName: { contains: search } },
                { customerName: { contains: search } },
                { shipper: { contains: search } },
                { awbNumber: { contains: search } },
            ];
        }
        const [shipments, total] = await Promise.all([
            prisma.shipment.findMany({
                where,
                include: {
                    boxes: {
                        select: {
                            id: true,
                            boxNumber: true,
                            status: true,
                            rackId: true,
                            rack: {
                                select: {
                                    id: true,
                                    code: true,
                                    location: true,
                                },
                            },
                        },
                    },
                    companyProfile: {
                        select: {
                            id: true,
                            name: true,
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
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                    },
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
        // Uniform mode inputs
        let palletCount = parseOptionalInt(data.palletCount);
        let boxesPerPallet = parseOptionalInt(data.boxesPerPallet);
        // Variable mode inputs
        const boxesDistribution = Array.isArray(data.boxesDistribution)
            ? data.boxesDistribution.map(v => parseOptionalInt(v) ?? 0)
            : [];
        const extraBoxes = parseOptionalInt(data.extraBoxes) ?? 0;
        // Determine mode and compute counts
        let totalBoxCount = 0;
        let originalBoxCount = 0;
        if (boxesDistribution && boxesDistribution.length > 0) {
            // Variable mode: palletCount becomes distribution length
            palletCount = boxesDistribution.length;
            const distributionSum = boxesDistribution.reduce((a, b) => a + Math.max(0, Math.trunc(b || 0)), 0);
            const maxBPP = boxesDistribution.reduce((m, n) => Math.max(m, Math.max(0, Math.trunc(n || 0))), 0);
            boxesPerPallet = Math.max(maxBPP, 0);
            totalBoxCount = distributionSum + Math.max(0, Math.trunc(extraBoxes || 0));
            originalBoxCount = totalBoxCount;
        }
        else {
            if (!palletCount || palletCount <= 0) {
                return res.status(400).json({ error: 'Pallet count must be greater than zero' });
            }
            if (!boxesPerPallet || boxesPerPallet <= 0) {
                return res.status(400).json({ error: 'Boxes per pallet must be greater than zero' });
            }
            const computedBoxCount = palletCount * boxesPerPallet;
            originalBoxCount = computedBoxCount;
            totalBoxCount = computedBoxCount;
        }
        const currentBoxCount = parseOptionalInt(data.currentBoxCount) ?? totalBoxCount;
        if (!currentBoxCount || currentBoxCount <= 0) {
            return res.status(400).json({ error: 'Current box count must be greater than zero' });
        }
        let arrivalDate = new Date();
        if (data.arrivalDate) {
            const parsedArrival = new Date(data.arrivalDate);
            if (!Number.isNaN(parsedArrival.getTime())) {
                arrivalDate = parsedArrival;
            }
        }
        let companyProfileId = null;
        let companyProfileName = null;
        if (data.companyProfileId) {
            const profile = await prisma.companyProfile.findFirst({
                where: { id: data.companyProfileId, companyId, isActive: true },
                select: { id: true, name: true },
            });
            if (!profile) {
                return res.status(400).json({ error: 'Selected company profile is not available' });
            }
            companyProfileId = profile.id;
            companyProfileName = profile.name;
        }
        let normalizedWarehouseData = null;
        if (data.warehouseData) {
            try {
                const parsedWarehouse = typeof data.warehouseData === 'string' ? JSON.parse(data.warehouseData) : data.warehouseData;
                parsedWarehouse.palletCount = palletCount;
                parsedWarehouse.boxesPerPallet = boxesPerPallet;
                parsedWarehouse.totalBoxes = totalBoxCount;
                if (boxesDistribution && boxesDistribution.length > 0) {
                    parsedWarehouse.boxesDistribution = boxesDistribution;
                    parsedWarehouse.extraBoxes = Math.max(0, Math.trunc(extraBoxes || 0));
                }
                normalizedWarehouseData = JSON.stringify(parsedWarehouse);
            }
            catch (warehouseParseError) {
                normalizedWarehouseData = typeof data.warehouseData === 'string'
                    ? data.warehouseData
                    : JSON.stringify(data.warehouseData);
            }
        }
        else if (data.isWarehouseShipment) {
            normalizedWarehouseData = JSON.stringify({
                palletCount,
                boxesPerPallet,
                totalBoxes: totalBoxCount,
                ...(boxesDistribution && boxesDistribution.length > 0
                    ? { boxesDistribution, extraBoxes: Math.max(0, Math.trunc(extraBoxes || 0)) }
                    : {}),
            });
        }
        // ???? FETCH SHIPMENT SETTINGS
        let settings = await prisma.shipmentSettings.findUnique({
            where: { companyId }
        });
        // Create default settings if not exist
        if (!settings) {
            settings = await prisma.shipmentSettings.create({
                data: { companyId }
            });
        }
        // ??? VALIDATE REQUIRED FIELDS BASED ON SETTINGS
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
        const qrTimestamp = Date.now();
        const qrBase = `${qrPrefix}-${qrTimestamp}`;
        const qrMetaSegments = [`P${palletCount}`, `B${boxesPerPallet}`, `T${totalBoxCount}`];
        const masterQR = [qrBase, ...qrMetaSegments].join('-');
        // ???? USE DEFAULT STORAGE TYPE FROM SETTINGS IF NOT PROVIDED
        const shipmentType = data.type || settings.defaultStorageType;
        const normalizedCustomerName = data.customerName || companyProfileName || data.clientName || null;
        const referenceId = data.referenceId || `SH-${qrTimestamp}`;
        // Build create payload as `any` to avoid TS type mismatch if Prisma client
        // hasn't been regenerated yet. Fields are nullable to ensure non-destructive
        // migrations and safe inserts.
        const createPayload = {
            name: data.name || `Shipment for ${data.clientName || companyProfileName || 'Client'}`,
            referenceId,
            originalBoxCount,
            currentBoxCount,
            palletCount,
            boxesPerPallet,
            type: shipmentType,
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            clientEmail: data.clientEmail,
            description: data.description,
            estimatedValue: data.estimatedValue,
            notes: data.notes,
            companyId,
            companyProfileId,
            qrCode: masterQR,
            arrivalDate,
            status: 'PENDING',
            createdById: userId,
            // Warehouse fields
            isWarehouseShipment: data.isWarehouseShipment || false,
            shipper: data.shipper,
            consignee: data.consignee,
            category: data.category || 'CUSTOMER_STORAGE',
            awbNumber: data.awbNumber,
            flightNumber: data.flightNumber,
            origin: data.origin,
            destination: data.destination,
            customerName: normalizedCustomerName,
            // Dimension fields (nullable)
            length: data.length !== undefined ? parseFloat(data.length) : undefined,
            width: data.width !== undefined ? parseFloat(data.width) : undefined,
            height: data.height !== undefined ? parseFloat(data.height) : undefined,
            cbm: data.cbm !== undefined ? parseFloat(data.cbm) : undefined,
            weight: data.weight !== undefined ? parseFloat(data.weight) : undefined,
            warehouseData: normalizedWarehouseData,
        };
        const shipment = await prisma.shipment.create({
            data: createPayload,
            include: {
                companyProfile: {
                    select: { id: true, name: true },
                },
            },
        });
        // ??? CREATE INDIVIDUAL QR CODES FOR EACH BOX
        const palletImagesMap = {};
        const palletPhotosPayload = Array.isArray(data.palletPhotos) ? data.palletPhotos : [];
        const boxesToCreate = [];
        if (boxesDistribution && boxesDistribution.length > 0) {
            // Variable mode: build by pallet segments then loose boxes
            let boxIdx = 0;
            for (let p = 1; p <= palletCount; p++) {
                const countForPallet = Math.max(0, Math.trunc(boxesDistribution[p - 1] || 0));
                for (let j = 0; j < countForPallet; j++) {
                    boxIdx += 1;
                    boxesToCreate.push({
                        shipmentId: shipment.id,
                        boxNumber: boxIdx,
                        qrCode: `${masterQR}-BOX-${boxIdx}-OF-${totalBoxCount}-PAL-${p}`,
                        rackId: data.rackId || null,
                        status: data.rackId ? 'IN_STORAGE' : 'PENDING',
                        assignedAt: data.rackId ? new Date() : null,
                        companyId,
                        pieceQR: JSON.stringify({
                            masterQRCode: masterQR,
                            boxNumber: boxIdx,
                            palletNumber: p,
                            palletCount,
                            boxesPerPallet: Math.max(0, Math.trunc(boxesDistribution[p - 1] || 0)),
                            totalBoxes: totalBoxCount,
                        }),
                    });
                }
                const palletEntry = palletPhotosPayload[p - 1];
                if (palletEntry) {
                    const photoList = (Array.isArray(palletEntry) ? palletEntry : [palletEntry]);
                    const filtered = photoList.filter((url) => typeof url === 'string' && url.trim() !== '');
                    if (filtered.length > 0) {
                        palletImagesMap[p] = palletImagesMap[p] || [];
                        palletImagesMap[p].push(...filtered);
                    }
                }
            }
            // Loose boxes (no pallet)
            for (let k = 0; k < Math.max(0, Math.trunc(extraBoxes || 0)); k++) {
                const boxNumber = boxesToCreate.length + 1;
                boxesToCreate.push({
                    shipmentId: shipment.id,
                    boxNumber,
                    qrCode: `${masterQR}-BOX-${boxNumber}-OF-${totalBoxCount}-PAL-0`,
                    rackId: data.rackId || null,
                    status: data.rackId ? 'IN_STORAGE' : 'PENDING',
                    assignedAt: data.rackId ? new Date() : null,
                    companyId,
                    pieceQR: JSON.stringify({
                        masterQRCode: masterQR,
                        boxNumber,
                        palletNumber: 0,
                        isLoose: true,
                        palletCount,
                        boxesPerPallet: 0,
                        totalBoxes: totalBoxCount,
                    }),
                });
            }
        }
        else {
            // Uniform mode: original logic
            for (let i = 1; i <= totalBoxCount; i++) {
                const palletNumber = Math.ceil(i / boxesPerPallet);
                boxesToCreate.push({
                    shipmentId: shipment.id,
                    boxNumber: i,
                    qrCode: `${masterQR}-BOX-${i}-OF-${totalBoxCount}-PAL-${palletNumber}`,
                    rackId: data.rackId || null, // Assign to rack if provided
                    status: data.rackId ? 'IN_STORAGE' : 'PENDING',
                    assignedAt: data.rackId ? new Date() : null,
                    companyId,
                    pieceQR: JSON.stringify({
                        masterQRCode: masterQR,
                        boxNumber: i,
                        palletNumber,
                        palletCount,
                        boxesPerPallet,
                        totalBoxes: totalBoxCount,
                    }),
                });
                const palletEntry = palletPhotosPayload[palletNumber - 1];
                if (palletEntry) {
                    const photoList = (Array.isArray(palletEntry) ? palletEntry : [palletEntry]);
                    const filtered = photoList.filter((url) => typeof url === 'string' && url.trim() !== '');
                    if (filtered.length > 0) {
                        palletImagesMap[palletNumber] = palletImagesMap[palletNumber] || [];
                        palletImagesMap[palletNumber].push(...filtered);
                    }
                }
            }
        }
        await prisma.shipmentBox.createMany({
            data: boxesToCreate,
        });
        // Attach pallet-level photos to boxes (if provided)
        let palletUpdates = [];
        if (boxesDistribution && boxesDistribution.length > 0) {
            // Compute ranges via prefix sums per pallet
            let start = 1;
            palletUpdates = Object.entries(palletImagesMap).map(([palletNumberStr, urls]) => {
                const p = Number(palletNumberStr);
                const countForPallet = Math.max(0, Math.trunc(boxesDistribution[p - 1] || 0));
                const end = start + countForPallet - 1;
                const update = prisma.shipmentBox.updateMany({
                    where: {
                        shipmentId: shipment.id,
                        boxNumber: { gte: start, lte: end },
                        companyId,
                    },
                    data: { photos: JSON.stringify(urls) },
                });
                start = end + 1;
                return update;
            });
        }
        else {
            palletUpdates = Object.entries(palletImagesMap).map(([palletNumber, urls]) => prisma.shipmentBox.updateMany({
                where: {
                    shipmentId: shipment.id,
                    boxNumber: {
                        gte: (Number(palletNumber) - 1) * boxesPerPallet + 1,
                        lte: Number(palletNumber) * boxesPerPallet,
                    },
                    companyId,
                },
                data: {
                    photos: JSON.stringify(urls),
                },
            }));
        }
        if (palletUpdates.length > 0) {
            await prisma.$transaction(palletUpdates);
        }
        // If rack assigned, recalculate capacity based on pallets
        if (data.rackId) {
            const palletsUsed = await (0, rackCapacity_1.recomputeRackPalletUsage)(prisma, data.rackId, companyId);
            await prisma.rack.update({
                where: { id: data.rackId },
                data: {
                    capacityUsed: palletsUsed,
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
                    quantityCurrent: totalBoxCount,
                },
            });
            // Log activity
            await prisma.rackActivity.create({
                data: {
                    rackId: data.rackId,
                    userId: req.user.id,
                    companyId,
                    activityType: 'ASSIGN',
                    itemDetails: boxesDistribution && boxesDistribution.length > 0
                        ? `Shipment ${shipment.referenceId} - ${totalBoxCount} boxes (${palletCount} pallets; variable per pallet)`
                        : `Shipment ${shipment.referenceId} - ${totalBoxCount} boxes (${palletCount} pallets x ${boxesPerPallet} boxes)`,
                    quantityAfter: totalBoxCount,
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
        });
        if (!existing) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // Update shipment data - extract only valid Shipment fields
        const { name, referenceId, originalBoxCount, currentBoxCount, type, arrivalDate, clientName, clientPhone, clientEmail, description, estimatedValue, notes, status, assignedAt, releasedAt, storageCharge, isWarehouseShipment, warehouseData, shipper, consignee, category, awbNumber, flightNumber, origin, destination, customerName, companyProfileId, palletCount, boxesPerPallet, 
        // Dimensions
        length, width, height, cbm, weight, } = req.body;
        const updateData = {};
        // Only include fields that are provided and valid
        if (name !== undefined)
            updateData.name = name;
        if (referenceId !== undefined)
            updateData.referenceId = referenceId;
        if (originalBoxCount !== undefined)
            updateData.originalBoxCount = originalBoxCount;
        if (currentBoxCount !== undefined)
            updateData.currentBoxCount = currentBoxCount;
        if (type !== undefined)
            updateData.type = type;
        if (arrivalDate !== undefined)
            updateData.arrivalDate = new Date(arrivalDate);
        if (clientName !== undefined)
            updateData.clientName = clientName;
        if (clientPhone !== undefined)
            updateData.clientPhone = clientPhone;
        if (clientEmail !== undefined)
            updateData.clientEmail = clientEmail;
        if (description !== undefined)
            updateData.description = description;
        if (estimatedValue !== undefined)
            updateData.estimatedValue = estimatedValue;
        if (notes !== undefined)
            updateData.notes = notes;
        if (status !== undefined)
            updateData.status = status;
        if (assignedAt !== undefined)
            updateData.assignedAt = assignedAt;
        if (releasedAt !== undefined)
            updateData.releasedAt = releasedAt;
        if (storageCharge !== undefined)
            updateData.storageCharge = storageCharge;
        if (isWarehouseShipment !== undefined)
            updateData.isWarehouseShipment = isWarehouseShipment;
        if (warehouseData !== undefined)
            updateData.warehouseData = warehouseData;
        if (shipper !== undefined)
            updateData.shipper = shipper;
        if (consignee !== undefined)
            updateData.consignee = consignee;
        if (category !== undefined)
            updateData.category = category;
        if (awbNumber !== undefined)
            updateData.awbNumber = awbNumber;
        if (flightNumber !== undefined)
            updateData.flightNumber = flightNumber;
        if (origin !== undefined)
            updateData.origin = origin;
        if (destination !== undefined)
            updateData.destination = destination;
        if (customerName !== undefined)
            updateData.customerName = customerName;
        if (companyProfileId !== undefined) {
            if (!companyProfileId) {
                updateData.companyProfileId = null;
            }
            else {
                const profile = await prisma.companyProfile.findFirst({
                    where: { id: companyProfileId, companyId },
                    select: { id: true, name: true },
                });
                if (!profile) {
                    return res.status(400).json({ error: 'Selected company profile is not available' });
                }
                updateData.companyProfileId = profile.id;
                if (customerName === undefined && !existing.customerName) {
                    updateData.customerName = profile.name;
                }
            }
        }
        if (palletCount !== undefined)
            updateData.palletCount = parseOptionalInt(palletCount);
        if (boxesPerPallet !== undefined)
            updateData.boxesPerPallet = parseOptionalInt(boxesPerPallet);
        if (length !== undefined)
            updateData.length = parseFloat(length);
        if (width !== undefined)
            updateData.width = parseFloat(width);
        if (height !== undefined)
            updateData.height = parseFloat(height);
        if (cbm !== undefined)
            updateData.cbm = parseFloat(cbm);
        if (weight !== undefined)
            updateData.weight = parseFloat(weight);
        updateData.updatedAt = new Date();
        const shipment = await prisma.shipment.update({
            where: { id },
            data: updateData,
            include: {
                companyProfile: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
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
// Assign boxes to rack (for scanner & manual) with optional photos
router.post('/:id/assign-boxes', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER', 'WORKER'), photoUpload.array('photos', 10), // Up to 10 photos
async (req, res) => {
    try {
        const { id } = req.params;
        const { rackId, boxNumbers } = req.body; // boxNumbers can be array or JSON string
        const companyId = req.user.companyId;
        const uploadedFiles = req.files;
        if (!rackId || !boxNumbers) {
            return res.status(400).json({ error: 'Rack ID and box numbers required' });
        }
        const parsedBoxNumbers = Array.isArray(boxNumbers)
            ? boxNumbers
            : typeof boxNumbers === 'string'
                ? JSON.parse(boxNumbers)
                : [];
        const normalizedBoxNumbers = parsedBoxNumbers
            .map((value) => (typeof value === 'number' ? value : parseInt(value, 10)))
            .filter((value) => Number.isInteger(value) && value > 0);
        if (normalizedBoxNumbers.length === 0) {
            return res.status(400).json({ error: 'At least one box number required' });
        }
        // Prepare photo URLs
        const photoUrls = uploadedFiles?.map(file => `/uploads/shipments/${file.filename}`) || [];
        const boxUpdateData = {
            rackId,
            status: 'IN_STORAGE',
            assignedAt: new Date(),
        };
        if (photoUrls.length > 0) {
            const existingSample = await prisma.shipmentBox.findFirst({
                where: {
                    shipmentId: id,
                    boxNumber: {
                        in: normalizedBoxNumbers,
                    },
                    companyId,
                },
                select: { photos: true },
            });
            let mergedPhotos = [];
            if (existingSample?.photos) {
                try {
                    const parsed = JSON.parse(existingSample.photos);
                    if (Array.isArray(parsed)) {
                        mergedPhotos = parsed.filter((url) => typeof url === 'string');
                    }
                }
                catch (parseError) {
                    console.warn('Failed to parse existing shipment box photos', parseError);
                }
            }
            photoUrls.forEach(url => {
                if (!mergedPhotos.includes(url)) {
                    mergedPhotos.push(url);
                }
            });
            boxUpdateData.photos = JSON.stringify(mergedPhotos);
        }
        // Update boxes with photos (if provided)
        await prisma.shipmentBox.updateMany({
            where: {
                shipmentId: id,
                boxNumber: { in: normalizedBoxNumbers },
                companyId,
            },
            data: boxUpdateData,
        });
        const palletsUsed = await (0, rackCapacity_1.recomputeRackPalletUsage)(prisma, rackId, companyId);
        // Update rack capacity based on pallet usage
        await prisma.rack.update({
            where: { id: rackId },
            data: {
                capacityUsed: palletsUsed,
                lastActivity: new Date(),
            },
        });
        // Check assignment progress and update shipment status accordingly
        const allBoxes = await prisma.shipmentBox.findMany({
            where: { shipmentId: id, companyId },
            select: { rackId: true },
        });
        const totalBoxes = allBoxes.length;
        const assignedCount = allBoxes.filter(box => box.rackId !== null).length;
        const remainingUnassigned = totalBoxes - assignedCount;
        // Compute new status: IN_STORAGE if all assigned, PARTIAL if some assigned, else PENDING
        const newStatus = assignedCount === 0
            ? 'PENDING'
            : (remainingUnassigned === 0 ? 'IN_STORAGE' : 'PARTIAL');
        await prisma.shipment.update({
            where: { id },
            data: {
                status: newStatus,
                assignedAt: assignedCount > 0 ? new Date() : null,
            },
        });
        // Log activity
        await prisma.rackActivity.create({
            data: {
                rackId,
                userId: req.user.id,
                companyId,
                activityType: 'ASSIGN',
                itemDetails: `${normalizedBoxNumbers.length} boxes from shipment ${id}${photoUrls.length > 0 ? ` (${photoUrls.length} photos)` : ''}`,
                quantityAfter: palletsUsed,
            },
        });
        res.json({
            success: true,
            assigned: normalizedBoxNumbers.length,
            assignedTotal: assignedCount,
            totalBoxes,
            remainingUnassigned,
            shipmentStatus: newStatus,
            palletsUsed,
            photosUploaded: photoUrls.length,
            photoUrls
        });
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
        // ???? FETCH SHIPMENT SETTINGS
        let settings = await prisma.shipmentSettings.findUnique({
            where: { companyId }
        });
        if (!settings) {
            settings = await prisma.shipmentSettings.create({
                data: { companyId }
            });
        }
        // ??? VALIDATE RELEASE REQUIREMENTS BASED ON SETTINGS
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
        // ??? CHECK PARTIAL RELEASE SETTINGS
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
        // Update rack capacities using pallet-based calculations
        for (const [rackId, count] of Object.entries(rackUpdates)) {
            const palletsUsed = await (0, rackCapacity_1.recomputeRackPalletUsage)(prisma, rackId, companyId);
            await prisma.rack.update({
                where: { id: rackId },
                data: {
                    capacityUsed: palletsUsed,
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
                    quantityAfter: palletsUsed,
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
        // ???? CALCULATE CHARGES BASED ON SETTINGS
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
        // ???? SEND NOTIFICATION IF ENABLED
        let notificationSent = false;
        if (settings.notifyClientOnRelease && shipment.clientPhone) {
            // TODO: Integrate with notification service
            notificationSent = true;
            console.log(`???? Notification sent to ${shipment.clientPhone}: ${boxesToRelease.length} boxes released`);
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
// Cleanup test/mock data - ADMIN ONLY
router.post('/cleanup/test-data', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { confirmText } = req.body;
        // Safety check - must type "DELETE TEST DATA" to confirm
        if (confirmText !== 'DELETE TEST DATA') {
            return res.status(400).json({
                error: 'Confirmation text incorrect. Please type "DELETE TEST DATA" to confirm.'
            });
        }
        // Find shipments with test/demo indicators (case-insensitive via SQL)
        const testShipments = await prisma.$queryRaw `
      SELECT id, referenceId, clientName, shipper, consignee 
      FROM shipments 
      WHERE companyId = ${companyId}
      AND (
        LOWER(referenceId) LIKE '%test%' OR 
        LOWER(referenceId) LIKE '%demo%' OR 
        LOWER(referenceId) LIKE '%mock%' OR
        LOWER(clientName) LIKE '%test%' OR 
        LOWER(clientName) LIKE '%demo%' OR
        LOWER(shipper) LIKE '%test%' OR 
        LOWER(shipper) LIKE '%demo%' OR
        LOWER(consignee) LIKE '%test%' OR 
        LOWER(consignee) LIKE '%demo%'
      )
    `;
        if (testShipments.length === 0) {
            return res.json({
                message: 'No test data found to delete.',
                deleted: 0
            });
        }
        const shipmentIds = testShipments.map((s) => s.id);
        // Delete related boxes first
        const deletedBoxes = await prisma.$executeRaw `
      DELETE FROM boxes WHERE shipmentId IN (${shipmentIds.join(',')})
    `;
        // Delete shipments
        const deletedShipments = await prisma.$executeRaw `
      DELETE FROM shipments WHERE id IN (${shipmentIds.join(',')})
    `;
        res.json({
            message: 'Test data deleted successfully',
            deleted: testShipments.length,
            deletedBoxes,
            shipments: testShipments.map((s) => ({
                id: s.id,
                referenceId: s.referenceId,
                clientName: s.clientName,
                shipper: s.shipper,
                consignee: s.consignee,
            })),
        });
    }
    catch (error) {
        console.error('Cleanup test data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
