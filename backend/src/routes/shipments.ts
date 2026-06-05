import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { recomputeRackPalletUsage, updateRackCapacityAndCBM } from '../utils/rackCapacity';
import { calculateShipmentCharges, updateShipmentCharges, previewShipmentCharges } from '../utils/chargeCalculation';
import { sendReleaseNotification, sendNotification, sendShipmentCreatedNotification } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

const parseOptionalInt = (value: any): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? Math.trunc(value) : parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

// Apply authentication to all routes
router.use(authenticateToken);

// Configure multer for shipment photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/shipments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log(`📸 Photo upload destination: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `shipment-${uniqueSuffix}${ext}`;
    console.log(`📸 Photo filename: ${filename}`);
    cb(null, filename);
  }
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per photo
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed (JPEG, PNG, WebP)'));
    }
  }
});

// Upload endpoint for pallet and shipment imagery
router.post(
  '/upload/photo',
  authorizeRoles('ADMIN', 'MANAGER', 'WORKER'),
  photoUpload.single('photo'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        console.error('❌ No file in request');
        return res.status(400).json({ error: 'No photo uploaded' });
      }

      // Verify file was actually written to disk
      const filePath = path.join(process.cwd(), `uploads/shipments/${req.file.filename}`);
      if (!fs.existsSync(filePath)) {
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
    } catch (error) {
      console.error('Shipment photo upload error:', error);
      res.status(500).json({ error: 'Failed to upload shipment photo' });
    }
  }
);

// Validation schema
const shipmentSchema = z.object({
  name: z.string().min(2),
  referenceId: z.string(),
  originalBoxCount: z.number().int().positive(),
  type: z.enum(['PERSONAL', 'COMMERCIAL']),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  rackId: z.string().optional(),
  arrivalDate: z.union([z.string(), z.date()]).optional(),
  companyProfileId: z.string().optional(),
  palletCount: z.number().int().positive().optional(),
  boxesPerPallet: z.number().int().positive().optional(),
  // Optional: variable pallets distribution and extra loose boxes
  boxesDistribution: z.array(z.number().int().nonnegative()).optional(),
  extraBoxes: z.number().int().nonnegative().optional(),
  // NEW: Dimension & CBM fields for volume-based charging
  length: z.number().positive().optional(), // in cm
  width: z.number().positive().optional(),  // in cm
  height: z.number().positive().optional(), // in cm
  cbm: z.number().positive().optional(),    // auto-calculated or provided (m??)
  weight: z.number().positive().optional(), // in kg
  // NEW: Enhanced warehouse fields
  category: z.enum(['CUSTOMER_STORAGE', 'AIRPORT_CARGO', 'WAREHOUSE_STOCK']).optional(),
  awbNumber: z.string().optional(),
  flightNumber: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  customerName: z.string().optional(),
  shipper: z.string().optional(),
  consignee: z.string().optional(),
  isWarehouseShipment: z.boolean().optional(),
});

// Get all shipments
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, isWarehouseShipment, category, customerName, companyProfileId, page = '1', limit = '50' } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (status) {
      // Handle both single status and array of statuses
      if (Array.isArray(status)) {
        where.status = { in: status as string[] };
      } else if (typeof status === 'string' && status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
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
      where.customerName = { contains: customerName as string };
    }

    // NEW: Company profile filter (for company analytics page)
    // 🔧 FIX: Also match by customerName/clientName when companyProfileId is NULL
    if (companyProfileId) {
      // First get the profile name to match against customerName/clientName
      const profile = await prisma.companyProfile.findUnique({
        where: { id: companyProfileId as string },
        select: { name: true }
      });

      if (profile) {
        // Match by companyProfileId OR by customerName/clientName containing profile name
        where.OR = [
          { companyProfileId: companyProfileId as string },
          { customerName: { contains: profile.name } },
          { clientName: { contains: profile.name } }
        ];
      } else {
        where.companyProfileId = companyProfileId as string;
      }
    }

    // Handle search separately to avoid OR conflict
    if (search) {
      const searchConditions = [
        { name: { contains: search as string } },
        { referenceId: { contains: search as string } },
        { qrCode: { contains: search as string } },
        { clientName: { contains: search as string } },
        { customerName: { contains: search as string } },
        { companyProfile: { name: { contains: search as string } } },
        { shipper: { contains: search as string } },
        { awbNumber: { contains: search as string } },
      ];

      // If companyProfileId filter is active, combine with AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
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
              photos: true,  // ✅ FIX: Include photos for shipment display
              rack: {
                select: {
                  id: true,
                  code: true,
                  location: true,
                },
              },
            },
          },
          // Note: dimensions are fetched separately via /:shipmentId/dimensions endpoint
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
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.shipment.count({ where }),
    ]);

    // Add computed box counts and rack locations to each shipment
    const shipmentsWithCounts = await Promise.all(shipments.map(async (shipment: any) => {
      const totalBoxes = shipment.boxes.length;
      const assignedBoxes = shipment.boxes.filter((b: any) => b.rackId !== null).length;
      const releasedBoxes = shipment.boxes.filter((b: any) => b.status === 'RELEASED').length;
      const inStorageBoxes = shipment.boxes.filter((b: any) => b.status === 'IN_STORAGE').length;

      // Get unique rack codes where boxes are CURRENTLY located (IN_STORAGE only, exclude RELEASED)
      const rackIds = [...new Set(
        shipment.boxes
          .filter((b: any) => b.rackId && b.status === 'IN_STORAGE') // Only boxes in storage
          .map((b: any) => b.rackId)
      )] as string[];
      const racks = rackIds.length > 0 ? await prisma.rack.findMany({
        where: { id: { in: rackIds } },
        select: { code: true }
      }) : [];
      const rackCodes = racks.map(r => r.code).join(', ');

      // 🔧 Check if shipment has move history
      const moveHistoryCount = await prisma.rackActivity.count({
        where: {
          companyId: req.user!.companyId,
          activityType: 'MOVE',
          itemDetails: { contains: shipment.id }
        }
      });
      const hasMoveHistory = moveHistoryCount > 0;

      // 🔧 Get original rack from first MOVE activity if moved
      let originalRack = null;
      if (hasMoveHistory) {
        const firstMove = await prisma.rackActivity.findFirst({
          where: {
            companyId: req.user!.companyId,
            activityType: 'MOVE',
            itemDetails: { contains: shipment.id }
          },
          orderBy: { timestamp: 'asc' }
        });
        if (firstMove) {
          try {
            const details = JSON.parse(firstMove.itemDetails || '{}');
            if (details.direction === 'OUT') {
              originalRack = details.fromRack;
            }
          } catch (e) { }
        }
      }

      // 🔧 FIX: Parse pieceQR to get proper pallet/loose breakdown
      const boxesWithParsedQR = shipment.boxes.map((b: any) => {
        try {
          const pieceData = b.pieceQR ? (typeof b.pieceQR === 'string' ? JSON.parse(b.pieceQR) : b.pieceQR) : null;
          return { ...b, pieceQR: pieceData };
        } catch (e) {
          return { ...b, pieceQR: null };
        }
      });

      // 🔧 FIX: Collect shipment photos from boxes
      const shipmentPhotosSet = new Set<string>();
      for (const box of shipment.boxes) {
        if (box.photos) {
          try {
            const photos = typeof box.photos === 'string' ? JSON.parse(box.photos) : box.photos;
            if (Array.isArray(photos)) {
              photos.forEach((p: string) => shipmentPhotosSet.add(p));
            }
          } catch (e) {
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
        hasMoveHistory, // 🔧 NEW: Indicator if shipment was moved
        originalRack,   // 🔧 NEW: Original rack before any moves
        // Don't override currentBoxCount - it's the source of truth from database
      };
    }));

    res.json({
      shipments: shipmentsWithCounts,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single shipment
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

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
        invoices: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
            },
            lineItems: true,
          },
          orderBy: { createdAt: 'desc' },
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
    const shipmentData = shipment as any;

    // Add computed box counts
    const totalBoxes = shipmentData.boxes.length;
    const assignedBoxes = shipmentData.boxes.filter((b: any) => b.rackId !== null).length;
    const releasedBoxes = shipmentData.boxes.filter((b: any) => b.status === 'RELEASED').length;
    const inStorageBoxes = shipmentData.boxes.filter((b: any) => b.status === 'IN_STORAGE').length;

    // 🔧 FIX: Parse pieceQR and collect photos
    const boxesWithParsedQR = shipmentData.boxes.map((b: any) => {
      try {
        const pieceData = b.pieceQR ? (typeof b.pieceQR === 'string' ? JSON.parse(b.pieceQR) : b.pieceQR) : null;
        return { ...b, pieceQR: pieceData };
      } catch (e) {
        return { ...b, pieceQR: null };
      }
    });

    const shipmentPhotosSet = new Set<string>();
    for (const box of shipmentData.boxes) {
      if (box.photos) {
        try {
          const photos = typeof box.photos === 'string' ? JSON.parse(box.photos) : box.photos;
          if (Array.isArray(photos)) {
            photos.forEach((p: string) => shipmentPhotosSet.add(p));
          }
        } catch (e) {
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
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create shipment
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    // Uniform mode inputs
    let palletCount = parseOptionalInt(data.palletCount);
    let boxesPerPallet = parseOptionalInt(data.boxesPerPallet);
    // Variable mode inputs
    const boxesDistribution: number[] = Array.isArray(data.boxesDistribution)
      ? (data.boxesDistribution as any[]).map(v => parseOptionalInt(v) ?? 0)
      : [];
    const extraBoxes: number = parseOptionalInt(data.extraBoxes) ?? 0;

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
    } else if (boxesDistribution && boxesDistribution.length > 0) {
      // Variable mode: palletCount becomes distribution length
      palletCount = boxesDistribution.length;
      const distributionSum = boxesDistribution.reduce((a, b) => a + Math.max(0, Math.trunc(b || 0)), 0);
      const maxBPP = boxesDistribution.reduce((m, n) => Math.max(m, Math.max(0, Math.trunc(n || 0))), 0);
      boxesPerPallet = Math.max(maxBPP, 0);
      totalBoxCount = distributionSum + Math.max(0, Math.trunc(extraBoxes || 0));
      originalBoxCount = totalBoxCount;
    } else {
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

    let companyProfileId: string | null = null;
    let companyProfileName: string | null = null;

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

    let normalizedWarehouseData: string | null = null;

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
      } catch (warehouseParseError) {
        normalizedWarehouseData = typeof data.warehouseData === 'string'
          ? data.warehouseData
          : JSON.stringify(data.warehouseData);
      }
    } else if (data.isWarehouseShipment) {
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
    const createPayload: any = {
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

    // 🎯 AUTO-CALCULATE CBM if dimensions provided but CBM not set
    if (createPayload.length && createPayload.width && createPayload.height && !createPayload.cbm) {
      createPayload.cbm = (createPayload.length * createPayload.width * createPayload.height) / 1000000;
      console.log(`✅ Auto-calculated CBM: ${createPayload.cbm.toFixed(3)} m³ (${createPayload.length}×${createPayload.width}×${createPayload.height} cm)`);
    }

    const shipment = await prisma.shipment.create({
      data: createPayload,
      include: {
        companyProfile: {
          select: { id: true, name: true },
        },
      },
    });

    // ??? CREATE INDIVIDUAL QR CODES FOR EACH BOX
    const palletImagesMap: Record<number, string[]> = {};
    const palletPhotosPayload = Array.isArray(data.palletPhotos) ? data.palletPhotos : [];
    const boxesToCreate: any[] = [];
    if (boxesDistribution && boxesDistribution.length > 0) {
      // Variable mode: build by pallet segments then loose boxes
      let boxIdx = 0;
      for (let p = 1; p <= palletCount!; p++) {
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
          const photoList = (Array.isArray(palletEntry) ? palletEntry : [palletEntry]) as string[];
          const filtered = photoList.filter((url: string) => typeof url === 'string' && url.trim() !== '');
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
    } else {
      // Uniform mode: Check if box mode (palletCount === 0 or boxesPerPallet === 0)
      const isBoxMode = palletCount === 0 || boxesPerPallet === 0;

      for (let i = 1; i <= totalBoxCount; i++) {
        const palletNumber = isBoxMode ? 0 : Math.ceil(i / (boxesPerPallet as number));
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
          const photoList = (Array.isArray(palletEntry) ? palletEntry : [palletEntry]) as string[];
          const filtered = photoList.filter((url: string) => typeof url === 'string' && url.trim() !== '');
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
    let palletUpdates: any[] = [];
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
    } else {
      palletUpdates = Object.entries(palletImagesMap).map(([palletNumber, urls]) =>
        prisma.shipmentBox.updateMany({
          where: {
            shipmentId: shipment.id,
            boxNumber: {
              gte: (Number(palletNumber) - 1) * (boxesPerPallet as number) + 1,
              lte: Number(palletNumber) * (boxesPerPallet as number),
            },
            companyId,
          },
          data: {
            photos: JSON.stringify(urls),
          },
        })
      );
    }

    if (palletUpdates.length > 0) {
      await prisma.$transaction(palletUpdates);
    }

    // If rack assigned, recalculate capacity based on pallets AND CBM
    if (data.rackId) {
      await updateRackCapacityAndCBM(prisma, data.rackId, companyId);

      await prisma.rack.update({
        where: { id: data.rackId },
        data: {
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
          userId: req.user!.id,
          companyId,
          activityType: 'ASSIGN',
          itemDetails: boxesDistribution && boxesDistribution.length > 0
            ? `Shipment ${shipment.referenceId} - ${totalBoxCount} boxes (${palletCount} pallets; variable per pallet)`
            : `Shipment ${shipment.referenceId} - ${totalBoxCount} boxes (${palletCount} pallets x ${boxesPerPallet} boxes)`,
          quantityAfter: totalBoxCount,
        },
      });
    }

    // 📦 SAVE MULTI-DIMENSIONS if provided
    if (data.dimensionsData) {
      try {
        const dimensionsArray = typeof data.dimensionsData === 'string'
          ? JSON.parse(data.dimensionsData)
          : data.dimensionsData;

        if (Array.isArray(dimensionsArray) && dimensionsArray.length > 0) {
          for (const dim of dimensionsArray) {
            const length = parseFloat(dim.length) || 0;
            const width = parseFloat(dim.width) || 0;
            const height = parseFloat(dim.height) || 0;
            const quantity = parseInt(dim.qty) || parseInt(dim.quantity) || 1;
            const weight = parseFloat(dim.weight) || 0;
            const cbm = (length * width * height) / 1000000;
            const totalCBM = cbm * quantity;
            const totalWeight = weight * quantity;

            await prisma.$executeRaw`
              INSERT INTO shipment_dimensions (
                id, shipmentId, companyId, label, itemType, quantity,
                length, width, height, cbm, totalCBM, weight, totalWeight, notes, createdAt, updatedAt
              ) VALUES (
                ${require('crypto').randomUUID()},
                ${shipment.id},
                ${companyId},
                ${dim.label || 'Item'},
                ${'BOX'},
                ${quantity},
                ${length},
                ${width},
                ${height},
                ${cbm},
                ${totalCBM},
                ${weight},
                ${totalWeight},
                ${dim.notes || ''},
                NOW(),
                NOW()
              )
            `;
          }
          console.log(`✅ Saved ${dimensionsArray.length} dimensions for shipment ${shipment.referenceId}`);
        }
      } catch (dimErr) {
        console.error('Failed to save dimensions:', dimErr);
        // Don't fail the whole request, just log
      }
    }

    // 📧 SEND SHIPMENT INTAKE NOTIFICATION (Professional)
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const receivedBy = await prisma.user.findUnique({ where: { id: userId } });
      const rack = data.rackId ? await prisma.rack.findUnique({ where: { id: data.rackId } }) : null;

      // Use the new professional shipment created notification
      const emailResult = await sendShipmentCreatedNotification(companyId, {
        shipmentId: shipment.id,
        shipmentCode: shipment.referenceId,
        clientName: data.clientName || companyProfileName || 'Unknown',
        clientPhone: data.clientPhone || undefined,
        boxCount: totalBoxCount,
        cbm: data.cbm || undefined,
        weight: data.weight || undefined,
        rackLocation: rack?.code || undefined,
        receivedDate: new Date().toISOString(),
        receivedBy: receivedBy?.name || 'System',
        description: data.description || undefined,
        warehouseName: company?.name ? `${company.name} Warehouse` : undefined,
        dimensions: data.length && data.width && data.height ? {
          length: data.length,
          width: data.width,
          height: data.height,
        } : undefined,
        customRate: data.customRateEnabled && data.customRatePerBoxPerDay ? data.customRatePerBoxPerDay : undefined,
      });

      if (emailResult.success) {
        console.log(`📧 Shipment intake email sent for ${shipment.referenceId}`);
      } else {
        console.log(`📧 Shipment intake email failed: ${emailResult.error}`);
      }
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
    }

    res.status(201).json({ shipment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shipment
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const userId = req.user!.id;

    const existing = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Update shipment data - extract only valid Shipment fields
    const {
      name,
      referenceId,
      originalBoxCount,
      currentBoxCount,
      type,
      arrivalDate,
      clientName,
      clientPhone,
      clientEmail,
      description,
      estimatedValue,
      notes,
      status,
      assignedAt,
      releasedAt,
      storageCharge,
      isWarehouseShipment,
      warehouseData,
      shipper,
      consignee,
      category,
      awbNumber,
      flightNumber,
      origin,
      destination,
      customerName,
      companyProfileId,
      palletCount,
      boxesPerPallet,
      // Dimensions
      length,
      width,
      height,
      cbm,
      weight,
    } = req.body;

    const updateData: any = {};

    // Only include fields that are provided and valid
    if (name !== undefined) updateData.name = name;
    if (referenceId !== undefined) updateData.referenceId = referenceId;
    if (originalBoxCount !== undefined) updateData.originalBoxCount = originalBoxCount;
    if (currentBoxCount !== undefined) updateData.currentBoxCount = currentBoxCount;
    if (type !== undefined) updateData.type = type;
    if (arrivalDate !== undefined) updateData.arrivalDate = new Date(arrivalDate);
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
    if (description !== undefined) updateData.description = description;
    if (estimatedValue !== undefined) updateData.estimatedValue = estimatedValue;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (assignedAt !== undefined) updateData.assignedAt = assignedAt;
    if (releasedAt !== undefined) updateData.releasedAt = releasedAt;
    if (storageCharge !== undefined) updateData.storageCharge = storageCharge;
    if (isWarehouseShipment !== undefined) updateData.isWarehouseShipment = isWarehouseShipment;
    if (warehouseData !== undefined) updateData.warehouseData = warehouseData;
    if (shipper !== undefined) updateData.shipper = shipper;
    if (consignee !== undefined) updateData.consignee = consignee;
    if (category !== undefined) updateData.category = category;
    if (awbNumber !== undefined) updateData.awbNumber = awbNumber;
    if (flightNumber !== undefined) updateData.flightNumber = flightNumber;
    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) updateData.destination = destination;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (companyProfileId !== undefined) {
      if (!companyProfileId) {
        updateData.companyProfileId = null;
      } else {
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
    if (palletCount !== undefined) updateData.palletCount = parseOptionalInt(palletCount);
    if (boxesPerPallet !== undefined) updateData.boxesPerPallet = parseOptionalInt(boxesPerPallet);
    // Handle dimensions - allow null to clear values
    if (length !== undefined) updateData.length = length !== null ? parseFloat(length) : null;
    if (width !== undefined) updateData.width = width !== null ? parseFloat(width) : null;
    if (height !== undefined) updateData.height = height !== null ? parseFloat(height) : null;
    if (cbm !== undefined) updateData.cbm = cbm !== null ? parseFloat(cbm) : null;
    if (weight !== undefined) updateData.weight = weight !== null ? parseFloat(weight) : null;

    // 🎯 AUTO-CALCULATE CBM if dimensions changed but CBM not explicitly set
    const hasNewDimensions = length !== undefined || width !== undefined || height !== undefined;
    if (hasNewDimensions && cbm === undefined) {
      const finalLength = length !== undefined ? parseFloat(length) : existing.length;
      const finalWidth = width !== undefined ? parseFloat(width) : existing.width;
      const finalHeight = height !== undefined ? parseFloat(height) : existing.height;

      if (finalLength && finalWidth && finalHeight) {
        updateData.cbm = (finalLength * finalWidth * finalHeight) / 1000000;
        console.log(`✅ Auto-calculated CBM: ${updateData.cbm.toFixed(3)} m³ (${finalLength}×${finalWidth}×${finalHeight} cm)`);
      }
    }

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
        boxes: {
          select: {
            rackId: true,
          },
        },
      },
    });

    // 🔧 FIX: Update rack CBM when shipment dimensions/CBM changes
    const cbmChanged = cbm !== undefined || hasNewDimensions;
    if (cbmChanged && shipment.boxes && shipment.boxes.length > 0) {
      // Get unique rack IDs from shipment boxes
      const rackIds = [...new Set(shipment.boxes.filter((b: any) => b.rackId).map((b: any) => b.rackId))];

      // Update each rack's CBM
      for (const rackId of rackIds) {
        await updateRackCapacityAndCBM(prisma, rackId, companyId);
        console.log(`✅ Updated rack ${rackId} CBM after shipment ${id} dimension change`);
      }
    }

    res.json({ shipment });
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shipment boxes with QR codes
router.get('/:id/boxes', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

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
  } catch (error) {
    console.error('Get shipment boxes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign boxes to rack (for scanner & manual) with optional photos
router.post('/:id/assign-boxes',
  authorizeRoles('ADMIN', 'MANAGER', 'WORKER'),
  photoUpload.array('photos', 10), // Up to 10 photos
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { rackId, boxNumbers, skipCBMValidation } = req.body; // boxNumbers can be array or JSON string
      const companyId = req.user!.companyId;
      const uploadedFiles = req.files as Express.Multer.File[];

      if (!rackId || !boxNumbers) {
        return res.status(400).json({ error: 'Rack ID and box numbers required' });
      }

      const parsedBoxNumbers = Array.isArray(boxNumbers)
        ? boxNumbers
        : typeof boxNumbers === 'string'
          ? JSON.parse(boxNumbers)
          : [];

      const normalizedBoxNumbers = parsedBoxNumbers
        .map((value: any) => (typeof value === 'number' ? value : parseInt(value, 10)))
        .filter((value: number) => Number.isInteger(value) && value > 0);

      if (normalizedBoxNumbers.length === 0) {
        return res.status(400).json({ error: 'At least one box number required' });
      }

      // 🔒 CBM CAPACITY VALIDATION - Block assignment if rack doesn't have enough CBM space
      const shipment = await prisma.shipment.findFirst({
        where: { id, companyId },
        select: { cbm: true, originalBoxCount: true, referenceId: true }
      });

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      // Get rack CBM capacity and current usage
      const rackCBM = await prisma.$queryRaw<any[]>`
        SELECT cbmCapacity, cbmUsed FROM racks WHERE id = ${rackId} AND companyId = ${companyId}
      `;

      if (rackCBM.length === 0) {
        return res.status(404).json({ error: 'Rack not found' });
      }

      const rackCBMCapacity = Number(rackCBM[0].cbmCapacity) || 0;
      const rackCBMUsed = Number(rackCBM[0].cbmUsed) || 0;
      const rackCBMRemaining = rackCBMCapacity - rackCBMUsed;

      // Calculate CBM for boxes being assigned
      const shipmentCBM = Number(shipment.cbm) || 0;
      const shipmentTotalBoxes = Number(shipment.originalBoxCount) || 1;
      const cbmPerBox = shipmentCBM / shipmentTotalBoxes;
      const assignmentCBM = cbmPerBox * normalizedBoxNumbers.length;

      console.log('📦 CBM Assignment Check:', {
        shipment: shipment.referenceId,
        shipmentCBM,
        totalBoxes: shipmentTotalBoxes,
        cbmPerBox: cbmPerBox.toFixed(4),
        boxesBeingAssigned: normalizedBoxNumbers.length,
        assignmentCBM: assignmentCBM.toFixed(4),
        rackCBMCapacity,
        rackCBMUsed: rackCBMUsed.toFixed(4),
        rackCBMRemaining: rackCBMRemaining.toFixed(4)
      });

      // Block if assignment would exceed rack capacity (only if rack has CBM capacity set)
      if (rackCBMCapacity > 0 && assignmentCBM > rackCBMRemaining && !skipCBMValidation) {
        return res.status(400).json({
          error: `CBM capacity exceeded! Assignment needs ${assignmentCBM.toFixed(2)} m³ but rack only has ${rackCBMRemaining.toFixed(2)} m³ available.`,
          code: 'CBM_EXCEEDED',
          details: {
            assignmentCBM: assignmentCBM.toFixed(4),
            rackCBMCapacity,
            rackCBMUsed: rackCBMUsed.toFixed(4),
            rackCBMRemaining: rackCBMRemaining.toFixed(4),
            cbmPerBox: cbmPerBox.toFixed(4),
            boxesBeingAssigned: normalizedBoxNumbers.length
          }
        });
      }

      // Prepare photo URLs
      const photoUrls = uploadedFiles?.map(file => `/uploads/shipments/${file.filename}`) || [];

      const boxUpdateData: Record<string, any> = {
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

        let mergedPhotos: string[] = [];

        if (existingSample?.photos) {
          try {
            const parsed = JSON.parse(existingSample.photos);
            if (Array.isArray(parsed)) {
              mergedPhotos = parsed.filter((url: any) => typeof url === 'string');
            }
          } catch (parseError) {
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

      // Update rack capacity (pallets AND CBM)
      await updateRackCapacityAndCBM(prisma, rackId, companyId);

      // Update rack last activity
      await prisma.rack.update({
        where: { id: rackId },
        data: {
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
          assignedById: assignedCount > 0 ? req.user!.id : null, // Track who assigned
        },
      });

      // Log activity
      await prisma.rackActivity.create({
        data: {
          rackId,
          userId: req.user!.id,
          companyId,
          activityType: 'ASSIGN',
          itemDetails: `${normalizedBoxNumbers.length} boxes from shipment ${id}${photoUrls.length > 0 ? ` (${photoUrls.length} photos)` : ''}`,
          quantityAfter: assignedCount,
        },
      });

      res.json({
        success: true,
        assigned: normalizedBoxNumbers.length,
        assignedTotal: assignedCount,
        totalBoxes,
        remainingUnassigned,
        shipmentStatus: newStatus,
        photosUploaded: photoUrls.length,
        photoUrls
      });
    } catch (error) {
      console.error('Assign boxes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Release boxes from shipment
router.post('/:id/release-boxes', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { boxNumbers, releaseAll, collectorID, releasePhotos } = req.body; // boxNumbers = [1,2,3] or releaseAll = true
    const companyId = req.user!.companyId;

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
      ? shipment.boxes.filter((b: any) => b.status === 'IN_STORAGE')
      : shipment.boxes.filter((b: any) => boxNumbers.includes(b.boxNumber) && b.status === 'IN_STORAGE');

    if (boxesToRelease.length === 0) {
      return res.status(400).json({ error: 'No boxes available to release' });
    }

    // Group boxes by rack to update capacity
    const rackUpdates: Record<string, number> = {};
    boxesToRelease.forEach((box: any) => {
      if (box.rackId) {
        rackUpdates[box.rackId] = (rackUpdates[box.rackId] || 0) + 1;
      }
    });

    // Update boxes to RELEASED status
    await prisma.shipmentBox.updateMany({
      where: {
        shipmentId: id,
        boxNumber: { in: boxesToRelease.map((b: any) => b.boxNumber) },
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        rackId: null, // Remove from rack
      },
    });

    // Update rack capacities using pallet-based calculations AND CBM
    for (const [rackId, count] of Object.entries(rackUpdates)) {
      const { palletsUsed } = await updateRackCapacityAndCBM(prisma, rackId, companyId);

      await prisma.rack.update({
        where: { id: rackId },
        data: {
          lastActivity: new Date(),
        },
      });

      // Log activity
      await prisma.rackActivity.create({
        data: {
          rackId,
          userId: req.user!.id,
          companyId,
          activityType: 'RELEASE',
          itemDetails: `Released ${count} boxes from shipment ${shipment.referenceId}`,
          quantityAfter: palletsUsed,
        },
      });
    }

    // Check if all boxes are released
    const remainingBoxes = shipment.boxes.filter(
      (b: any) => !boxesToRelease.some((rb: any) => rb.id === b.id) && b.status === 'IN_STORAGE'
    );

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

    // 📧 SEND EMAIL NOTIFICATION
    let notificationSent = false;
    try {
      // Get company info for email
      const company = await prisma.company.findUnique({ where: { id: companyId } });

      // Calculate days stored
      const arrivalDate = new Date(shipment.arrivalDate);
      const daysStored = Math.ceil((new Date().getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get rack location for released boxes
      const rackLocations = [...new Set(boxesToRelease.filter((b: any) => b.rack).map((b: any) => b.rack?.name))];
      const rackLocation = rackLocations.length > 0 ? rackLocations.join(', ') : undefined;

      // Build full photo URLs if releasePhotos are provided
      const fullPhotoUrls = releasePhotos?.map((photo: string) => {
        if (photo.startsWith('http')) return photo;
        return `${req.protocol}://${req.get('host')}${photo}`;
      });

      // Send release notification email - uses notification settings for recipients
      const emailResult = await sendReleaseNotification(companyId, {
        shipmentId: shipment.id,
        shipmentCode: shipment.referenceId,
        clientName: shipment.clientName || 'Customer',
        clientPhone: shipment.clientPhone || undefined,
        boxesReleased: boxesToRelease.length,
        totalBoxes: shipment.boxes.length,
        remainingBoxes: remainingBoxes.length,
        releaseType: releaseAll ? 'FULL' : 'PARTIAL',
        releasedBy: req.user?.name || 'Admin',
        totalCharges: settings.generateReleaseInvoice ? totalCharges : undefined,
        // Additional professional details
        cbm: shipment.cbm || undefined,
        weight: shipment.weight || undefined,
        rackLocation: rackLocation,
        receivedDate: shipment.arrivalDate?.toISOString(),
        daysStored: daysStored,
        collectorID: collectorID || undefined,
        photos: fullPhotoUrls,
        description: shipment.description || undefined,
        warehouseName: company?.name ? `${company.name} Warehouse` : undefined,
        currency: 'KWD',
      });

      notificationSent = emailResult.success;
      if (emailResult.success) {
        console.log(`📧 Release email sent for shipment ${shipment.referenceId}`);
      } else {
        console.log(`📧 Release email failed: ${emailResult.error}`);
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    // Also send SMS if phone available
    if (settings.notifyClientOnRelease && shipment.clientPhone) {
      console.log(`📱 SMS notification would be sent to ${shipment.clientPhone}: ${boxesToRelease.length} boxes released`);
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
  } catch (error) {
    console.error('Release boxes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shipment (STRICT: prevent deletion if materials allocated to racks)
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

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
      const hasBoxesInStorage = existing.boxes.some(box =>
        box.status === 'IN_STORAGE' || box.status === 'IN_WAREHOUSE'
      );

      if (hasBoxesInStorage) {
        console.log(`❌ BLOCKED: ${hasBoxesInStorage} boxes in storage, shipment not released`);
        return res.status(400).json({
          error: 'Cannot delete shipment: Materials are currently allocated to racks',
          detail: `Release the shipment first before deletion.`,
        });
      }
    } else {
      console.log(`✅ ALLOWED: Shipment is RELEASED, ignoring box status`);
    }
    // If shipment status is RELEASED, allow deletion regardless of box status (handles data inconsistencies)

    // Delete associated photos from storage if they exist
    const allBoxes = await prisma.shipmentBox.findMany({
      where: { shipmentId: id },
      select: { photos: true }
    });

    // Collect all photo URLs from boxes
    const photoUrls: string[] = [];
    for (const box of allBoxes) {
      if (box.photos) {
        try {
          const photos = JSON.parse(box.photos);
          if (Array.isArray(photos)) {
            photoUrls.push(...photos);
          }
        } catch (e) {
          console.log('Failed to parse photos JSON:', e);
        }
      }
    }

    // Delete photo files from disk
    if (photoUrls.length > 0) {
      const path = await import('path');
      const fs = await import('fs');
      const uploadsDir = path.join(process.cwd(), 'uploads');

      for (const photoUrl of photoUrls) {
        try {
          // Extract file path from URL (e.g., "uploads/shipments/photo.jpg")
          const filePath = path.join(process.cwd(), photoUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted photo: ${photoUrl}`);
          }
        } catch (err) {
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

    // 🔧 UPDATE RACK CAPACITIES AND CBM (prevents capacity leak)
    for (const rackId of affectedRackIds) {
      if (rackId) {
        const { palletsUsed } = await updateRackCapacityAndCBM(prisma, rackId, companyId);
        await prisma.rack.update({
          where: { id: rackId },
          data: {
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
  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup test/mock data - ADMIN ONLY
router.post('/cleanup/test-data', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { confirmText } = req.body;

    // Safety check - must type "DELETE TEST DATA" to confirm
    if (confirmText !== 'DELETE TEST DATA') {
      return res.status(400).json({
        error: 'Confirmation text incorrect. Please type "DELETE TEST DATA" to confirm.'
      });
    }

    // Find shipments with test/demo indicators (case-insensitive via SQL)
    const testShipments = await prisma.$queryRaw<any[]>`
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

    const shipmentIds = testShipments.map((s: any) => s.id);

    // Delete related boxes first
    const deletedBoxes = await prisma.$executeRaw`
      DELETE FROM boxes WHERE shipmentId IN (${shipmentIds.join(',')})
    `;

    // Delete shipments
    const deletedShipments = await prisma.$executeRaw`
      DELETE FROM shipments WHERE id IN (${shipmentIds.join(',')})
    `;

    res.json({
      message: 'Test data deleted successfully',
      deleted: testShipments.length,
      deletedBoxes,
      shipments: testShipments.map((s: any) => ({
        id: s.id,
        referenceId: s.referenceId,
        clientName: s.clientName,
        shipper: s.shipper,
        consignee: s.consignee,
      })),
    });
  } catch (error) {
    console.error('Cleanup test data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// CUSTOM CHARGES MANAGEMENT (Per-Shipment Pricing)
// ==========================================

// Get current charges calculation for a shipment
router.get('/:id/charges-calculation', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const calculation = await calculateShipmentCharges(prisma, id, companyId);

    res.json({
      success: true,
      shipmentId: id,
      calculation
    });
  } catch (error: any) {
    console.error('Get charges calculation error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate charges' });
  }
});

// Preview charges with different rate scenarios (doesn't save)
router.post('/:id/charges-preview', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customRateEnabled, ratePerCBMPerDay, ratePerBoxPerDay } = req.body;
    const companyId = req.user!.companyId;

    const preview = await previewShipmentCharges(prisma, id, companyId, {
      enabled: customRateEnabled,
      ratePerCBMPerDay: ratePerCBMPerDay ? parseFloat(ratePerCBMPerDay) : undefined,
      ratePerBoxPerDay: ratePerBoxPerDay ? parseFloat(ratePerBoxPerDay) : undefined
    });

    res.json({
      success: true,
      shipmentId: id,
      preview
    });
  } catch (error: any) {
    console.error('Preview charges error:', error);
    res.status(500).json({ error: error.message || 'Failed to preview charges' });
  }
});

// Set custom charges for a shipment
router.patch('/:id/custom-charges', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customRateEnabled, ratePerCBMPerDay, ratePerBoxPerDay, notes } = req.body;
    const companyId = req.user!.companyId;

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
      } as any // Type cast for new fields
    });

    // Type cast to access custom rate fields
    const updatedData = updated as any;

    // Recalculate charges with new rates
    await updateShipmentCharges(prisma, id, companyId);

    // Get updated calculation for response
    const calculation = await calculateShipmentCharges(prisma, id, companyId);

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
  } catch (error: any) {
    console.error('Set custom charges error:', error);
    res.status(500).json({ error: error.message || 'Failed to set custom charges' });
  }
});

// Recalculate charges manually (useful after data changes)
router.post('/:id/recalculate-charges', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    await updateShipmentCharges(prisma, id, companyId);
    const calculation = await calculateShipmentCharges(prisma, id, companyId);

    res.json({
      success: true,
      message: 'Charges recalculated successfully',
      calculation
    });
  } catch (error: any) {
    console.error('Recalculate charges error:', error);
    res.status(500).json({ error: error.message || 'Failed to recalculate charges' });
  }
});

// ==========================================
// ASSIGN BOXES TO RACK (with Pallet support)
// ==========================================
router.post('/:shipmentId/assign-rack',
  authorizeRoles('ADMIN', 'MANAGER', 'WORKER'),
  async (req: AuthRequest, res: Response) => {
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
      const boxesByPallet: Record<number, any[]> = {};
      unassignedBoxes.forEach((box: any) => {
        const pieceData = box.pieceQR ? JSON.parse(box.pieceQR) : {};
        const palletNum = pieceData.palletNumber ?? 0; // null/undefined → 0 (loose)
        if (!boxesByPallet[palletNum]) boxesByPallet[palletNum] = [];
        boxesByPallet[palletNum].push(box);
      });

      // Build list of boxes to assign based on frontend selection
      const boxesToAssign: any[] = [];
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
        boxNumbers: boxesToAssign.map((b: any) => b.boxNumber)
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

      const updatedBoxes = await prisma.$transaction(
        boxesToAssign.map((box: any, index: number) => {
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
        })
      );

      // 🔧 CRITICAL FIX: Use updateRackCapacityAndCBM for consistency
      // This ensures all capacity calculations use the same method (pallets AND CBM)
      const { palletsUsed: finalPalletsUsed } = await updateRackCapacityAndCBM(prisma, rackId, req.user!.companyId);

      await prisma.rack.update({
        where: { id: rackId },
        data: {
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
      } else if (remainingBoxes < shipment.currentBoxCount) {
        newStatus = 'PARTIAL';
      }

      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: newStatus,
          assignedById: req.user!.id, // Track who assigned
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

    } catch (error) {
      console.error('❌ Assign-rack error:', error);
      res.status(500).json({ error: 'Failed to assign boxes to rack' });
    }
  }
);

// ==========================================
// MOVE BOXES BETWEEN RACKS (with Audit Trail)
// ==========================================
router.post('/:shipmentId/move-boxes',
  authorizeRoles('ADMIN', 'MANAGER', 'WORKER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { shipmentId } = req.params;
      const {
        sourceRackId,
        destinationRackId,
        boxIds, // Array of box IDs to move
        reason,
        authorizedById,
        notes,
        photos // New photos taken during move
      } = req.body;

      console.log('🔄 Move-boxes request:', {
        shipmentId,
        sourceRackId,
        destinationRackId,
        boxIds: boxIds?.length,
        reason,
        authorizedById,
        notes,
        photos: photos?.length || 0
      });

      // Validation
      if (!sourceRackId || !destinationRackId || !boxIds?.length || !reason || !authorizedById) {
        return res.status(400).json({
          error: 'Missing required fields: sourceRackId, destinationRackId, boxIds, reason, authorizedById'
        });
      }

      if (sourceRackId === destinationRackId) {
        return res.status(400).json({
          error: 'Source and destination racks cannot be the same'
        });
      }

      // Get shipment with boxes
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          boxes: {
            where: { id: { in: boxIds } }
          }
        }
      });

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      // Verify all boxes belong to source rack
      const invalidBoxes = shipment.boxes.filter((box: any) => box.rackId !== sourceRackId);
      if (invalidBoxes.length > 0) {
        return res.status(400).json({
          error: `Some boxes are not in the source rack`,
          invalidBoxIds: invalidBoxes.map((b: any) => b.id)
        });
      }

      // Get source rack with current photos
      const sourceRack = await prisma.rack.findUnique({
        where: { id: sourceRackId }
      });

      if (!sourceRack) {
        return res.status(404).json({ error: 'Source rack not found' });
      }

      // Get destination rack and check capacity
      const destRack = await prisma.rack.findUnique({
        where: { id: destinationRackId }
      });

      if (!destRack) {
        return res.status(404).json({ error: 'Destination rack not found' });
      }

      // Get authorized user details
      const authorizedUser = await prisma.user.findUnique({
        where: { id: authorizedById },
        select: { id: true, name: true, role: true }
      });

      if (!authorizedUser || !['ADMIN', 'MANAGER'].includes(authorizedUser.role)) {
        return res.status(400).json({
          error: 'Invalid authorized user. Must be ADMIN or MANAGER.'
        });
      }

      // Get old photos from boxes (before move)
      const oldPhotos: string[] = [];
      shipment.boxes.forEach((box: any) => {
        if (box.photos) {
          try {
            const boxPhotos = JSON.parse(box.photos);
            oldPhotos.push(...boxPhotos);
          } catch (e) { }
        }
      });

      // Calculate pallet usage for capacity check
      const boxesPerPallet = shipment.boxesPerPallet || 0;
      const palletsToMove = boxesPerPallet > 0
        ? Math.ceil(boxIds.length / boxesPerPallet)
        : 0;

      // Check destination rack capacity
      const destCurrentUsage = destRack.capacityUsed || 0;
      const destMaxCapacity = destRack.capacityTotal || 100;

      if (destCurrentUsage + palletsToMove > destMaxCapacity) {
        return res.status(400).json({
          error: `Destination rack capacity exceeded. Current: ${destCurrentUsage}, Adding: ${palletsToMove}, Max: ${destMaxCapacity}`
        });
      }

      // Prepare move details for history (minimal data to avoid column overflow)
      const moveDetails = {
        shipmentId,
        shipmentName: shipment.name,
        customerName: shipment.clientName || shipment.customerName || 'Unknown',
        fromRack: sourceRack.code,
        toRack: destRack.code,
        boxCount: boxIds.length,
        reason,
        authorizedBy: authorizedUser.name,
        movedBy: req.user!.name
      };

      const photosJson = photos && photos.length > 0 ? JSON.stringify(photos) : null;

      // Execute move in transaction
      await prisma.$transaction(async (tx) => {
        // 1. Update boxes to new rack
        await tx.shipmentBox.updateMany({
          where: { id: { in: boxIds } },
          data: {
            rackId: destinationRackId,
            photos: photosJson, // Update photos with new ones
            updatedAt: new Date()
          }
        });

        // 2. Log RackActivity for SOURCE rack (MOVE OUT)
        await tx.rackActivity.create({
          data: {
            rackId: sourceRackId,
            userId: req.user!.id,
            activityType: 'MOVE',
            itemDetails: JSON.stringify({
              ...moveDetails,
              direction: 'OUT',
              description: `Moved ${boxIds.length} boxes to ${destRack.code}`
            }),
            quantityBefore: sourceRack.capacityUsed || 0,
            quantityAfter: (sourceRack.capacityUsed || 0) - palletsToMove,
            photos: JSON.stringify({ old: oldPhotos, new: photos || [] }),
            notes: `Move to ${destRack.code}: ${reason}${notes ? ' - ' + notes : ''}`,
            companyId: req.user!.companyId
          }
        });

        // 3. Log RackActivity for DESTINATION rack (MOVE IN)
        await tx.rackActivity.create({
          data: {
            rackId: destinationRackId,
            userId: req.user!.id,
            activityType: 'MOVE',
            itemDetails: JSON.stringify({
              ...moveDetails,
              direction: 'IN',
              description: `Received ${boxIds.length} boxes from ${sourceRack.code}`
            }),
            quantityBefore: destRack.capacityUsed || 0,
            quantityAfter: (destRack.capacityUsed || 0) + palletsToMove,
            photos: JSON.stringify({ old: oldPhotos, new: photos || [] }),
            notes: `Move from ${sourceRack.code}: ${reason}${notes ? ' - ' + notes : ''}`,
            companyId: req.user!.companyId
          }
        });
      });

      // 4. Recompute capacities AND CBM for both racks
      const { palletsUsed: sourceCapacity } = await updateRackCapacityAndCBM(prisma, sourceRackId, req.user!.companyId);
      const { palletsUsed: destCapacity } = await updateRackCapacityAndCBM(prisma, destinationRackId, req.user!.companyId);

      // 5. Update rack statuses
      await prisma.rack.update({
        where: { id: sourceRackId },
        data: {
          lastActivity: new Date(),
          status: sourceCapacity >= (sourceRack.capacityTotal || 100) ? 'FULL' :
            sourceCapacity > 0 ? 'OCCUPIED' : 'AVAILABLE'
        }
      });

      await prisma.rack.update({
        where: { id: destinationRackId },
        data: {
          lastActivity: new Date(),
          status: destCapacity >= (destRack.capacityTotal || 100) ? 'FULL' :
            destCapacity > 0 ? 'OCCUPIED' : 'AVAILABLE'
        }
      });

      // 6. Update shipment status from PENDING to IN_STORAGE if boxes are now in racks
      if (shipment.status === 'PENDING') {
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: {
            status: 'IN_STORAGE'
          }
        });
      }

      console.log('✅ Move completed successfully:', {
        shipmentId,
        from: sourceRack.code,
        to: destRack.code,
        boxesMoved: boxIds.length,
        authorizedBy: authorizedUser.name
      });

      res.json({
        success: true,
        message: `Successfully moved ${boxIds.length} boxes from ${sourceRack.code} to ${destRack.code}`,
        moveDetails: {
          boxesMoved: boxIds.length,
          from: { code: sourceRack.code, newCapacity: sourceCapacity },
          to: { code: destRack.code, newCapacity: destCapacity },
          reason,
          authorizedBy: authorizedUser.name,
          movedBy: req.user!.name
        }
      });

    } catch (error) {
      console.error('❌ Move-boxes error:', error);
      res.status(500).json({ error: 'Failed to move boxes between racks' });
    }
  }
);

// ==========================================
// GET MOVE HISTORY FOR SHIPMENT
// ==========================================
router.get('/:shipmentId/move-history',
  authorizeRoles('ADMIN', 'MANAGER', 'WORKER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { shipmentId } = req.params;

      // Get all MOVE type activities related to this shipment
      const moveActivities = await prisma.rackActivity.findMany({
        where: {
          companyId: req.user!.companyId,
          activityType: 'MOVE',
          itemDetails: {
            contains: shipmentId
          }
        },
        include: {
          rack: {
            select: { id: true, code: true, zone: true, location: true }
          },
          user: {
            select: { id: true, name: true, role: true }
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Parse and format the history
      const history = moveActivities.map(activity => {
        let details: any = {};
        let photos: any = {};

        try {
          details = JSON.parse(activity.itemDetails || '{}');
          photos = JSON.parse(activity.photos || '{}');
        } catch (e) { }

        return {
          id: activity.id,
          direction: details.direction, // 'IN' or 'OUT'
          fromRack: details.fromRack,
          toRack: details.toRack,
          boxCount: details.boxCount,
          boxNumbers: details.boxNumbers,
          reason: details.reason,
          notes: details.notes,
          authorizedBy: details.authorizedBy,
          movedBy: {
            id: activity.user.id,
            name: activity.user.name,
            role: activity.user.role
          },
          oldPhotos: photos.old || [],
          newPhotos: photos.new || [],
          timestamp: activity.timestamp
        };
      });

      // Group by move operation (pair IN and OUT)
      const groupedHistory: any[] = [];
      const processedIds = new Set();

      for (const item of history) {
        if (processedIds.has(item.id)) continue;

        // Find the pair (IN for OUT, OUT for IN) - comparing rack codes as strings
        const pair = history.find(h =>
          h.id !== item.id &&
          h.fromRack === item.fromRack &&
          h.toRack === item.toRack &&
          Math.abs(new Date(h.timestamp).getTime() - new Date(item.timestamp).getTime()) < 5000 // within 5 seconds
        );

        if (pair) {
          processedIds.add(pair.id);
        }
        processedIds.add(item.id);

        // Use the OUT record as primary (has complete info)
        const primary = item.direction === 'OUT' ? item : (pair?.direction === 'OUT' ? pair : item);

        groupedHistory.push({
          id: primary.id,
          fromRack: { code: primary.fromRack },
          toRack: { code: primary.toRack },
          boxCount: primary.boxCount,
          boxNumbers: primary.boxNumbers,
          reason: primary.reason,
          notes: primary.notes,
          authorizedBy: { name: primary.authorizedBy, role: 'ADMIN' },
          movedBy: primary.movedBy,
          oldPhotos: primary.oldPhotos,
          newPhotos: primary.newPhotos,
          timestamp: primary.timestamp
        });
      }

      res.json({
        success: true,
        history: groupedHistory
      });

    } catch (error) {
      console.error('❌ Get move history error:', error);
      res.status(500).json({ error: 'Failed to fetch move history' });
    }
  }
);

// ============================================
// SHIPMENT DIMENSIONS MANAGEMENT
// Multiple dimensions per shipment (pallets, boxes, crates, etc.)
// ============================================

// Helper to generate unique ID
const generateDimensionId = () => {
  return 'dim_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// GET dimensions for a shipment
router.get('/:shipmentId/dimensions', authorizeRoles('ADMIN', 'MANAGER', 'WORKER', 'SCANNER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId } = req.params;

    console.log(`📦 GET dimensions for shipment: ${shipmentId}, company: ${companyId}`);

    // Verify shipment exists and belongs to company
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId }
    });

    if (!shipment) {
      console.log(`❌ Shipment not found: ${shipmentId}`);
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const dimensions = await prisma.$queryRaw<any[]>`
      SELECT * FROM shipment_dimensions 
      WHERE shipmentId = ${shipmentId} AND companyId = ${companyId}
      ORDER BY createdAt ASC
    `;

    console.log(`📦 Found ${dimensions.length} dimensions for shipment ${shipmentId}`);

    // Calculate totals
    const totalCBM = dimensions.reduce((sum: number, d: any) => sum + (Number(d.totalCBM) || 0), 0);
    const totalWeight = dimensions.reduce((sum: number, d: any) => sum + (Number(d.totalWeight) || 0), 0);
    const totalItems = dimensions.reduce((sum: number, d: any) => sum + (Number(d.quantity) || 0), 0);

    res.json({
      success: true,
      dimensions,
      summary: {
        totalCBM: parseFloat(totalCBM.toFixed(4)),
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        totalItems,
        dimensionCount: dimensions.length
      }
    });
  } catch (error: any) {
    console.error('Get shipment dimensions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD dimension to shipment
router.post('/:shipmentId/dimensions', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId } = req.params;
    const { label, itemType, quantity, length, width, height, cbm, weight, notes } = req.body;

    // Validate required fields
    if (!length || !width || !height) {
      return res.status(400).json({ error: 'Length, width, and height are required' });
    }

    // Verify shipment exists and belongs to company
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Calculate CBM if not provided
    const calculatedCBM = cbm || (parseFloat(length) * parseFloat(width) * parseFloat(height)) / 1000000;
    const qty = parseInt(quantity) || 1;
    const totalCBMValue = calculatedCBM * qty;
    const totalWeightValue = weight ? parseFloat(weight) * qty : null;
    const dimensionId = generateDimensionId();

    await prisma.$executeRaw`
      INSERT INTO shipment_dimensions (
        id, shipmentId, companyId, label, itemType, quantity,
        length, width, height, cbm, totalCBM, weight, totalWeight, notes
      ) VALUES (
        ${dimensionId}, ${shipmentId}, ${companyId}, ${label || null}, ${itemType || 'BOX'}, ${qty},
        ${parseFloat(length)}, ${parseFloat(width)}, ${parseFloat(height)},
        ${parseFloat(calculatedCBM.toFixed(4))}, ${parseFloat(totalCBMValue.toFixed(4))},
        ${weight ? parseFloat(weight) : null}, ${totalWeightValue ? parseFloat(totalWeightValue.toFixed(2)) : null},
        ${notes || null}
      )
    `;

    // Update shipment's main CBM field with total of all dimensions
    await updateShipmentTotalCBMRaw(shipmentId, companyId);

    res.status(201).json({
      success: true,
      message: 'Dimension added successfully',
      dimension: {
        id: dimensionId,
        shipmentId,
        label: label || null,
        itemType: itemType || 'BOX',
        quantity: qty,
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        cbm: parseFloat(calculatedCBM.toFixed(4)),
        totalCBM: parseFloat(totalCBMValue.toFixed(4)),
        weight: weight ? parseFloat(weight) : null,
        totalWeight: totalWeightValue ? parseFloat(totalWeightValue.toFixed(2)) : null,
        notes: notes || null
      }
    });
  } catch (error: any) {
    console.error('Add shipment dimension error:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE dimension
router.put('/:shipmentId/dimensions/:dimensionId', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId, dimensionId } = req.params;
    const { label, itemType, quantity, length, width, height, cbm, weight, notes } = req.body;

    // Verify dimension exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM shipment_dimensions 
      WHERE id = ${dimensionId} AND shipmentId = ${shipmentId} AND companyId = ${companyId}
    `;

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Dimension not found' });
    }

    const current = existing[0];

    // Calculate CBM if not provided
    const finalLength = length !== undefined ? parseFloat(length) : Number(current.length);
    const finalWidth = width !== undefined ? parseFloat(width) : Number(current.width);
    const finalHeight = height !== undefined ? parseFloat(height) : Number(current.height);
    const calculatedCBM = cbm !== undefined ? parseFloat(cbm) : (finalLength * finalWidth * finalHeight) / 1000000;
    const qty = quantity !== undefined ? parseInt(quantity) : Number(current.quantity);
    const totalCBMValue = calculatedCBM * qty;
    const finalWeight = weight !== undefined ? (weight ? parseFloat(weight) : null) : current.weight;
    const totalWeightValue = finalWeight ? finalWeight * qty : null;

    await prisma.$executeRaw`
      UPDATE shipment_dimensions SET
        label = ${label !== undefined ? label : current.label},
        itemType = ${itemType !== undefined ? itemType : current.itemType},
        quantity = ${qty},
        length = ${finalLength},
        width = ${finalWidth},
        height = ${finalHeight},
        cbm = ${parseFloat(calculatedCBM.toFixed(4))},
        totalCBM = ${parseFloat(totalCBMValue.toFixed(4))},
        weight = ${finalWeight},
        totalWeight = ${totalWeightValue ? parseFloat(totalWeightValue.toFixed(2)) : null},
        notes = ${notes !== undefined ? notes : current.notes},
        updatedAt = NOW()
      WHERE id = ${dimensionId}
    `;

    // Update shipment's main CBM field
    await updateShipmentTotalCBMRaw(shipmentId, companyId);

    res.json({
      success: true,
      message: 'Dimension updated successfully'
    });
  } catch (error: any) {
    console.error('Update shipment dimension error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE dimension
router.delete('/:shipmentId/dimensions/:dimensionId', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId, dimensionId } = req.params;

    // Verify dimension exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM shipment_dimensions 
      WHERE id = ${dimensionId} AND shipmentId = ${shipmentId} AND companyId = ${companyId}
    `;

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Dimension not found' });
    }

    await prisma.$executeRaw`
      DELETE FROM shipment_dimensions WHERE id = ${dimensionId}
    `;

    // Update shipment's main CBM field
    await updateShipmentTotalCBMRaw(shipmentId, companyId);

    res.json({
      success: true,
      message: 'Dimension deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete shipment dimension error:', error);
    res.status(500).json({ error: error.message });
  }
});

// BULK save dimensions (replace all)
router.post('/:shipmentId/dimensions/bulk', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId } = req.params;
    const { dimensions } = req.body; // Array of dimension objects

    if (!Array.isArray(dimensions)) {
      return res.status(400).json({ error: 'dimensions must be an array' });
    }

    // Verify shipment exists
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Delete existing dimensions
    await prisma.$executeRaw`
      DELETE FROM shipment_dimensions WHERE shipmentId = ${shipmentId} AND companyId = ${companyId}
    `;

    // Create new dimensions
    const createdDimensions: any[] = [];
    for (const dim of dimensions) {
      if (!dim.length || !dim.width || !dim.height) {
        continue; // Skip invalid entries
      }

      const calculatedCBM = dim.cbm || (parseFloat(dim.length) * parseFloat(dim.width) * parseFloat(dim.height)) / 1000000;
      const qty = parseInt(dim.quantity) || 1;
      const totalCBMValue = calculatedCBM * qty;
      const totalWeightValue = dim.weight ? parseFloat(dim.weight) * qty : null;
      const dimensionId = dim.id || generateDimensionId();

      await prisma.$executeRaw`
        INSERT INTO shipment_dimensions (
          id, shipmentId, companyId, label, itemType, quantity,
          length, width, height, cbm, totalCBM, weight, totalWeight, notes
        ) VALUES (
          ${dimensionId}, ${shipmentId}, ${companyId}, ${dim.label || null}, ${dim.itemType || 'BOX'}, ${qty},
          ${parseFloat(dim.length)}, ${parseFloat(dim.width)}, ${parseFloat(dim.height)},
          ${parseFloat(calculatedCBM.toFixed(4))}, ${parseFloat(totalCBMValue.toFixed(4))},
          ${dim.weight ? parseFloat(dim.weight) : null}, ${totalWeightValue ? parseFloat(totalWeightValue.toFixed(2)) : null},
          ${dim.notes || null}
        )
      `;

      createdDimensions.push({
        id: dimensionId,
        shipmentId,
        label: dim.label || null,
        itemType: dim.itemType || 'BOX',
        quantity: qty,
        length: parseFloat(dim.length),
        width: parseFloat(dim.width),
        height: parseFloat(dim.height),
        cbm: parseFloat(calculatedCBM.toFixed(4)),
        totalCBM: parseFloat(totalCBMValue.toFixed(4)),
        weight: dim.weight ? parseFloat(dim.weight) : null,
        totalWeight: totalWeightValue ? parseFloat(totalWeightValue.toFixed(2)) : null,
        notes: dim.notes || null
      });
    }

    // Update shipment's main CBM field
    await updateShipmentTotalCBMRaw(shipmentId, companyId);

    // Calculate totals
    const totalCBM = createdDimensions.reduce((sum, d) => sum + (d.totalCBM || 0), 0);
    const totalWeight = createdDimensions.reduce((sum, d) => sum + (d.totalWeight || 0), 0);

    res.json({
      success: true,
      message: `${createdDimensions.length} dimension(s) saved`,
      dimensions: createdDimensions,
      summary: {
        totalCBM: parseFloat(totalCBM.toFixed(4)),
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        dimensionCount: createdDimensions.length
      }
    });
  } catch (error: any) {
    console.error('Bulk save dimensions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update shipment's total CBM from dimensions (raw SQL)
async function updateShipmentTotalCBMRaw(shipmentId: string, companyId: string) {
  const dimensions = await prisma.$queryRaw<any[]>`
    SELECT totalCBM FROM shipment_dimensions 
    WHERE shipmentId = ${shipmentId} AND companyId = ${companyId}
  `;

  const totalCBM = dimensions.reduce((sum: number, d: any) => sum + (Number(d.totalCBM) || 0), 0);

  // Update shipment's main CBM field (used for charge calculation)
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { cbm: parseFloat(totalCBM.toFixed(4)) }
  });

  console.log(`📦 Updated shipment ${shipmentId} total CBM: ${totalCBM.toFixed(4)} m³`);
}

// ============================================
// DIMENSION RACK ASSIGNMENT ROUTES
// ============================================

// Assign a dimension to a rack
router.post('/:shipmentId/dimensions/:dimensionId/assign', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId, dimensionId } = req.params;
    const { rackId } = req.body;

    if (!rackId) {
      return res.status(400).json({ error: 'rackId is required' });
    }

    // Get the dimension
    const dimension = await prisma.$queryRaw<any[]>`
      SELECT * FROM shipment_dimensions 
      WHERE id = ${dimensionId} AND shipmentId = ${shipmentId} AND companyId = ${companyId}
    `;

    if (!dimension.length) {
      return res.status(404).json({ error: 'Dimension not found' });
    }

    const dim = dimension[0];
    if (dim.status === 'ASSIGNED') {
      return res.status(400).json({ error: 'Dimension already assigned to a rack' });
    }

    // Get the rack
    const rack = await prisma.rack.findFirst({
      where: { id: rackId, companyId }
    });

    if (!rack) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    // Update dimension
    await prisma.$executeRaw`
      UPDATE shipment_dimensions 
      SET rackId = ${rackId}, status = 'ASSIGNED', assignedAt = NOW()
      WHERE id = ${dimensionId}
    `;

    // Update rack CBM using raw SQL (cbmUsed may not be in Prisma schema yet)
    await prisma.$executeRaw`
      UPDATE racks SET cbmUsed = COALESCE(cbmUsed, 0) + ${dim.totalCBM || 0}
      WHERE id = ${rackId}
    `;

    // Get updated rack data
    const updatedRack = await prisma.$queryRaw<any[]>`
      SELECT id, code, cbmUsed, cbmCapacity FROM racks WHERE id = ${rackId}
    `;

    // Update shipment status if all dimensions assigned
    const pendingDims = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM shipment_dimensions 
      WHERE shipmentId = ${shipmentId} AND status = 'PENDING'
    `;

    if (pendingDims[0].count == 0) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: 'IN_WAREHOUSE' }
      });
    }

    res.json({
      success: true,
      message: 'Dimension assigned to rack',
      dimension: {
        id: dimensionId,
        rackId,
        status: 'ASSIGNED',
        totalCBM: dim.totalCBM
      },
      rack: {
        id: rackId,
        code: rack.code,
        cbmUsed: updatedRack[0]?.cbmUsed || 0,
        cbmCapacity: updatedRack[0]?.cbmCapacity || 0
      }
    });
  } catch (error: any) {
    console.error('Assign dimension to rack error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release a dimension from rack
router.post('/:shipmentId/dimensions/:dimensionId/release', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId, dimensionId } = req.params;

    // Get the dimension
    const dimension = await prisma.$queryRaw<any[]>`
      SELECT * FROM shipment_dimensions 
      WHERE id = ${dimensionId} AND shipmentId = ${shipmentId} AND companyId = ${companyId}
    `;

    if (!dimension.length) {
      return res.status(404).json({ error: 'Dimension not found' });
    }

    const dim = dimension[0];
    if (dim.status !== 'ASSIGNED') {
      return res.status(400).json({ error: 'Dimension is not assigned to any rack' });
    }

    const rackId = dim.rackId;

    // Update dimension
    await prisma.$executeRaw`
      UPDATE shipment_dimensions 
      SET status = 'RELEASED', releasedAt = NOW()
      WHERE id = ${dimensionId}
    `;

    // Update rack CBM using raw SQL
    if (rackId) {
      await prisma.$executeRaw`
        UPDATE racks SET cbmUsed = GREATEST(0, COALESCE(cbmUsed, 0) - ${dim.totalCBM || 0})
        WHERE id = ${rackId}
      `;
    }

    // Check if all dimensions are released
    const assignedDims = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM shipment_dimensions 
      WHERE shipmentId = ${shipmentId} AND status = 'ASSIGNED'
    `;

    if (assignedDims[0].count == 0) {
      // All dimensions released - check if any still pending
      const pendingDims = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM shipment_dimensions 
        WHERE shipmentId = ${shipmentId} AND status = 'PENDING'
      `;

      if (pendingDims[0].count == 0) {
        // All dimensions released, none pending
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: { status: 'RELEASED', releasedAt: new Date() }
        });
      }
    } else {
      // Some dimensions still assigned - mark as partial
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: 'PARTIAL' }
      });
    }

    res.json({
      success: true,
      message: 'Dimension released from rack',
      dimension: {
        id: dimensionId,
        status: 'RELEASED',
        totalCBM: dim.totalCBM
      }
    });
  } catch (error: any) {
    console.error('Release dimension error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk assign multiple dimensions to a rack
router.post('/:shipmentId/dimensions/bulk-assign', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId } = req.params;
    const { dimensionIds, rackId } = req.body;

    if (!Array.isArray(dimensionIds) || !rackId) {
      return res.status(400).json({ error: 'dimensionIds (array) and rackId are required' });
    }

    // Get the rack
    const rack = await prisma.rack.findFirst({
      where: { id: rackId, companyId }
    });

    if (!rack) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    let totalCBMAssigned = 0;

    for (const dimensionId of dimensionIds) {
      // Get the dimension
      const dimension = await prisma.$queryRaw<any[]>`
        SELECT * FROM shipment_dimensions 
        WHERE id = ${dimensionId} AND shipmentId = ${shipmentId} AND companyId = ${companyId} AND status = 'PENDING'
      `;

      if (dimension.length) {
        const dim = dimension[0];
        totalCBMAssigned += dim.totalCBM || 0;

        // Update dimension
        await prisma.$executeRaw`
          UPDATE shipment_dimensions 
          SET rackId = ${rackId}, status = 'ASSIGNED', assignedAt = NOW()
          WHERE id = ${dimensionId}
        `;
      }
    }

    // Update rack CBM using raw SQL
    await prisma.$executeRaw`
      UPDATE racks SET cbmUsed = COALESCE(cbmUsed, 0) + ${totalCBMAssigned}
      WHERE id = ${rackId}
    `;

    // Get updated rack data
    const updatedRack = await prisma.$queryRaw<any[]>`
      SELECT id, code, cbmUsed, cbmCapacity FROM racks WHERE id = ${rackId}
    `;

    // Update shipment status
    const pendingDims = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM shipment_dimensions 
      WHERE shipmentId = ${shipmentId} AND status = 'PENDING'
    `;

    if (pendingDims[0].count == 0) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: 'IN_WAREHOUSE' }
      });
    }

    res.json({
      success: true,
      message: `${dimensionIds.length} dimension(s) assigned to rack`,
      totalCBMAssigned,
      rack: {
        id: rackId,
        code: rack.code,
        cbmUsed: updatedRack[0]?.cbmUsed || 0,
        cbmCapacity: updatedRack[0]?.cbmCapacity || 0
      }
    });
  } catch (error: any) {
    console.error('Bulk assign dimensions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dimensions with rack status
router.get('/:shipmentId/dimensions/status', authorizeRoles('ADMIN', 'MANAGER', 'WORKER', 'SCANNER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId } = req.params;

    const dimensions = await prisma.$queryRaw<any[]>`
      SELECT sd.*, r.code as rackCode, r.location as rackLocation
      FROM shipment_dimensions sd
      LEFT JOIN racks r ON sd.rackId = r.id
      WHERE sd.shipmentId = ${shipmentId} AND sd.companyId = ${companyId}
      ORDER BY sd.createdAt ASC
    `;

    const summary = {
      pending: dimensions.filter(d => d.status === 'PENDING').length,
      assigned: dimensions.filter(d => d.status === 'ASSIGNED').length,
      released: dimensions.filter(d => d.status === 'RELEASED').length,
      totalCBM: dimensions.reduce((sum, d) => sum + (Number(d.totalCBM) || 0), 0),
      assignedCBM: dimensions.filter(d => d.status === 'ASSIGNED').reduce((sum, d) => sum + (Number(d.totalCBM) || 0), 0),
      releasedCBM: dimensions.filter(d => d.status === 'RELEASED').reduce((sum, d) => sum + (Number(d.totalCBM) || 0), 0)
    };

    res.json({
      dimensions,
      summary
    });
  } catch (error: any) {
    console.error('Get dimensions status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BATCH RELEASE SHIPMENTS
// ============================================
router.post('/batch/release', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    const companyId = req.user!.companyId;
    const userId = req.user!.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    // Verify all shipments belong to company and are not already released
    const shipments = await prisma.shipment.findMany({
      where: {
        id: { in: ids },
        companyId,
        status: { not: 'RELEASED' },
      },
    });

    if (shipments.length === 0) {
      return res.status(404).json({ error: 'No matching shipments found to release' });
    }

    const now = new Date();

    const result = await prisma.shipment.updateMany({
      where: {
        id: { in: shipments.map(s => s.id) },
        companyId,
      },
      data: {
        status: 'RELEASED',
        releasedAt: now,
        releasedById: userId,
      },
    });

    res.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('Batch release error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DUPLICATE SHIPMENT
// ============================================
router.post('/:id/duplicate', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const userId = req.user!.id;

    const source = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!source) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const now = new Date();
    const timestamp = Date.now();

    // Create new shipment based on source data
    const duplicate = await prisma.shipment.create({
      data: {
        name: source.name,
        referenceId: `${source.referenceId}-copy`,
        originalBoxCount: source.originalBoxCount,
        currentBoxCount: source.currentBoxCount,
        palletCount: source.palletCount,
        boxesPerPallet: source.boxesPerPallet,
        type: source.type,
        clientName: source.clientName,
        clientPhone: source.clientPhone,
        clientEmail: source.clientEmail,
        description: source.description,
        estimatedValue: source.estimatedValue,
        notes: source.notes,
        isPinned: false,
        companyId,
        companyProfileId: source.companyProfileId,
        qrCode: `SHIPMENT_${timestamp}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        arrivalDate: now,
        status: 'PENDING',
        createdById: userId,
        isWarehouseShipment: source.isWarehouseShipment,
        category: source.category,
        awbNumber: source.awbNumber,
        flightNumber: source.flightNumber,
        origin: source.origin,
        destination: source.destination,
        customerName: source.customerName,
        shipper: source.shipper,
        consignee: source.consignee,
        length: source.length,
        width: source.width,
        height: source.height,
        cbm: source.cbm,
        weight: source.weight,
      },
      include: {
        companyProfile: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // If source had boxes, duplicate them
    const sourceBoxes = await prisma.shipmentBox.findMany({
      where: { shipmentId: id },
    });

    if (sourceBoxes.length > 0) {
      const newBoxes = sourceBoxes.map((box, index) => ({
        shipmentId: duplicate.id,
        boxNumber: index + 1,
        qrCode: `${duplicate.qrCode}-BOX${String(index + 1).padStart(3, '0')}`,
        status: 'PENDING' as const,
        companyId,
      }));

      await prisma.shipmentBox.createMany({
        data: newBoxes,
      });
    }

    res.status(201).json({ shipment: duplicate });
  } catch (error) {
    console.error('Duplicate shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// UPDATE SHIPMENT NOTES
// ============================================
router.put('/:id/notes', authorizeRoles('ADMIN', 'MANAGER', 'WORKER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const companyId = req.user!.companyId;

    if (notes === undefined || notes === null) {
      return res.status(400).json({ error: 'notes field is required' });
    }

    const existing = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: { notes: String(notes) },
      include: {
        companyProfile: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ shipment: updated });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET SHIPMENT ACTIVITY
// ============================================
router.get('/:id/activity', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Last 5 moves from rack activity
    const recentMoves = await prisma.rackActivity.findMany({
      where: {
        companyId,
        activityType: 'MOVE',
        itemDetails: { contains: id },
      },
      include: {
        rack: { select: { id: true, code: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    // Last photo upload time - check shipment boxes for photos
    const boxesWithPhotos = await prisma.shipmentBox.findMany({
      where: {
        shipmentId: id,
        photos: { not: null },
      },
      select: { photos: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });

    let lastPhotoTime: string | null = null;
    if (boxesWithPhotos.length > 0) {
      lastPhotoTime = boxesWithPhotos[0].updatedAt.toISOString();
    }

    // Status changes - check rack activities related to this shipment
    const statusActivities = await prisma.rackActivity.findMany({
      where: {
        companyId,
        itemDetails: { contains: id },
        activityType: { in: ['ASSIGN', 'RELEASE'] },
      },
      include: {
        rack: { select: { id: true, code: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Build activity timeline
    const activity: any[] = [];

    // Add move activities
    for (const move of recentMoves) {
      let details: any = {};
      try { details = JSON.parse(move.itemDetails || '{}'); } catch (e) {}
      activity.push({
        type: 'move',
        timestamp: move.timestamp,
        user: move.user?.name || 'System',
        description: details.description || `Moved on rack ${move.rack?.code || 'unknown'}`,
        details: {
          direction: details.direction,
          fromRack: details.fromRack,
          toRack: details.toRack,
          boxCount: details.boxCount,
          reason: details.reason,
        },
      });
    }

    // Add status change activities
    for (const sa of statusActivities) {
      activity.push({
        type: 'status_change',
        timestamp: sa.timestamp,
        user: sa.user?.name || 'System',
        description: `${sa.activityType === 'ASSIGN' ? 'Assigned to' : 'Released from'} rack ${sa.rack?.code || 'unknown'}`,
        details: {
          activityType: sa.activityType,
          rackCode: sa.rack?.code,
          notes: sa.notes,
        },
      });
    }

    // Sort by timestamp descending
    activity.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      activity: activity.slice(0, 20), // Limit to most recent 20 entries
      summary: {
        lastPhotoTime,
        totalMoves: recentMoves.length,
        totalStatusChanges: statusActivities.length,
      },
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TOGGLE PIN SHIPMENT
// ============================================
router.put('/:id/pin', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const existing = await prisma.shipment.findFirst({
      where: { id, companyId },
      select: { id: true, isPinned: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const newPinnedState = !existing.isPinned;

    await prisma.shipment.update({
      where: { id },
      data: { isPinned: newPinnedState },
    });

    res.json({
      success: true,
      isPinned: newPinnedState,
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

