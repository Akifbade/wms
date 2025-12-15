import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';

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
      // 🔧 FIX: Match shipments by BOTH companyProfileId AND customerName/clientName
      // Many older shipments have companyProfileId = NULL but correct customerName
      const profileNameLower = profile.name.toLowerCase();
      const shipments = allShipments.filter(s =>
        s.companyProfileId === profile.id ||
        (s.companyProfileId === null && (
          (s.customerName && s.customerName.toLowerCase() === profileNameLower) ||
          (s.clientName && s.clientName.toLowerCase() === profileNameLower)
        ))
      );
      const activeShipments = shipments.filter(s =>
        s.status === 'IN_WAREHOUSE' || s.status === 'ACTIVE' || s.status === 'PARTIAL' || s.status === 'IN_STORAGE'
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

    // Get CBM rate from profile - UNIFIED BILLING
    const billingType = (profile as any).billingType || 'PER_CBM';
    const cbmRatePerDay = (profile as any).cbmRatePerDay || 0.5;
    const monthlyContractAmount = (profile as any).monthlyContractAmount || 0;
    const freeStorageDays = (profile as any).freeStorageDays || 0;
    const minimumCharge = (profile as any).minimumCharge || 0;
    const advanceBalance = (profile as any).advanceBalance || 0;

    // Calculate shipment statistics
    const totalShipments = allShipments.length;
    const activeShipmentsArr = allShipments.filter(s =>
      s.status === 'IN_WAREHOUSE' || s.status === 'ACTIVE' || s.status === 'PARTIAL' || s.status === 'IN_STORAGE'
    );
    const activeShipments = activeShipmentsArr.length;
    const releasedShipments = allShipments.filter(s => s.status === 'RELEASED').length;
    const pendingShipments = allShipments.filter(s => s.status === 'PENDING').length;

    // Calculate box statistics
    const totalBoxes = allShipments.reduce((sum, s) => sum + (s.originalBoxCount || 0), 0);
    const currentBoxes = allShipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0);

    // Calculate total CBM for active shipments
    const totalCBM = activeShipmentsArr.reduce((sum, s) => sum + (Number((s as any).cbm) || 0), 0);

    // Calculate charges for each shipment - BASED ON BILLING TYPE
    const shipmentCharges = activeShipmentsArr.map(s => {
      const cbm = Number((s as any).cbm) || 0;
      const arrival = s.arrivalDate ? new Date(s.arrivalDate) : new Date(s.createdAt);
      const daysStored = Math.max(0, Math.floor((Date.now() - arrival.getTime()) / (1000 * 60 * 60 * 24)));
      const chargeableDays = Math.max(0, daysStored - freeStorageDays);
      
      let currentCharge = 0;
      let charge30Days = 0;
      
      if (billingType === 'FIXED_MONTHLY') {
        // Fixed monthly - divide among active shipments
        const shipmentShare = monthlyContractAmount / (activeShipmentsArr.length || 1);
        currentCharge = (chargeableDays / 30) * shipmentShare;
        charge30Days = shipmentShare;
      } else if (billingType === 'PER_BOX') {
        // Per box charging
        const boxCount = s.currentBoxCount || 1;
        currentCharge = Math.max(minimumCharge, boxCount * cbmRatePerDay * chargeableDays);
        charge30Days = Math.max(minimumCharge, boxCount * cbmRatePerDay * 30);
      } else {
        // Default: PER_CBM
        currentCharge = Math.max(minimumCharge, cbm * cbmRatePerDay * chargeableDays);
        charge30Days = Math.max(minimumCharge, cbm * cbmRatePerDay * 30);
      }
      
      return {
        id: s.id,
        referenceId: s.referenceId,
        clientName: s.clientName,
        status: s.status,
        cbm: cbm,
        daysStored: daysStored,
        chargeableDays: chargeableDays,
        currentCharge: parseFloat(currentCharge.toFixed(3)),
        charge30Days: parseFloat(charge30Days.toFixed(3)),
        arrivalDate: s.arrivalDate,
        currentBoxCount: s.currentBoxCount
      };
    });

    // Calculate total current charges and 30-day estimate
    const totalCurrentCharges = shipmentCharges.reduce((sum, s) => sum + s.currentCharge, 0);
    const total30DayCharges = shipmentCharges.reduce((sum, s) => sum + s.charge30Days, 0);

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
          : undefined,
        // UNIFIED BILLING SETTINGS
        billingType,
        cbmRatePerDay,
        monthlyContractAmount,
        freeStorageDays,
        minimumCharge,
        advanceBalance
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

        // CBM & Charges stats
        totalCBM: parseFloat(totalCBM.toFixed(3)),
        totalCurrentCharges: parseFloat(totalCurrentCharges.toFixed(3)),
        total30DayCharges: parseFloat(total30DayCharges.toFixed(3)),

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
      // NEW: CBM charges per shipment
      shipmentCharges,
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
    const { 
      name, description, contactPerson, contactPhone, contractStatus, isActive,
      // UNIFIED BILLING FIELDS
      billingType, cbmRatePerDay, monthlyContractAmount, freeStorageDays, minimumCharge, advanceBalance,
      // EMAIL SETTINGS
      statementEmails
    } = req.body;
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
        isActive: isActive !== undefined ? parseBoolean(isActive, profile.isActive) : profile.isActive,
        // UNIFIED BILLING FIELDS
        billingType: billingType || undefined,
        cbmRatePerDay: cbmRatePerDay !== undefined ? parseFloat(cbmRatePerDay) : undefined,
        monthlyContractAmount: monthlyContractAmount !== undefined ? parseFloat(monthlyContractAmount) : undefined,
        freeStorageDays: freeStorageDays !== undefined ? parseInt(freeStorageDays) : undefined,
        minimumCharge: minimumCharge !== undefined ? parseFloat(minimumCharge) : undefined,
        advanceBalance: advanceBalance !== undefined ? parseFloat(advanceBalance) : undefined,
        // EMAIL SETTINGS
        statementEmails: statementEmails !== undefined ? statementEmails : undefined
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

// Send Statement Email to company profile
router.post('/:profileId/send-statement', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { emails, subject, includeShipments, includeInvoices, includeCharges } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'At least one email address is required' });
    }

    // Get company profile
    const profile = await prisma.companyProfile.findFirst({
      where: { id: profileId, companyId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    // Get company info for branding
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    // Get all shipments for this company profile
    const allShipments = await prisma.shipment.findMany({
      where: {
        companyId,
        companyProfileId: profileId,
        status: { in: ['IN_WAREHOUSE', 'ACTIVE', 'PARTIAL', 'IN_STORAGE'] }
      },
      include: {
        boxes: true
      }
    });

    // Get all invoices for this company profile
    const allInvoices = await prisma.invoice.findMany({
      where: {
        shipment: { companyProfileId: profileId }
      },
      include: {
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Calculate stats
    const totalCBM = allShipments.reduce((sum, s) => sum + (Number((s as any).cbm) || 0), 0);
    const billingType = (profile as any).billingType || 'PER_CBM';
    const cbmRatePerDay = (profile as any).cbmRatePerDay || 0.5;
    const freeStorageDays = (profile as any).freeStorageDays || 0;
    const minimumCharge = (profile as any).minimumCharge || 0;

    // Calculate charges for each shipment
    const shipmentCharges = allShipments.map(s => {
      const cbm = Number((s as any).cbm) || 0;
      const arrival = s.arrivalDate ? new Date(s.arrivalDate) : new Date(s.createdAt);
      const daysStored = Math.max(0, Math.floor((Date.now() - arrival.getTime()) / (1000 * 60 * 60 * 24)));
      const chargeableDays = Math.max(0, daysStored - freeStorageDays);
      const currentCharge = Math.max(minimumCharge, cbm * cbmRatePerDay * chargeableDays);
      
      return {
        referenceId: s.referenceId,
        clientName: s.clientName,
        cbm: cbm.toFixed(3),
        daysStored,
        chargeableDays,
        currentCharge: currentCharge.toFixed(3),
        arrivalDate: s.arrivalDate ? new Date(s.arrivalDate).toLocaleDateString() : 'N/A',
        currentBoxCount: s.currentBoxCount
      };
    });

    const totalCurrentCharges = shipmentCharges.reduce((sum, s) => sum + parseFloat(s.currentCharge), 0);
    const totalInvoiceAmount = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaidAmount = allInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstandingBalance = totalInvoiceAmount - totalPaidAmount;

    // Generate professional HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storage Statement - ${profile.name}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .company-info { background: #f8fafc; padding: 20px 30px; border-bottom: 1px solid #e2e8f0; }
    .company-info h2 { margin: 0 0 10px; color: #1e3a5f; font-size: 22px; }
    .company-info p { margin: 5px 0; color: #64748b; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; padding: 25px 30px; background: #fff; }
    .stat-card { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 20px; border-radius: 10px; text-align: center; }
    .stat-card.primary { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; }
    .stat-card.success { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; }
    .stat-card.warning { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; }
    .stat-card.danger { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; }
    .stat-card h3 { margin: 0; font-size: 28px; font-weight: 700; }
    .stat-card p { margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
    .section { padding: 25px 30px; border-bottom: 1px solid #e2e8f0; }
    .section h2 { margin: 0 0 20px; color: #1e3a5f; font-size: 18px; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #1e3a5f; color: white; padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .amount { font-weight: 600; color: #1e3a5f; }
    .footer { background: #1e3a5f; color: white; padding: 25px 30px; text-align: center; }
    .footer p { margin: 5px 0; font-size: 13px; opacity: 0.9; }
    .billing-info { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px 20px; margin: 15px 0; }
    .billing-info h4 { margin: 0 0 10px; color: #92400e; }
    .billing-info p { margin: 5px 0; color: #78350f; font-size: 14px; }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${company?.name || 'QGO Cargo'}</h1>
      <p>Storage Statement Report</p>
    </div>
    
    <div class="company-info">
      <h2>${profile.name}</h2>
      <p><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${profile.contactPerson ? `<p><strong>Contact:</strong> ${profile.contactPerson}</p>` : ''}
      ${profile.contactPhone ? `<p><strong>Phone:</strong> ${profile.contactPhone}</p>` : ''}
    </div>

    <div class="stats-grid">
      <div class="stat-card primary">
        <h3>${allShipments.length}</h3>
        <p>Active Shipments</p>
      </div>
      <div class="stat-card">
        <h3>${totalCBM.toFixed(2)}</h3>
        <p>Total CBM</p>
      </div>
      <div class="stat-card warning">
        <h3>${totalCurrentCharges.toFixed(3)}</h3>
        <p>Current Charges (KWD)</p>
      </div>
      <div class="stat-card ${outstandingBalance > 0 ? 'danger' : 'success'}">
        <h3>${outstandingBalance.toFixed(3)}</h3>
        <p>Outstanding Balance</p>
      </div>
    </div>

    <div class="billing-info">
      <h4>📊 Billing Information</h4>
      <p><strong>Billing Type:</strong> ${billingType.replace('_', ' ')}</p>
      <p><strong>Rate:</strong> ${cbmRatePerDay} KWD per CBM per day</p>
      <p><strong>Free Storage Days:</strong> ${freeStorageDays} days</p>
      ${minimumCharge > 0 ? `<p><strong>Minimum Charge:</strong> ${minimumCharge} KWD</p>` : ''}
    </div>

    ${includeShipments ? `
    <div class="section">
      <h2>📦 Active Shipments</h2>
      <table>
        <thead>
          <tr>
            <th>Reference ID</th>
            <th>Client Name</th>
            <th>Boxes</th>
            <th>CBM</th>
            <th>Arrival Date</th>
            <th>Days Stored</th>
            <th>Current Charge</th>
          </tr>
        </thead>
        <tbody>
          ${shipmentCharges.map(s => `
          <tr>
            <td><strong>${s.referenceId}</strong></td>
            <td>${s.clientName || '-'}</td>
            <td>${s.currentBoxCount}</td>
            <td>${s.cbm} m³</td>
            <td>${s.arrivalDate}</td>
            <td>${s.daysStored} days</td>
            <td class="amount">${s.currentCharge} KWD</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${includeInvoices && allInvoices.length > 0 ? `
    <div class="section">
      <h2>🧾 Recent Invoices</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Total Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${allInvoices.slice(0, 10).map(inv => `
          <tr>
            <td><strong>${inv.invoiceNumber}</strong></td>
            <td>${new Date(inv.invoiceDate).toLocaleDateString()}</td>
            <td class="amount">${(inv.totalAmount || 0).toFixed(3)} KWD</td>
            <td>${(inv.paidAmount || 0).toFixed(3)} KWD</td>
            <td class="amount">${((inv.totalAmount || 0) - (inv.paidAmount || 0)).toFixed(3)} KWD</td>
            <td><span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; background: ${inv.paymentStatus === 'PAID' ? '#d1fae5' : inv.paymentStatus === 'PARTIAL' ? '#fef3c7' : '#fee2e2'}; color: ${inv.paymentStatus === 'PAID' ? '#059669' : inv.paymentStatus === 'PARTIAL' ? '#d97706' : '#dc2626'};">${inv.paymentStatus}</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${includeCharges ? `
    <div class="section">
      <h2>💰 Charges Summary</h2>
      <table>
        <tbody>
          <tr>
            <td><strong>Total CBM in Storage</strong></td>
            <td class="amount">${totalCBM.toFixed(3)} m³</td>
          </tr>
          <tr>
            <td><strong>Current Storage Charges</strong></td>
            <td class="amount">${totalCurrentCharges.toFixed(3)} KWD</td>
          </tr>
          <tr>
            <td><strong>Total Invoiced Amount</strong></td>
            <td class="amount">${totalInvoiceAmount.toFixed(3)} KWD</td>
          </tr>
          <tr>
            <td><strong>Total Paid</strong></td>
            <td class="amount" style="color: #059669;">${totalPaidAmount.toFixed(3)} KWD</td>
          </tr>
          <tr style="background: #1e3a5f; color: white;">
            <td><strong>Outstanding Balance</strong></td>
            <td class="amount" style="color: white; font-size: 16px;">${outstandingBalance.toFixed(3)} KWD</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p><strong>${company?.name || 'QGO Cargo'}</strong></p>
      <p>This is an automated statement. For any queries, please contact us.</p>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    await sendEmail(companyId, {
      to: emails.join(', '),
      subject: subject || `Storage Statement - ${profile.name}`,
      html: htmlContent
    });

    res.json({ 
      success: true, 
      message: `Statement sent to ${emails.length} email(s)`,
      emailsSent: emails
    });

  } catch (error: any) {
    console.error('Error sending statement email:', error);
    res.status(500).json({ error: error.message || 'Failed to send statement email' });
  }
});

export default router;
