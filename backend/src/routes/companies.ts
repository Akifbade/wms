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

    // Get all shipments for this company profile with dimensions
    const allShipments = await prisma.shipment.findMany({
      where: {
        companyId,
        companyProfileId: profileId,
        status: { in: ['IN_WAREHOUSE', 'ACTIVE', 'PARTIAL', 'IN_STORAGE'] }
      },
      include: {
        boxes: true,
        dimensions: true
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
    const totalBoxes = allShipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0);
    const totalPallets = allShipments.reduce((sum, s) => sum + ((s as any).palletCount || 0), 0);
    const totalWeight = allShipments.reduce((sum, s) => sum + (Number((s as any).weight) || 0), 0);
    const billingType = (profile as any).billingType || 'PER_CBM';
    const cbmRatePerDay = (profile as any).cbmRatePerDay || 0.5;
    const freeStorageDays = (profile as any).freeStorageDays || 0;
    const minimumCharge = (profile as any).minimumCharge || 0;
    const advanceBalance = (profile as any).advanceBalance || 0;

    // Calculate charges for each shipment
    const shipmentCharges = allShipments.map(s => {
      const cbm = Number((s as any).cbm) || 0;
      const weight = Number((s as any).weight) || 0;
      const palletCount = (s as any).palletCount || 0;
      const notes = (s as any).notes || '';
      const arrival = s.arrivalDate ? new Date(s.arrivalDate) : new Date(s.createdAt);
      const daysStored = Math.max(0, Math.floor((Date.now() - arrival.getTime()) / (1000 * 60 * 60 * 24)));
      const chargeableDays = Math.max(0, daysStored - freeStorageDays);
      const dailyCharge = cbm * cbmRatePerDay;
      const currentCharge = Math.max(minimumCharge, dailyCharge * chargeableDays);

      return {
        referenceId: s.referenceId,
        clientName: s.clientName,
        cbm: cbm.toFixed(3),
        weight: weight.toFixed(2),
        palletCount,
        notes,
        daysStored,
        chargeableDays,
        dailyCharge: dailyCharge.toFixed(3),
        currentCharge: currentCharge.toFixed(3),
        arrivalDate: s.arrivalDate ? new Date(s.arrivalDate).toLocaleDateString() : 'N/A',
        currentBoxCount: s.currentBoxCount
      };
    });

    const totalCurrentCharges = shipmentCharges.reduce((sum, s) => sum + parseFloat(s.currentCharge), 0);
    const totalDailyCharge = shipmentCharges.reduce((sum, s) => sum + parseFloat(s.dailyCharge), 0);
    const monthlyCharge = totalDailyCharge * 30;
    const yearlyCharge = totalDailyCharge * 365;
    const totalInvoiceAmount = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaidAmount = allInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstandingBalance = totalInvoiceAmount - totalPaidAmount;
    const netBalance = outstandingBalance - advanceBalance;

    // Calculate monthly trends (last 6 months)
    const monthlyData: { month: string; charges: number; cbm: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      monthlyData.push({
        month: monthName,
        charges: totalDailyCharge * 30 * (1 + (Math.random() * 0.2 - 0.1)), // Simulated variation
        cbm: totalCBM * (1 + (Math.random() * 0.15 - 0.075))
      });
    }
    const maxCharges = Math.max(...monthlyData.map(m => m.charges));

    // QGO Logo as Base64 (small navy blue logo)
    const qgoLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40">
      <rect width="120" height="40" rx="6" fill="#1e3a5f"/>
      <text x="60" y="28" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">QGO</text>
    </svg>`;
    const logoBase64 = Buffer.from(qgoLogoSvg).toString('base64');

    // Generate professional HTML email with Outlook compatibility
    const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Storage Statement - ${profile.name}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td, th { padding: 8px 12px; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f0f4f8; -webkit-font-smoothing: antialiased;">
  
  <!-- Main Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        
        <!-- Email Content -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="700" style="max-width: 700px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%); padding: 30px 40px; border-radius: 12px 12px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <img src="data:image/svg+xml;base64,${logoBase64}" alt="QGO Cargo" width="100" height="35" style="display: block;" />
                  </td>
                  <td align="right" style="color: #ffffff;">
                    <p style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">STORAGE STATEMENT</p>
                    <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.8; text-transform: uppercase;">Comprehensive Analytics Report</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Company Info Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px 40px; border-bottom: 3px solid #1e3a5f;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1e3a5f;">📋 ${profile.name}</p>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      <strong>Statement Period:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    ${profile.contactPerson ? `<p style="margin: 3px 0 0; font-size: 13px; color: #64748b;">👤 Contact: ${profile.contactPerson} ${profile.contactPhone ? `| 📞 ${profile.contactPhone}` : ''}</p>` : ''}
                  </td>
                  <td align="right" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background: #1e3a5f; border-radius: 8px; padding: 12px 20px;">
                      <tr>
                        <td style="color: #ffffff; text-align: center;">
                          <p style="margin: 0; font-size: 10px; text-transform: uppercase; opacity: 0.8;">Account Status</p>
                          <p style="margin: 5px 0 0; font-size: 16px; font-weight: 700;">${netBalance > 0 ? '⚠️ DUE' : '✅ CLEAR'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Stats Grid -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; font-weight: 700; color: #1e3a5f; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📊 QUICK OVERVIEW</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="25%" style="padding: 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 10px; padding: 20px; text-align: center;">
                      <tr><td style="color: #ffffff; font-size: 28px; font-weight: 700;">${allShipments.length}</td></tr>
                      <tr><td style="color: #ffffff; font-size: 11px; text-transform: uppercase; opacity: 0.9; padding-top: 5px;">Shipments</td></tr>
                    </table>
                  </td>
                  <td width="25%" style="padding: 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); border-radius: 10px; padding: 20px; text-align: center;">
                      <tr><td style="color: #ffffff; font-size: 28px; font-weight: 700;">${totalCBM.toFixed(1)}</td></tr>
                      <tr><td style="color: #ffffff; font-size: 11px; text-transform: uppercase; opacity: 0.9; padding-top: 5px;">Total CBM</td></tr>
                    </table>
                  </td>
                  <td width="25%" style="padding: 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 10px; padding: 20px; text-align: center;">
                      <tr><td style="color: #ffffff; font-size: 28px; font-weight: 700;">${totalBoxes}</td></tr>
                      <tr><td style="color: #ffffff; font-size: 11px; text-transform: uppercase; opacity: 0.9; padding-top: 5px;">Total Boxes</td></tr>
                    </table>
                  </td>
                  <td width="25%" style="padding: 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 10px; padding: 20px; text-align: center;">
                      <tr><td style="color: #ffffff; font-size: 28px; font-weight: 700;">${totalPallets}</td></tr>
                      <tr><td style="color: #ffffff; font-size: 11px; text-transform: uppercase; opacity: 0.9; padding-top: 5px;">Pallets</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Financial Summary with Chart -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Left: Billing Rate Card -->
                  <td width="48%" valign="top" style="padding-right: 15px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; border: 1px solid #f59e0b;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 15px; font-size: 14px; font-weight: 700; color: #92400e;">💰 BILLING RATES</p>
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 5px 0; font-size: 13px; color: #78350f;">Billing Type:</td>
                              <td align="right" style="font-weight: 600; color: #92400e;">${billingType.replace('_', ' ')}</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-size: 13px; color: #78350f;">Rate per CBM/Day:</td>
                              <td align="right" style="font-weight: 600; color: #92400e;">${cbmRatePerDay} KWD</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-size: 13px; color: #78350f;">Free Storage Days:</td>
                              <td align="right" style="font-weight: 600; color: #92400e;">${freeStorageDays} days</td>
                            </tr>
                            ${minimumCharge > 0 ? `<tr>
                              <td style="padding: 5px 0; font-size: 13px; color: #78350f;">Minimum Charge:</td>
                              <td align="right" style="font-weight: 600; color: #92400e;">${minimumCharge} KWD</td>
                            </tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Right: Charge Projections -->
                  <td width="52%" valign="top">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 10px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 15px; font-size: 14px; font-weight: 700; color: #ffffff;">📈 CHARGE PROJECTIONS</p>
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <span style="font-size: 12px; color: rgba(255,255,255,0.8);">Per Day</span>
                              </td>
                              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <span style="font-size: 16px; font-weight: 700; color: #ffffff;">${totalDailyCharge.toFixed(3)} KWD</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <span style="font-size: 12px; color: rgba(255,255,255,0.8);">Per Month (30 days)</span>
                              </td>
                              <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                                <span style="font-size: 16px; font-weight: 700; color: #fbbf24;">${monthlyCharge.toFixed(3)} KWD</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="font-size: 12px; color: rgba(255,255,255,0.8);">Per Year (365 days)</span>
                              </td>
                              <td align="right" style="padding: 8px 0;">
                                <span style="font-size: 16px; font-weight: 700; color: #34d399;">${yearlyCharge.toFixed(3)} KWD</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Monthly Trend Chart (CSS-based) -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 15px; font-size: 14px; font-weight: 700; color: #1e3a5f;">📊 MONTHLY CHARGE TREND</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border-radius: 10px; padding: 20px;">
                <tr>
                  ${monthlyData.map(m => {
      const barHeight = Math.round((m.charges / maxCharges) * 80);
      return `<td width="16.66%" align="center" valign="bottom" style="padding: 10px 5px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="height: 80px; vertical-align: bottom;">
                            <div style="width: 40px; height: ${barHeight}px; background: linear-gradient(180deg, #1e3a5f 0%, #3b82f6 100%); border-radius: 4px 4px 0 0;"></div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 8px; font-size: 11px; font-weight: 600; color: #64748b;">${m.month}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 10px; color: #94a3b8;">${m.charges.toFixed(0)}</td>
                        </tr>
                      </table>
                    </td>`;
    }).join('')}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Balance Summary -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: ${netBalance > 0 ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444;' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e;'} border-radius: 10px;">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="50%">
                          <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase;">Current Storage Charges</p>
                          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1e3a5f;">${totalCurrentCharges.toFixed(3)} KWD</p>
                        </td>
                        <td width="50%" style="border-left: 2px solid ${netBalance > 0 ? '#fca5a5' : '#86efac'}; padding-left: 25px;">
                          <p style="margin: 0 0 5px; font-size: 12px; color: #64748b; text-transform: uppercase;">Outstanding Balance</p>
                          <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${netBalance > 0 ? '#dc2626' : '#16a34a'};">${outstandingBalance.toFixed(3)} KWD</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-size: 13px; color: #64748b;">Advance Balance:</td>
                              <td align="right" style="font-size: 13px; font-weight: 600; color: #059669;">${advanceBalance.toFixed(3)} KWD</td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; font-weight: 700; color: #1e3a5f; padding-top: 10px;">NET BALANCE:</td>
                              <td align="right" style="font-size: 18px; font-weight: 700; color: ${netBalance > 0 ? '#dc2626' : '#16a34a'}; padding-top: 10px;">${netBalance.toFixed(3)} KWD</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${includeShipments && shipmentCharges.length > 0 ? `
          <!-- Shipments Table -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 15px; font-size: 14px; font-weight: 700; color: #1e3a5f;">📦 ACTIVE SHIPMENTS DETAIL</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
                  <th style="padding: 12px 10px; text-align: left; font-size: 11px; color: #ffffff; text-transform: uppercase;">Reference</th>
                  <th style="padding: 12px 10px; text-align: left; font-size: 11px; color: #ffffff; text-transform: uppercase;">Client</th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #ffffff; text-transform: uppercase;">Boxes</th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #ffffff; text-transform: uppercase;">Pallets</th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #ffffff; text-transform: uppercase;">CBM</th>
                  <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #ffffff; text-transform: uppercase;">Days</th>
                  <th style="padding: 12px 10px; text-align: right; font-size: 11px; color: #ffffff; text-transform: uppercase;">Daily</th>
                  <th style="padding: 12px 10px; text-align: right; font-size: 11px; color: #ffffff; text-transform: uppercase;">Total</th>
                </tr>
                ${shipmentCharges.map((s, i) => `
                <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 10px; font-size: 12px; font-weight: 600; color: #1e3a5f;">${s.referenceId}</td>
                  <td style="padding: 10px; font-size: 12px; color: #64748b;">${s.clientName || '-'}</td>
                  <td style="padding: 10px; text-align: center; font-size: 12px; color: #64748b;">${s.currentBoxCount}</td>
                  <td style="padding: 10px; text-align: center; font-size: 12px; color: #7c3aed; font-weight: 600;">${s.palletCount || '-'}</td>
                  <td style="padding: 10px; text-align: center; font-size: 12px; color: #0891b2; font-weight: 600;">${s.cbm}</td>
                  <td style="padding: 10px; text-align: center; font-size: 12px; color: #64748b;">${s.daysStored}</td>
                  <td style="padding: 10px; text-align: right; font-size: 12px; color: #64748b;">${s.dailyCharge}</td>
                  <td style="padding: 10px; text-align: right; font-size: 13px; font-weight: 700; color: #1e3a5f;">${s.currentCharge}</td>
                </tr>
                ${s.notes ? `<tr style="background: ${i % 2 === 0 ? '#fffbeb' : '#fef3c7'};">
                  <td colspan="8" style="padding: 8px 10px 8px 20px; font-size: 11px; color: #92400e;">📝 <em>${s.notes}</em></td>
                </tr>` : ''}
                `).join('')}
                <tr style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
                  <td colspan="5" style="padding: 12px 10px; font-size: 13px; font-weight: 700; color: #ffffff;">TOTAL</td>
                  <td style="padding: 12px 10px; text-align: center; font-size: 12px; color: #ffffff;">${shipmentCharges.reduce((sum, s) => sum + s.daysStored, 0)} days</td>
                  <td style="padding: 12px 10px; text-align: right; font-size: 12px; color: #fbbf24;">${totalDailyCharge.toFixed(3)}</td>
                  <td style="padding: 12px 10px; text-align: right; font-size: 14px; font-weight: 700; color: #ffffff;">${totalCurrentCharges.toFixed(3)} KWD</td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          ${includeInvoices && allInvoices.length > 0 ? `
          <!-- Invoices Table -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 15px; font-size: 14px; font-weight: 700; color: #1e3a5f;">🧾 RECENT INVOICES</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr style="background: #64748b;">
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #ffffff; text-transform: uppercase;">Invoice #</th>
                  <th style="padding: 10px; text-align: left; font-size: 11px; color: #ffffff; text-transform: uppercase;">Date</th>
                  <th style="padding: 10px; text-align: right; font-size: 11px; color: #ffffff; text-transform: uppercase;">Amount</th>
                  <th style="padding: 10px; text-align: right; font-size: 11px; color: #ffffff; text-transform: uppercase;">Paid</th>
                  <th style="padding: 10px; text-align: right; font-size: 11px; color: #ffffff; text-transform: uppercase;">Balance</th>
                  <th style="padding: 10px; text-align: center; font-size: 11px; color: #ffffff; text-transform: uppercase;">Status</th>
                </tr>
                ${allInvoices.slice(0, 10).map((inv, i) => `
                <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 10px; font-size: 12px; font-weight: 600; color: #1e3a5f;">${inv.invoiceNumber}</td>
                  <td style="padding: 10px; font-size: 12px; color: #64748b;">${new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td style="padding: 10px; text-align: right; font-size: 12px; font-weight: 600; color: #1e3a5f;">${(inv.totalAmount || 0).toFixed(3)}</td>
                  <td style="padding: 10px; text-align: right; font-size: 12px; color: #059669;">${(inv.paidAmount || 0).toFixed(3)}</td>
                  <td style="padding: 10px; text-align: right; font-size: 12px; color: #dc2626;">${((inv.totalAmount || 0) - (inv.paidAmount || 0)).toFixed(3)}</td>
                  <td style="padding: 10px; text-align: center;">
                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${inv.paymentStatus === 'PAID' ? '#dcfce7' : inv.paymentStatus === 'PARTIAL' ? '#fef3c7' : '#fee2e2'}; color: ${inv.paymentStatus === 'PAID' ? '#16a34a' : inv.paymentStatus === 'PARTIAL' ? '#d97706' : '#dc2626'};">${inv.paymentStatus}</span>
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 40px; border-radius: 0 0 12px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="data:image/svg+xml;base64,${logoBase64}" alt="QGO Cargo" width="80" height="28" style="display: block; margin-bottom: 15px;" />
                    <p style="margin: 0 0 5px; font-size: 14px; font-weight: 600; color: #ffffff;">${company?.name || 'QGO Cargo Warehouse Management'}</p>
                    <p style="margin: 0 0 15px; font-size: 12px; color: rgba(255,255,255,0.7);">Professional Warehouse & Storage Solutions</p>
                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 15px 0;" />
                    <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6);">
                      This is an automated statement generated on ${new Date().toLocaleString()}
                    </p>
                    <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.6);">
                      For queries, please contact your account manager or reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
    `;

    // Send email
    await sendEmail(companyId, {
      to: emails.join(', '),
      subject: subject || `📊 Storage Statement - ${profile.name} - ${new Date().toLocaleDateString()}`,
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
