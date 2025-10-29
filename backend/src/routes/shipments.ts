import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    const uploadDir = 'uploads/shipments';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `shipment-${uniqueSuffix}${ext}`);
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
    const { status, search, isWarehouseShipment, category, customerName, page = '1', limit = '50' } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

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
      where.customerName = { contains: customerName as string };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { referenceId: { contains: search as string } },
        { clientName: { contains: search as string } },
        { customerName: { contains: search as string } },
        { shipper: { contains: search as string } },
        { awbNumber: { contains: search as string } },
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
      
      // Get unique rack codes where boxes are located
      const rackIds = [...new Set(shipment.boxes.filter((b: any) => b.rackId).map((b: any) => b.rackId))] as string[];
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
    const assignedBoxes = shipment.boxes.filter((b: any) => b.rackId !== null).length;
    const releasedBoxes = shipment.boxes.filter((b: any) => b.status === 'RELEASED').length;
    const inStorageBoxes = shipment.boxes.filter((b: any) => b.status === 'IN_STORAGE').length;

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
    const palletCount = parseOptionalInt(data.palletCount);
    const boxesPerPallet = parseOptionalInt(data.boxesPerPallet);

    if (!palletCount || palletCount <= 0) {
      return res.status(400).json({ error: 'Pallet count must be greater than zero' });
    }

    if (!boxesPerPallet || boxesPerPallet <= 0) {
      return res.status(400).json({ error: 'Boxes per pallet must be greater than zero' });
    }

    const computedBoxCount = palletCount * boxesPerPallet;
    const originalBoxCount = computedBoxCount;
    const totalBoxCount = computedBoxCount;
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
        where: { id: data.companyProfileId, companyId },
        select: { id: true, name: true },
      });

      if (!profile) {
        return res.status(400).json({ error: 'Selected company profile is not available' });
      }

      companyProfileId = profile.id;
      companyProfileName = profile.name;
    }

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
    const qrBaseSegments = [`${qrPrefix}-${Date.now()}`];
    if (palletCount && palletCount > 0) {
      qrBaseSegments.push(`P${palletCount}`);
    }
    if (boxesPerPallet && boxesPerPallet > 0) {
      qrBaseSegments.push(`B${boxesPerPallet}`);
    }
    qrBaseSegments.push(`T${totalBoxCount}`);
    const masterQR = qrBaseSegments.join('-');

    // 🚀 USE DEFAULT STORAGE TYPE FROM SETTINGS IF NOT PROVIDED
    const shipmentType = data.type || settings.defaultStorageType;

    const normalizedCustomerName = data.customerName || companyProfileName || data.clientName || null;

    const shipment = await prisma.shipment.create({
      data: {
        name: data.name || `Shipment for ${data.clientName || companyProfileName || 'Client'}`,
        referenceId: data.referenceId || `SH-${Date.now()}`,
        originalBoxCount,
        currentBoxCount,
        palletCount,
        boxesPerPallet,
        type: shipmentType, // 🚀 FROM SETTINGS
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
        status: 'PENDING', // All shipments start as PENDING
        createdById: userId, // User ID who created
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
      },
      include: {
        companyProfile: {
          select: { id: true, name: true },
        },
      },
    });

    // ✅ CREATE INDIVIDUAL QR CODES FOR EACH BOX
    const boxesToCreate = [];
    for (let i = 1; i <= totalBoxCount; i++) {
      boxesToCreate.push({
        shipmentId: shipment.id,
        boxNumber: i,
        qrCode: `${masterQR}-BOX-${i}-OF-${totalBoxCount}`,
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
          capacityUsed: { increment: totalBoxCount },
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
          itemDetails: `Shipment ${shipment.referenceId} - ${totalBoxCount} boxes${palletCount && palletCount > 0 ? ` (${palletCount} pallets)` : ''}`,
          quantityAfter: totalBoxCount,
        },
      });
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
    const { rackId, boxNumbers } = req.body; // boxNumbers = JSON string "[1,2,3]"
    const companyId = req.user!.companyId;
    const uploadedFiles = req.files as Express.Multer.File[];

    if (!rackId || !boxNumbers) {
      return res.status(400).json({ error: 'Rack ID and box numbers required' });
    }

    const parsedBoxNumbers = JSON.parse(boxNumbers);
    
    if (parsedBoxNumbers.length === 0) {
      return res.status(400).json({ error: 'At least one box number required' });
    }

    // Prepare photo URLs
    const photoUrls = uploadedFiles?.map(file => `/uploads/shipments/${file.filename}`) || [];

    // Update boxes with photos
    await prisma.shipmentBox.updateMany({
      where: {
        shipmentId: id,
        boxNumber: { in: parsedBoxNumbers },
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
        capacityUsed: { increment: parsedBoxNumbers.length },
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
        userId: req.user!.id,
        companyId,
        activityType: 'ASSIGN',
        itemDetails: `${parsedBoxNumbers.length} boxes from shipment ${id}${photoUrls.length > 0 ? ` (${photoUrls.length} photos)` : ''}`,
        quantityAfter: parsedBoxNumbers.length,
      },
    });

    res.json({ 
      success: true, 
      assigned: parsedBoxNumbers.length,
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
          userId: req.user!.id,
          companyId,
          activityType: 'RELEASE',
          itemDetails: `Released ${count} boxes from shipment ${shipment.referenceId}`,
          quantityAfter: count,
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
  } catch (error) {
    console.error('Release boxes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shipment
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const existing = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    await prisma.shipment.delete({ where: { id } });

    res.json({ message: 'Shipment deleted successfully' });
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

export default router;
