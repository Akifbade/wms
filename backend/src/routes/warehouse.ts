import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { 
  generateWarehouseBarcode, 
  generatePieceQR, 
  parsePieceQR, 
  parseRackQR,
  calculateWarehouseCharges,
  createWarehouseData,
  parseWarehouseData
} from '../utils/warehouseUtils';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/warehouse/intake - Get intake form data (rack list, settings)
router.get('/intake', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    
    // Get available racks
    const racks = await prisma.rack.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true, code: true, qrCode: true, capacityTotal: true, capacityUsed: true }
    });
    
    // Get billing settings for pricing info
    const billingSettings = await prisma.billingSettings.findUnique({
      where: { companyId }
    });
    
    res.json({ 
      racks,
      billingSettings: billingSettings ? {
        storageRatePerBox: billingSettings.storageRatePerBox,
        gracePeriodDays: billingSettings.gracePeriodDays,
        minimumCharge: billingSettings.minimumCharge,
        currency: billingSettings.currency
      } : null
    });
  } catch (error) {
    console.error('Error fetching intake data:', error);
    res.status(500).json({ error: 'Failed to fetch intake data' });
  }
});

// POST /api/warehouse/intake - Create new warehouse shipment
router.post('/intake', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { shipper, consignee, weight, pieces, notes, rackId } = req.body;
    
    // Validation
    if (!shipper || !consignee || !weight || !pieces) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate warehouse barcode
    const barcode = generateWarehouseBarcode();
    
    // Create warehouse data
    const warehouseData = createWarehouseData({
      shipper,
      consignee, 
      weight,
      pieces,
      notes
    });
    
    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        name: `Warehouse Storage - ${shipper}`,
        referenceId: barcode,
        originalBoxCount: pieces,
        currentBoxCount: pieces,
        type: 'WAREHOUSE',
        arrivalDate: new Date(),
        clientName: shipper,
        clientPhone: consignee, // Using consignee as contact
        description: `Storage for ${pieces} pieces from ${shipper} to ${consignee}`,
        notes,
        qrCode: `WH_${barcode}`,
        status: 'ACTIVE',
        companyId,
        createdById: req.user!.id,
        // Warehouse-specific fields
        isWarehouseShipment: true,
        warehouseData,
        shipper,
        consignee
      }
    });
    
    // Create individual boxes with QR codes
    const boxes = [];
    for (let i = 1; i <= pieces; i++) {
      const pieceQR = generatePieceQR(barcode, i);
      const box = await prisma.shipmentBox.create({
        data: {
          shipmentId: shipment.id,
          boxNumber: i,
          qrCode: pieceQR,
          rackId,
          status: 'IN_STORAGE',
          assignedAt: new Date(),
          companyId,
          pieceQR
        }
      });
      boxes.push(box);
    }
    
    // Update rack capacity if assigned
    if (rackId) {
      await prisma.rack.update({
        where: { id: rackId },
        data: { 
          capacityUsed: { increment: pieces },
          lastActivity: new Date()
        }
      });
    }
    
    res.json({ 
      shipment: {
        ...shipment,
        warehouseData: parseWarehouseData(shipment.warehouseData)
      }, 
      boxes 
    });
    
  } catch (error) {
    console.error('Error creating warehouse shipment:', error);
    res.status(500).json({ error: 'Failed to create warehouse shipment' });
  }
});

// GET /api/warehouse/shipments - Get warehouse shipments for release
router.get('/shipments', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { search, status = 'ACTIVE' } = req.query;
    
    const whereClause: any = {
      companyId,
      isWarehouseShipment: true
    };
    
    if (status !== 'all') {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.OR = [
        { referenceId: { contains: search as string } },
        { shipper: { contains: search as string } },
        { consignee: { contains: search as string } },
        { clientName: { contains: search as string } }
      ];
    }
    
    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      include: {
        boxes: { 
          select: { 
            id: true, 
            boxNumber: true, 
            qrCode: true, 
            status: true,
            pieceQR: true,
            rack: { select: { code: true, qrCode: true } }
          } 
        },
        invoices: {
          select: { id: true, invoiceNumber: true, totalAmount: true, paymentStatus: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse warehouse data for each shipment
    const parsedShipments = shipments.map(shipment => ({
      ...shipment,
      warehouseData: parseWarehouseData(shipment.warehouseData)
    }));
    
    res.json(parsedShipments);
  } catch (error) {
    console.error('Error fetching warehouse shipments:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse shipments' });
  }
});

// POST /api/warehouse/release/:shipmentId - Release shipment and generate invoice
router.post('/release/:shipmentId', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { shipmentId } = req.params;
    
    // Get shipment with related data
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId, isWarehouseShipment: true },
      include: { boxes: { include: { rack: true } } }
    });
    
    if (!shipment) {
      return res.status(404).json({ error: 'Warehouse shipment not found' });
    }
    
    if (shipment.status === 'RELEASED') {
      return res.status(400).json({ error: 'Shipment already released' });
    }
    
    // Get billing settings
    const billingSettings = await prisma.billingSettings.findUnique({
      where: { companyId }
    });
    
    // Calculate storage charges
    const charges = calculateWarehouseCharges(
      shipment.createdAt,
      new Date(),
      1, // Using per-box charging, not weight-based
      {
        storageRatePerBox: billingSettings?.storageRatePerBox || 0.5,
        handlingFee: billingSettings?.minimumCharge || 10.0,
        gracePeriodDays: billingSettings?.gracePeriodDays || 3
      }
    );
    
    // Create invoice
    const invoiceNumber = `WH${Date.now()}`;
    const warehouseInvoiceData = JSON.stringify({
      ...charges,
      barcode: shipment.referenceId,
      inDate: shipment.createdAt,
      outDate: new Date(),
      pieces: shipment.originalBoxCount,
      rack: shipment.boxes[0]?.rack?.code || 'N/A'
    });
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId,
        shipmentId: shipment.id,
        clientName: shipment.shipper || shipment.clientName || 'N/A',
        clientPhone: shipment.consignee || shipment.clientPhone,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + (billingSettings?.invoiceDueDays || 10) * 24 * 60 * 60 * 1000),
        invoiceType: 'STORAGE',
        subtotal: charges.storageCharges,
        taxAmount: billingSettings?.taxEnabled ? (charges.totalCharges * (billingSettings.taxRate / 100)) : 0,
        totalAmount: charges.totalCharges,
        balanceDue: charges.totalCharges,
        // Warehouse-specific fields
        isWarehouseInvoice: true,
        warehouseData: warehouseInvoiceData
      }
    });
    
    // Create invoice line items
    if (charges.storageCharges > 0) {
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          companyId,
          description: `Storage charges - ${charges.storageDays} days (${charges.chargeableDays} chargeable)`,
          category: 'STORAGE',
          quantity: charges.chargeableDays,
          unitPrice: billingSettings?.storageRatePerBox || 0.5,
          amount: charges.storageCharges
        }
      });
    }
    
    if (charges.handlingCharges > 0) {
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          companyId,
          description: 'Handling charges',
          category: 'SERVICE',
          quantity: 1,
          unitPrice: charges.handlingCharges,
          amount: charges.handlingCharges
        }
      });
    }
    
    // Update shipment status
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { 
        status: 'RELEASED',
        releasedAt: new Date(),
        storageCharge: charges.totalCharges,
        releasedById: req.user!.id
      }
    });
    
    // Update all boxes status
    await prisma.shipmentBox.updateMany({
      where: { shipmentId },
      data: { 
        status: 'RELEASED',
        releasedAt: new Date()
      }
    });
    
    res.json({ 
      invoice: {
        ...invoice,
        warehouseData: parseWarehouseData(invoice.warehouseData)
      },
      charges 
    });
    
  } catch (error) {
    console.error('Error releasing warehouse shipment:', error);
    res.status(500).json({ error: 'Failed to release warehouse shipment' });
  }
});

// POST /api/warehouse/qr-scan - Handle QR code scanning
router.post('/qr-scan', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { qrCode } = req.body;
    
    if (!qrCode) {
      return res.status(400).json({ error: 'QR code is required' });
    }
    
    let result: any = { type: 'unknown', data: null };
    
    // Check if it's a piece QR code
    const pieceData = parsePieceQR(qrCode);
    if (pieceData) {
      const shipment = await prisma.shipment.findFirst({
        where: { 
          referenceId: pieceData.barcode, 
          companyId,
          isWarehouseShipment: true
        },
        include: {
          boxes: { 
            where: { boxNumber: pieceData.pieceNumber },
            include: { rack: { select: { code: true, qrCode: true } } }
          }
        }
      });
      
      if (shipment) {
        result = {
          type: 'piece',
          data: {
            shipment: {
              ...shipment,
              warehouseData: parseWarehouseData(shipment.warehouseData)
            },
            pieceNumber: pieceData.pieceNumber,
            box: shipment.boxes[0] || null
          }
        };
      }
    }
    
    // Check if it's a rack QR code
    const rackCode = parseRackQR(qrCode);
    if (rackCode) {
      const rack = await prisma.rack.findFirst({
        where: { code: rackCode, companyId },
        include: {
          boxes: {
            include: {
              shipment: {
                select: {
                  id: true,
                  referenceId: true,
                  shipper: true,
                  consignee: true,
                  status: true,
                  isWarehouseShipment: true
                }
              }
            }
          }
        }
      });
      
      if (rack) {
        result = {
          type: 'rack',
          data: rack
        };
      }
    }
    
    // Check if it's a shipment master QR
    if (qrCode.startsWith('WH_')) {
      const barcode = qrCode.replace('WH_', '');
      const shipment = await prisma.shipment.findFirst({
        where: { 
          referenceId: barcode, 
          companyId,
          isWarehouseShipment: true
        },
        include: {
          boxes: { include: { rack: { select: { code: true, qrCode: true } } } }
        }
      });
      
      if (shipment) {
        result = {
          type: 'shipment',
          data: {
            ...shipment,
            warehouseData: parseWarehouseData(shipment.warehouseData)
          }
        };
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error processing QR scan:', error);
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
});

// GET /api/warehouse/dashboard - Get warehouse dashboard stats
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    
    // Get warehouse shipments count
    const totalShipments = await prisma.shipment.count({
      where: { companyId, isWarehouseShipment: true }
    });
    
    const activeShipments = await prisma.shipment.count({
      where: { companyId, isWarehouseShipment: true, status: 'ACTIVE' }
    });
    
    const releasedShipments = await prisma.shipment.count({
      where: { companyId, isWarehouseShipment: true, status: 'RELEASED' }
    });
    
    // Get warehouse revenue
    const warehouseInvoices = await prisma.invoice.findMany({
      where: { companyId, isWarehouseInvoice: true },
      select: { totalAmount: true, paymentStatus: true }
    });
    
    const totalRevenue = warehouseInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidRevenue = warehouseInvoices
      .filter(inv => inv.paymentStatus === 'PAID')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    
    // Get occupied racks
    const occupiedRacks = await prisma.rack.count({
      where: { 
        companyId, 
        capacityUsed: { gt: 0 }
      }
    });
    
    const totalRacks = await prisma.rack.count({
      where: { companyId }
    });
    
    res.json({
      shipments: {
        total: totalShipments,
        active: activeShipments,
        released: releasedShipments
      },
      revenue: {
        total: totalRevenue,
        paid: paidRevenue,
        outstanding: totalRevenue - paidRevenue
      },
      racks: {
        total: totalRacks,
        occupied: occupiedRacks,
        available: totalRacks - occupiedRacks
      }
    });
    
  } catch (error) {
    console.error('Error fetching warehouse dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse dashboard' });
  }
});

export default router;