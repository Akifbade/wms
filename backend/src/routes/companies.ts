import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const parseBoolean = (value: any, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return fallback;
};

// Configure multer for company logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/company-logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'company-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all company profiles for current company
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get all company profiles for this company
    const profiles = await prisma.companyProfile.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    const payload = profiles.map((profile) => ({
      ...profile,
      logoUrl: profile.logo && baseUrl ? `${baseUrl}${profile.logo}` : null,
    }));

    res.json(payload);
  } catch (error: any) {
    console.error('Error fetching company profiles:', error);
    res.status(500).json({ error: 'Failed to fetch company profiles' });
  }
});

// Get analytics for ALL companies - for the Analytics page
// IMPORTANT: This route must be BEFORE /:profileId to avoid matching 'all-analytics' as a profileId
router.get('/all-analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    // Get all company profiles
    const profiles = await prisma.companyProfile.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });

    // Get all shipments with their details
    const allShipments = await prisma.shipment.findMany({
      where: { companyId },
      include: {
        boxes: {
          include: {
            rack: true
          }
        },
        companyProfile: true,
        invoices: {
          include: {
            payments: true
          }
        }
      }
    });

    // Get all racks with their boxes
    const allRacks = await prisma.rack.findMany({
      where: { companyId },
      include: {
        boxes: {
          include: {
            shipment: {
              include: {
                companyProfile: true
              }
            }
          }
        }
      }
    });

    // Calculate per-company statistics
    const companyStats = profiles.map(profile => {
      const shipments = allShipments.filter(s => s.companyProfileId === profile.id);
      const activeShipments = shipments.filter(s => 
        s.status === 'IN_WAREHOUSE' || s.status === 'ACTIVE' || s.status === 'PARTIAL'
      );
      
      // Calculate boxes
      const totalBoxes = shipments.reduce((sum, s) => sum + (s.originalBoxCount || 0), 0);
      const currentBoxes = shipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0);
      
      // Calculate pallets from shipment's palletCount field
      const totalPallets = shipments.reduce((sum, s) => sum + ((s as any).palletCount || 0), 0);
      const currentPallets = activeShipments.reduce((sum, s) => sum + ((s as any).palletCount || 0), 0);
      
      // Get rack locations from boxes
      const allBoxes = shipments.flatMap(s => s.boxes || []);
      const rackLocations = [...new Set(
        allBoxes
          .filter(b => b.rack && b.rack.code)
          .map(b => b.rack!.code)
      )];
      
      // Calculate invoice totals
      const invoices = shipments.flatMap(s => s.invoices || []);
      const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
      const paidAmount = invoices.reduce((sum, inv) => {
        const payments = inv.payments || [];
        return sum + payments.reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      }, 0);
      
      return {
        id: profile.id,
        name: profile.name,
        logoUrl: profile.logo && baseUrl ? `${baseUrl}${profile.logo}` : null,
        contactPerson: profile.contactPerson,
        totalShipments: shipments.length,
        activeShipments: activeShipments.length,
        releasedShipments: shipments.filter(s => s.status === 'RELEASED').length,
        totalBoxes,
        currentBoxes,
        totalPallets,
        currentPallets,
        rackLocations,
        totalInvoiceAmount,
        outstandingBalance: totalInvoiceAmount - paidAmount
      };
    });

    // Calculate overall statistics
    const overall = {
      totalCompanies: profiles.length,
      totalShipments: allShipments.length,
      activeShipments: allShipments.filter(s => 
        s.status === 'IN_WAREHOUSE' || s.status === 'ACTIVE' || s.status === 'PARTIAL'
      ).length,
      totalBoxes: allShipments.reduce((sum, s) => sum + (s.originalBoxCount || 0), 0),
      currentBoxes: allShipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0),
      totalPallets: companyStats.reduce((sum, c) => sum + c.totalPallets, 0),
      currentPallets: companyStats.reduce((sum, c) => sum + c.currentPallets, 0),
      totalRevenue: companyStats.reduce((sum, c) => sum + c.totalInvoiceAmount, 0),
      outstandingBalance: companyStats.reduce((sum, c) => sum + c.outstandingBalance, 0)
    };

    // Calculate rack locations with shipments
    const rackLocations = allRacks
      .filter(rack => rack.boxes && rack.boxes.length > 0)
      .map(rack => {
        const boxes = rack.boxes || [];
        const shipmentMap = new Map();
        
        boxes.forEach(box => {
          if (box.shipment) {
            const key = box.shipment.id;
            if (!shipmentMap.has(key)) {
              shipmentMap.set(key, {
                referenceId: box.shipment.referenceId,
                clientName: box.shipment.clientName,
                companyName: box.shipment.companyProfile?.name || 'Unknown',
                boxes: 0,
                pallets: (box.shipment as any).palletCount || 0
              });
            }
            const entry = shipmentMap.get(key);
            entry.boxes += 1;
          }
        });

        const shipments = Array.from(shipmentMap.values());
        
        // Sum up pallets from all shipments in this rack
        const totalPallets = shipments.reduce((sum: number, s: any) => sum + (s.pallets || 0), 0);

        return {
          rackCode: rack.code,
          zone: rack.zone || 'Default',
          shipmentCount: shipments.length,
          boxCount: boxes.length,
          palletCount: totalPallets,
          shipments
        };
      })
      .filter(r => r.shipmentCount > 0)
      .sort((a, b) => b.shipmentCount - a.shipmentCount);

    res.json({
      companies: companyStats,
      overall,
      rackLocations
    });
  } catch (error: any) {
    console.error('Error fetching all company analytics:', error);
    res.status(500).json({ error: 'Failed to fetch company analytics' });
  }
});

// Get single company profile
router.get('/:profileId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const profile = await prisma.companyProfile.findFirst({
      where: {
        id: profileId,
        companyId
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    res.json({
      ...profile,
      logoUrl: profile.logo && baseUrl ? `${baseUrl}${profile.logo}` : null,
    });
  } catch (error: any) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

// Get comprehensive company profile analytics
router.get('/:profileId/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get company profile
    let profile = await prisma.companyProfile.findFirst({
      where: { id: profileId, companyId }
    });

    let placeholderProfile: any = null;

    if (!profile) {
      const firstShipment = await prisma.shipment.findFirst({
        where: {
          companyId,
          companyProfileId: profileId
        }
      });

      if (!firstShipment) {
        return res.status(404).json({ error: 'Company profile not found' });
      }

      placeholderProfile = {
        id: profileId,
        name: firstShipment.customerName || firstShipment.clientName || 'Company',
        description: '',
        logo: null,
        contactPerson: '',
        contactPhone: firstShipment.clientPhone || '',
        contractStatus: 'ACTIVE',
        isActive: true,
        companyId,
        createdAt: firstShipment.createdAt,
        updatedAt: firstShipment.updatedAt
      };

      profile = placeholderProfile;
    }

    // Get all shipments for this company profile
    const allShipments = await prisma.shipment.findMany({
      where: {
        companyId,
        companyProfileId: profileId
      },
      include: {
        boxes: true,
        withdrawals: true,
        invoices: {
          include: {
            payments: true
          }
        }
      }
    });

    // Get all invoices for this company profile
    const allInvoices = await prisma.invoice.findMany({
      where: {
        shipment: {
          companyProfileId: profileId
        }
      },
      include: {
        payments: true,
        lineItems: true
      }
    });

    // Calculate shipment statistics
    const totalShipments = allShipments.length;
    const activeShipments = allShipments.filter(s =>
      s.status === 'IN_WAREHOUSE' || s.status === 'ACTIVE' || s.status === 'PARTIAL'
    ).length;
    const releasedShipments = allShipments.filter(s => s.status === 'RELEASED').length;
    const pendingShipments = allShipments.filter(s => s.status === 'PENDING').length;

    // Calculate box statistics
    const totalBoxes = allShipments.reduce((sum, s) => sum + (s.originalBoxCount || 0), 0);
    const currentBoxes = allShipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0);

    // Calculate storage duration
    const storageDays = allShipments
      .filter(s => s.arrivalDate)
      .map(s => {
        const arrival = new Date(s.arrivalDate!);
        const end = s.releasedAt ? new Date(s.releasedAt) : new Date();
        return Math.floor((end.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
      });
    const avgStorageDays = storageDays.length > 0
      ? Math.round(storageDays.reduce((a, b) => a + b, 0) / storageDays.length)
      : 0;

    // Calculate invoice statistics
    const totalInvoices = allInvoices.length;
    const totalInvoiceAmount = allInvoices.reduce((sum, inv) =>
      sum + (inv.totalAmount ?? 0), 0
    );

    const paidInvoices = allInvoices.filter(inv => inv.paymentStatus === 'PAID').length;
    const partialInvoices = allInvoices.filter(inv => inv.paymentStatus === 'PARTIAL').length;
    const pendingInvoices = allInvoices.filter(inv => inv.paymentStatus === 'PENDING').length;
    const overdueInvoices = allInvoices.filter(inv => inv.paymentStatus === 'OVERDUE').length;

    // Calculate payment statistics
    const totalPaidAmount = allInvoices.reduce((sum, inv) =>
      sum + (inv.paidAmount ?? 0), 0
    );
    const outstandingBalance = totalInvoiceAmount - totalPaidAmount;

    // Get all payments
    const allPayments = allInvoices.flatMap(inv => inv.payments || []);
    const totalPayments = allPayments.length;

    // Payment method breakdown
    const paymentMethods = allPayments.reduce((acc: any, payment) => {
      const method = payment.paymentMethod || 'UNKNOWN';
      acc[method] = (acc[method] || 0) + (payment.amount ?? 0);
      return acc;
    }, {});

    // Recent activity (last 10 activities)
    const recentShipments = allShipments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentInvoices = allInvoices
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentPayments = allPayments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const monthInvoices = allInvoices.filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        return invDate.getFullYear() === year && invDate.getMonth() + 1 === month;
      });

      monthlyRevenue.push({
        month: `${year}-${month.toString().padStart(2, '0')}`,
        revenue: monthInvoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0),
        invoiceCount: monthInvoices.length
      });
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    res.json({
      profile: {
        ...profile,
        logoUrl: profile.logo && baseUrl ? `${baseUrl}${profile.logo}` : null,
        isPlaceholder: Boolean(placeholderProfile),
        placeholderMessage: placeholderProfile
          ? 'Company profile record is missing in the database; analytics is built from shipment history.'
          : undefined
      },
      stats: {
        // Shipment stats
        totalShipments,
        activeShipments,
        releasedShipments,
        pendingShipments,

        // Box stats
        totalBoxes,
        currentBoxes,
        avgStorageDays,

        // Invoice stats
        totalInvoices,
        totalInvoiceAmount: parseFloat(totalInvoiceAmount.toFixed(3)),
        paidInvoices,
        partialInvoices,
        pendingInvoices,
        overdueInvoices,

        // Payment stats
        totalPaidAmount: parseFloat(totalPaidAmount.toFixed(3)),
        outstandingBalance: parseFloat(outstandingBalance.toFixed(3)),
        totalPayments,
        avgInvoiceAmount: totalInvoices > 0 ? parseFloat((totalInvoiceAmount / totalInvoices).toFixed(3)) : 0
      },
      paymentMethods,
      monthlyRevenue,
      recentActivity: {
        shipments: recentShipments.map(s => ({
          id: s.id,
          referenceId: s.referenceId,
          clientName: s.clientName,
          status: s.status,
          createdAt: s.createdAt
        })),
        invoices: recentInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          paymentStatus: inv.paymentStatus,
          createdAt: inv.createdAt
        })),
        payments: recentPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          createdAt: p.createdAt
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching company analytics:', error);
    res.status(500).json({ error: 'Failed to fetch company analytics' });
  }
});

// Get single company profile (original endpoint kept for compatibility)
router.get('/:profileId/details', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const profile = await prisma.companyProfile.findFirst({
      where: {
        id: profileId,
        companyId
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    res.json({
      ...profile,
      logoUrl: profile.logo && baseUrl ? `${baseUrl}${profile.logo}` : null,
    });
  } catch (error: any) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

// Create new company profile
router.post('/', authenticateToken, upload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, contactPerson, contactPhone, contractStatus, isActive } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check for duplicate name within company
    const existing = await prisma.companyProfile.findFirst({
      where: {
        name: name,
        companyId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Company profile with this name already exists' });
    }

    const logoPath = req.file ? `/uploads/company-logos/${req.file.filename}` : null;

    const activeFlag = parseBoolean(isActive, true);

    const profile = await prisma.companyProfile.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        contactPerson: contactPerson?.trim() || '',
        contactPhone: contactPhone?.trim() || '',
        logo: logoPath,
        contractStatus: contractStatus || 'ACTIVE',
        isActive: activeFlag,
        companyId
      }
    });

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    res.status(201).json({
      ...profile,
      logoUrl: profile.logo && baseUrl ? `${baseUrl}${profile.logo}` : null,
    });
  } catch (error: any) {
    console.error('Error creating company profile:', error);
    res.status(500).json({ error: 'Failed to create company profile' });
  }
});

// Update company profile
router.put('/:profileId', authenticateToken, upload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { name, description, contactPerson, contactPhone, contractStatus, isActive } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check profile exists
    const profile = await prisma.companyProfile.findFirst({
      where: {
        id: profileId,
        companyId
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    // Check for duplicate name (excluding current profile)
    if (name && name !== profile.name) {
      const existing = await prisma.companyProfile.findFirst({
        where: {
          name: name,
          companyId,
          NOT: { id: profileId }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Company profile with this name already exists' });
      }
    }

    // Delete old logo if new one uploaded
    let logoPath = profile.logo;
    if (req.file) {
      if (profile.logo) {
        const oldPath = path.join(__dirname, `../../uploads/${profile.logo.split('/uploads/')[1]}`);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      logoPath = `/uploads/company-logos/${req.file.filename}`;
    }

    const updated = await prisma.companyProfile.update({
      where: { id: profileId },
      data: {
        name: name?.trim() || profile.name,
        description: description?.trim(),
        contactPerson: contactPerson?.trim(),
        contactPhone: contactPhone?.trim(),
        logo: logoPath,
        contractStatus: contractStatus || profile.contractStatus,
        isActive: isActive !== undefined ? parseBoolean(isActive, profile.isActive) : profile.isActive
      }
    });

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : null;

    res.json({
      ...updated,
      logoUrl: updated.logo && baseUrl ? `${baseUrl}${updated.logo}` : null,
    });
  } catch (error: any) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ error: 'Failed to update company profile' });
  }
});

// Delete company profile
router.delete('/:profileId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const profile = await prisma.companyProfile.findFirst({
      where: {
        id: profileId,
        companyId
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    // Check if used in any racks
    const racksCount = await prisma.rack.count({
      where: { companyProfileId: profileId }
    });

    if (racksCount > 0) {
      return res.status(400).json({ error: `Cannot delete: Used in ${racksCount} racks` });
    }

    // Delete logo file
    if (profile.logo) {
      const filePath = path.join(__dirname, `../../uploads/${profile.logo.split('/uploads/')[1]}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.companyProfile.delete({
      where: { id: profileId }
    });

    res.json({ message: 'Company profile deleted' });
  } catch (error: any) {
    console.error('Error deleting company profile:', error);
    res.status(500).json({ error: 'Failed to delete company profile' });
  }
});

export default router;
