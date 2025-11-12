"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const chargeCalculation_1 = require("../utils/chargeCalculation");
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
        const uploadDir = path_1.default.join(process.cwd(), 'uploads/shipments');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        console.log(`📸 Photo upload destination: ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const filename = `shipment-${uniqueSuffix}${ext}`;
        console.log(`📸 Photo filename: ${filename}`);
        cb(null, filename);
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
            console.error('❌ No file in request');
            return res.status(400).json({ error: 'No photo uploaded' });
        }
        // Verify file was actually written to disk
        const filePath = path_1.default.join(process.cwd(), `uploads/shipments/${req.file.filename}`);
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`❌ File not found after upload: ${filePath}`);
            return res.status(500).json({ error: 'File upload failed - file not persisted' });
        }
        const photoUrl = `/uploads/shipments/${req.file.filename}`;
        console.log(`✅ Photo uploaded successfully: ${photoUrl} (${req.file.size} bytes)`);
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
                { qrCode: { contains: search } }, // ✅ FIX: Search by QR code
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
                            pieceQR: true, // ✅ FIX: Include pieceQR for pallet breakdown
                            photos: true, // ✅ FIX: Include photos for shipment display
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
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
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
            // Get unique rack codes where boxes are CURRENTLY located (IN_STORAGE only, exclude RELEASED)
            const rackIds = [...new Set(shipment.boxes
                    .filter((b) => b.rackId && b.status === 'IN_STORAGE') // Only boxes in storage
                    .map((b) => b.rackId))];
            const racks = rackIds.length > 0 ? await prisma.rack.findMany({
                where: { id: { in: rackIds } },
                select: { code: true }
            }) : [];
            const rackCodes = racks.map(r => r.code).join(', ');
            // 🔧 FIX: Parse pieceQR to get proper pallet/loose breakdown
            const boxesWithParsedQR = shipment.boxes.map((b) => {
                try {
                    const pieceData = b.pieceQR ? (typeof b.pieceQR === 'string' ? JSON.parse(b.pieceQR) : b.pieceQR) : null;
                    return { ...b, pieceQR: pieceData };
                }
                catch (e) {
                    return { ...b, pieceQR: null };
                }
            });
            // 🔧 FIX: Collect shipment photos from boxes
            const shipmentPhotosSet = new Set();
            for (const box of shipment.boxes) {
                if (box.photos) {
                    try {
                        const photos = typeof box.photos === 'string' ? JSON.parse(box.photos) : box.photos;
                        if (Array.isArray(photos)) {
                            photos.forEach((p) => shipmentPhotosSet.add(p));
                        }
                    }
                    catch (e) {
                        // Ignore parse errors
                    }
                }
            }
            return {
                ...shipment,
                boxes: boxesWithParsedQR, // Replace with parsed version
                totalBoxes,
                assignedBoxes,
                releasedBoxes,
                inStorageBoxes,
                rackLocations: rackCodes || null, // Comma-separated rack codes
                shipmentPhotos: Array.from(shipmentPhotosSet), // 🔧 FIX: Add photos array
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
                        contactPerson: true,
                        contactPhone: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                assignedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                charges: true, // Include charging information
            },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // Type cast to any to avoid TypeScript errors with Prisma types
        const shipmentData = shipment;
        // Add computed box counts
        const totalBoxes = shipmentData.boxes.length;
        const assignedBoxes = shipmentData.boxes.filter((b) => b.rackId !== null).length;
        const releasedBoxes = shipmentData.boxes.filter((b) => b.status === 'RELEASED').length;
        const inStorageBoxes = shipmentData.boxes.filter((b) => b.status === 'IN_STORAGE').length;
        // 🔧 FIX: Parse pieceQR and collect photos
        const boxesWithParsedQR = shipmentData.boxes.map((b) => {
            try {
                const pieceData = b.pieceQR ? (typeof b.pieceQR === 'string' ? JSON.parse(b.pieceQR) : b.pieceQR) : null;
                return { ...b, pieceQR: pieceData };
            }
            catch (e) {
                return { ...b, pieceQR: null };
            }
        });
        const shipmentPhotosSet = new Set();
        for (const box of shipmentData.boxes) {
            if (box.photos) {
                try {
                    const photos = typeof box.photos === 'string' ? JSON.parse(box.photos) : box.photos;
                    if (Array.isArray(photos)) {
                        photos.forEach((p) => shipmentPhotosSet.add(p));
                    }
                }
                catch (e) {
                    // Ignore
                }
            }
        }
        res.json({
            shipment: {
                ...shipmentData,
                boxes: boxesWithParsedQR, // 🔧 FIX: Use parsed boxes
                shipmentPhotos: Array.from(shipmentPhotosSet), // 🔧 FIX: Add photos
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
        // Check if box mode FIRST (palletCount === 0 or boxesPerPallet === 0)
        const isBoxMode = (palletCount === 0 || boxesPerPallet === 0) && boxesDistribution.length === 0;
        if (isBoxMode) {
            // ✅ BOX MODE: Use originalBoxCount from request data
            originalBoxCount = parseOptionalInt(data.originalBoxCount) ?? 0;
            totalBoxCount = originalBoxCount;
            palletCount = 0; // Ensure palletCount is 0 for box mode
            boxesPerPallet = 0; // Ensure boxesPerPallet is 0 for box mode
            if (originalBoxCount <= 0) {
                return res.status(400).json({ error: 'Total boxes must be greater than zero in box mode' });
            }
        }
        else if (boxesDistribution && boxesDistribution.length > 0) {
            // Variable mode: palletCount becomes distribution length
            palletCount = boxesDistribution.length;
            const distributionSum = boxesDistribution.reduce((a, b) => a + Math.max(0, Math.trunc(b || 0)), 0);
            const maxBPP = boxesDistribution.reduce((m, n) => Math.max(m, Math.max(0, Math.trunc(n || 0))), 0);
            boxesPerPallet = Math.max(maxBPP, 0);
            totalBoxCount = distributionSum + Math.max(0, Math.trunc(extraBoxes || 0));
            originalBoxCount = totalBoxCount;
        }
        else {
            // ✅ PALLET MODE validations
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
        // Generate master QR code for shipment - SIMPLE FORMAT: SHIPMENT_ID only
        // Format: SHIPMENT_{shipmentNumber} - QR must NEVER change once assigned
        // No metadata in QR (metadata stored in database only)
        const timestamp = Date.now();
        const shipmentNumber = `${timestamp}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const masterQR = `SHIPMENT_${shipmentNumber}`;
        // ???? USE DEFAULT STORAGE TYPE FROM SETTINGS IF NOT PROVIDED
        const shipmentType = data.type || settings.defaultStorageType;
        const normalizedCustomerName = data.customerName || companyProfileName || data.clientName || null;
        const referenceId = data.referenceId || `SH-${timestamp}`;
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
                        qrCode: `${masterQR}-BOX${String(boxIdx).padStart(3, '0')}`,
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
                    qrCode: `${masterQR}-BOX${String(boxNumber).padStart(3, '0')}`,
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
            // Uniform mode: Check if box mode (palletCount === 0 or boxesPerPallet === 0)
            const isBoxMode = palletCount === 0 || boxesPerPallet === 0;
            for (let i = 1; i <= totalBoxCount; i++) {
                const palletNumber = isBoxMode ? 0 : Math.ceil(i / boxesPerPallet);
                const isLoose = isBoxMode || palletNumber === 0;
                boxesToCreate.push({
                    shipmentId: shipment.id,
                    boxNumber: i,
                    qrCode: `${masterQR}-BOX${String(i).padStart(3, '0')}`,
                    rackId: data.rackId || null, // Assign to rack if provided
                    status: data.rackId ? 'IN_STORAGE' : 'PENDING',
                    assignedAt: data.rackId ? new Date() : null,
                    companyId,
                    pieceQR: JSON.stringify({
                        masterQRCode: masterQR,
                        boxNumber: i,
                        palletNumber,
                        isLoose,
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
                assignedById: assignedCount > 0 ? req.user.id : null, // Track who assigned
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
// Delete shipment (STRICT: prevent deletion if materials allocated to racks)
router.delete('/:id', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const existing = await prisma.shipment.findFirst({
            where: { id, companyId },
            include: {
                boxes: true, // Get all boxes to check status
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // SMART DELETE: Allow deletion if shipment status is RELEASED
        // Block deletion only if shipment is NOT released AND boxes are in storage
        console.log(`🗑️ DELETE REQUEST: Shipment ${existing.referenceId}, Status: ${existing.status}, Boxes: ${existing.boxes.length}`);
        if (existing.status !== 'RELEASED') {
            const hasBoxesInStorage = existing.boxes.some(box => box.status === 'IN_STORAGE' || box.status === 'IN_WAREHOUSE');
            if (hasBoxesInStorage) {
                console.log(`❌ BLOCKED: ${hasBoxesInStorage} boxes in storage, shipment not released`);
                return res.status(400).json({
                    error: 'Cannot delete shipment: Materials are currently allocated to racks',
                    detail: `Release the shipment first before deletion.`,
                });
            }
        }
        else {
            console.log(`✅ ALLOWED: Shipment is RELEASED, ignoring box status`);
        }
        // If shipment status is RELEASED, allow deletion regardless of box status (handles data inconsistencies)
        // Delete associated photos from storage if they exist
        const allBoxes = await prisma.shipmentBox.findMany({
            where: { shipmentId: id },
            select: { photos: true }
        });
        // Collect all photo URLs from boxes
        const photoUrls = [];
        for (const box of allBoxes) {
            if (box.photos) {
                try {
                    const photos = JSON.parse(box.photos);
                    if (Array.isArray(photos)) {
                        photoUrls.push(...photos);
                    }
                }
                catch (e) {
                    console.log('Failed to parse photos JSON:', e);
                }
            }
        }
        // Delete photo files from disk
        if (photoUrls.length > 0) {
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const uploadsDir = path.join(process.cwd(), 'uploads');
            for (const photoUrl of photoUrls) {
                try {
                    // Extract file path from URL (e.g., "uploads/shipments/photo.jpg")
                    const filePath = path.join(process.cwd(), photoUrl);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`✅ Deleted photo: ${photoUrl}`);
                    }
                }
                catch (err) {
                    console.log(`⚠️ Failed to delete photo ${photoUrl}:`, err);
                }
            }
        }
        // 🔒 CRITICAL FIX: Get affected racks BEFORE deleting boxes
        const boxesToDelete = await prisma.shipmentBox.findMany({
            where: { shipmentId: id },
            select: { rackId: true }
        });
        const affectedRackIds = [...new Set(boxesToDelete.map(b => b.rackId).filter(Boolean))];
        console.log(`📦 Deleting shipment ${existing.referenceId} - Affects ${affectedRackIds.length} racks`);
        // Hard delete: First delete boxes (cascade will handle items)
        await prisma.shipmentBox.deleteMany({
            where: { shipmentId: id }
        });
        // 🔧 UPDATE RACK CAPACITIES (prevents capacity leak)
        for (const rackId of affectedRackIds) {
            if (rackId) {
                const palletsUsed = await (0, rackCapacity_1.recomputeRackPalletUsage)(prisma, rackId, companyId);
                await prisma.rack.update({
                    where: { id: rackId },
                    data: {
                        capacityUsed: palletsUsed,
                        lastActivity: new Date()
                    }
                });
                console.log(`✅ Updated rack capacity after delete: ${palletsUsed} pallets`);
            }
        }
        // Then delete the shipment
        await prisma.shipment.delete({
            where: { id }
        });
        res.json({
            message: 'Shipment deleted successfully',
            deletedPhotos: photoUrls.length,
            updatedRacks: affectedRackIds.length
        });
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
// ==========================================
// CUSTOM CHARGES MANAGEMENT (Per-Shipment Pricing)
// ==========================================
// Get current charges calculation for a shipment
router.get('/:id/charges-calculation', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const calculation = await (0, chargeCalculation_1.calculateShipmentCharges)(prisma, id, companyId);
        res.json({
            success: true,
            shipmentId: id,
            calculation
        });
    }
    catch (error) {
        console.error('Get charges calculation error:', error);
        res.status(500).json({ error: error.message || 'Failed to calculate charges' });
    }
});
// Preview charges with different rate scenarios (doesn't save)
router.post('/:id/charges-preview', async (req, res) => {
    try {
        const { id } = req.params;
        const { customRateEnabled, ratePerCBMPerDay, ratePerBoxPerDay } = req.body;
        const companyId = req.user.companyId;
        const preview = await (0, chargeCalculation_1.previewShipmentCharges)(prisma, id, companyId, {
            enabled: customRateEnabled,
            ratePerCBMPerDay: ratePerCBMPerDay ? parseFloat(ratePerCBMPerDay) : undefined,
            ratePerBoxPerDay: ratePerBoxPerDay ? parseFloat(ratePerBoxPerDay) : undefined
        });
        res.json({
            success: true,
            shipmentId: id,
            preview
        });
    }
    catch (error) {
        console.error('Preview charges error:', error);
        res.status(500).json({ error: error.message || 'Failed to preview charges' });
    }
});
// Set custom charges for a shipment
router.patch('/:id/custom-charges', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { customRateEnabled, ratePerCBMPerDay, ratePerBoxPerDay, notes } = req.body;
        const companyId = req.user.companyId;
        // Validation
        if (typeof customRateEnabled !== 'boolean') {
            return res.status(400).json({ error: 'customRateEnabled must be a boolean' });
        }
        if (customRateEnabled) {
            if (!ratePerCBMPerDay && !ratePerBoxPerDay) {
                return res.status(400).json({
                    error: 'At least one rate must be provided when custom rates are enabled'
                });
            }
            if (ratePerCBMPerDay && ratePerCBMPerDay < 0) {
                return res.status(400).json({ error: 'Rate per CBM cannot be negative' });
            }
            if (ratePerBoxPerDay && ratePerBoxPerDay < 0) {
                return res.status(400).json({ error: 'Rate per box cannot be negative' });
            }
        }
        // Verify shipment exists and belongs to company
        const shipment = await prisma.shipment.findFirst({
            where: { id, companyId }
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // Update shipment with custom rates
        const updated = await prisma.shipment.update({
            where: { id },
            data: {
                customRateEnabled,
                customRatePerCBMPerDay: customRateEnabled && ratePerCBMPerDay ? parseFloat(ratePerCBMPerDay) : null,
                customRatePerBoxPerDay: customRateEnabled && ratePerBoxPerDay ? parseFloat(ratePerBoxPerDay) : null,
                customRateNotes: notes || null
            } // Type cast for new fields
        });
        // Type cast to access custom rate fields
        const updatedData = updated;
        // Recalculate charges with new rates
        await (0, chargeCalculation_1.updateShipmentCharges)(prisma, id, companyId);
        // Get updated calculation for response
        const calculation = await (0, chargeCalculation_1.calculateShipmentCharges)(prisma, id, companyId);
        console.log(`✅ Custom charges ${customRateEnabled ? 'enabled' : 'disabled'} for shipment ${shipment.referenceId}`);
        res.json({
            success: true,
            message: customRateEnabled
                ? 'Custom charges enabled and calculated successfully'
                : 'Custom charges disabled - using company default rates',
            shipment: {
                id: updatedData.id,
                referenceId: updatedData.referenceId,
                customRateEnabled: updatedData.customRateEnabled,
                customRatePerCBMPerDay: updatedData.customRatePerCBMPerDay,
                customRatePerBoxPerDay: updatedData.customRatePerBoxPerDay,
                customRateNotes: updatedData.customRateNotes
            },
            calculation
        });
    }
    catch (error) {
        console.error('Set custom charges error:', error);
        res.status(500).json({ error: error.message || 'Failed to set custom charges' });
    }
});
// Recalculate charges manually (useful after data changes)
router.post('/:id/recalculate-charges', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        await (0, chargeCalculation_1.updateShipmentCharges)(prisma, id, companyId);
        const calculation = await (0, chargeCalculation_1.calculateShipmentCharges)(prisma, id, companyId);
        res.json({
            success: true,
            message: 'Charges recalculated successfully',
            calculation
        });
    }
    catch (error) {
        console.error('Recalculate charges error:', error);
        res.status(500).json({ error: error.message || 'Failed to recalculate charges' });
    }
});
// ==========================================
// ASSIGN BOXES TO RACK (with Pallet support)
// ==========================================
router.post('/:shipmentId/assign-rack', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER', 'WORKER'), async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const { rackId, quantity, pallets, looseBoxes, photos } = req.body;
        console.log('🎯 Assign-rack request:', {
            shipmentId,
            rackId,
            quantity,
            pallets,
            looseBoxes,
            photos: photos?.length || 0,
            photosReceived: photos,
            photosType: typeof photos,
            photosIsArray: Array.isArray(photos)
        });
        // Validation
        if (!rackId || !quantity) {
            return res.status(400).json({
                error: 'Missing required fields: rackId and quantity'
            });
        }
        // Get shipment with boxes
        const shipment = await prisma.shipment.findUnique({
            where: { id: shipmentId },
            include: {
                boxes: {
                    where: { rackId: null }, // Only unassigned boxes
                    orderBy: { id: 'asc' }
                }
            }
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // 🔒 SAFETY CHECK: Prevent accidental changes to fully assigned shipments
        if (shipment.status === 'IN_WAREHOUSE' || shipment.status === 'ACTIVE') {
            return res.status(400).json({
                error: 'This shipment is already fully assigned to racks. Cannot modify.',
                currentStatus: shipment.status
            });
        }
        // Check if we have enough unassigned boxes
        const unassignedBoxes = shipment.boxes || [];
        if (unassignedBoxes.length < quantity) {
            return res.status(400).json({
                error: `Not enough unassigned boxes. Available: ${unassignedBoxes.length}, Requested: ${quantity}`
            });
        }
        // Get rack and check capacity
        const rack = await prisma.rack.findUnique({
            where: { id: rackId },
            include: {
                boxes: {
                    include: { shipment: true }
                }
            }
        });
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        // ✅ CRITICAL FIX: Select boxes based on pallet/loose selection from frontend
        // Group boxes by their palletNumber from pieceQR
        const boxesByPallet = {};
        unassignedBoxes.forEach((box) => {
            const pieceData = box.pieceQR ? JSON.parse(box.pieceQR) : {};
            const palletNum = pieceData.palletNumber ?? 0; // null/undefined → 0 (loose)
            if (!boxesByPallet[palletNum])
                boxesByPallet[palletNum] = [];
            boxesByPallet[palletNum].push(box);
        });
        // Build list of boxes to assign based on frontend selection
        const boxesToAssign = [];
        let palletsToAssign = pallets || 0;
        // If frontend specified pallets, assign those pallet boxes first
        if (palletsToAssign > 0) {
            const palletNumbers = Object.keys(boxesByPallet)
                .map(Number)
                .filter(n => n > 0) // Only actual pallets, not loose (0)
                .sort((a, b) => a - b);
            for (let i = 0; i < Math.min(palletsToAssign, palletNumbers.length); i++) {
                const palletNum = palletNumbers[i];
                const palletBoxes = boxesByPallet[palletNum] || [];
                boxesToAssign.push(...palletBoxes);
            }
        }
        // Then add loose boxes if requested
        if (looseBoxes && looseBoxes > 0) {
            const looseBoxList = boxesByPallet[0] || [];
            boxesToAssign.push(...looseBoxList.slice(0, looseBoxes));
        }
        console.log('📦 Box selection:', {
            requestedPallets: pallets,
            requestedLooseBoxes: looseBoxes,
            selectedBoxes: boxesToAssign.length,
            boxNumbers: boxesToAssign.map((b) => b.boxNumber)
        });
        // Calculate pallet usage for capacity check
        const boxesPerPallet = shipment.boxesPerPallet || 0;
        // ✅ SAFE FIX: Only auto-calculate pallets if frontend didn't specify
        // If frontend sends pallets = 0 explicitly (loose boxes only), respect it
        // If frontend sends looseBoxes > 0, it means loose boxes only, no pallets
        if (boxesPerPallet > 0 && palletsToAssign === 0 && !looseBoxes && !req.body.hasOwnProperty('pallets')) {
            // Auto-calculate pallets ONLY if not explicitly specified
            palletsToAssign = Math.floor(quantity / boxesPerPallet);
        }
        console.log('🎯 Pallet calculation:', {
            boxesPerPallet,
            quantity,
            palletsFromFrontend: pallets,
            looseBoxesFromFrontend: looseBoxes,
            finalPallets: palletsToAssign
        });
        // Check rack capacity
        const currentPalletUsage = rack.capacityUsed || 0;
        const newPalletUsage = currentPalletUsage + palletsToAssign;
        if (newPalletUsage > (rack.capacityTotal || 100)) {
            return res.status(400).json({
                error: `Rack capacity exceeded. Current: ${currentPalletUsage}, Adding: ${palletsToAssign}, Max: ${rack.capacityTotal}`
            });
        }
        // Assign boxes to rack with photos
        const photosJson = photos && photos.length > 0 ? JSON.stringify(photos) : null;
        console.log('📸 Photos processing:', {
            photosReceived: photos,
            photosLength: photos?.length,
            photosJson,
            willSavePhotos: photosJson !== null
        });
        const updatedBoxes = await prisma.$transaction(boxesToAssign.map((box, index) => {
            // ✅ FIX: PRESERVE the original palletNumber from pieceQR
            // Don't recalculate - the box already knows which pallet it belongs to from intake
            const pieceData = box.pieceQR ? JSON.parse(box.pieceQR) : {};
            // Keep original palletNumber - it was set correctly during shipment intake
            // DO NOT overwrite with recalculated value based on assignment order
            return prisma.shipmentBox.update({
                where: { id: box.id },
                data: {
                    rackId,
                    assignedAt: new Date(),
                    status: 'IN_STORAGE',
                    pieceQR: JSON.stringify(pieceData), // Preserve original data
                    photos: photosJson // Store photos in all assigned boxes
                }
            });
        }));
        // 🔧 CRITICAL FIX: Use ONLY recomputeRackPalletUsage for consistency
        // This ensures all capacity calculations use the same method
        const finalPalletsUsed = await (0, rackCapacity_1.recomputeRackPalletUsage)(prisma, rackId, req.user.companyId);
        await prisma.rack.update({
            where: { id: rackId },
            data: {
                capacityUsed: finalPalletsUsed, // ✅ Use recomputed value, not manual calculation
                lastActivity: new Date(),
                status: finalPalletsUsed >= (rack.capacityTotal || 100) ? 'FULL' :
                    finalPalletsUsed > 0 ? 'OCCUPIED' : 'AVAILABLE'
            }
        });
        console.log('✅ Rack capacity updated:', {
            rackCode: rack.code,
            manualCalculation: newPalletUsage,
            actualPalletsUsed: finalPalletsUsed
        });
        // Check remaining boxes and update shipment status
        const remainingBoxes = await prisma.shipmentBox.count({
            where: {
                shipmentId,
                rackId: null
            }
        });
        let newStatus = shipment.status;
        if (remainingBoxes === 0) {
            newStatus = 'IN_WAREHOUSE';
        }
        else if (remainingBoxes < shipment.currentBoxCount) {
            newStatus = 'PARTIAL';
        }
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                status: newStatus,
                assignedById: req.user.id, // Track who assigned
                assignedAt: new Date()
            }
        });
        console.log('✅ Assigned successfully:', {
            shipmentId,
            rackCode: rack.code,
            boxesAssigned: updatedBoxes.length,
            palletsAssigned: palletsToAssign,
            remainingBoxes,
            newStatus
        });
        res.json({
            success: true,
            message: `Successfully assigned ${updatedBoxes.length} boxes to ${rack.code}`,
            assigned: updatedBoxes.length,
            pallets: palletsToAssign,
            looseBoxes: looseBoxes || 0,
            rackCode: rack.code,
            remainingBoxes,
            shipmentStatus: newStatus
        });
    }
    catch (error) {
        console.error('❌ Assign-rack error:', error);
        res.status(500).json({ error: 'Failed to assign boxes to rack' });
    }
});
exports.default = router;
