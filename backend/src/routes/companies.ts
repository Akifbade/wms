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

    // QGO Logo URL
    const logoUrl = 'http://qgocargo.com/logo.png';

    // Generate clean, modern HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storage Statement - ${profile.name}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7fa; font-family: Arial, Helvetica, sans-serif;">
  
  <!-- Wrapper Table -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa; padding:30px 0;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table width="650" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- HEADER with Logo -->
          <tr>
            <td style="background: #0f172a; padding:25px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="140">
                    <img src="${logoUrl}" alt="QGO Cargo" width="120" height="auto" style="display:block; max-height:50px;" />
                  </td>
                  <td align="right">
                    <p style="margin:0; color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Storage Statement</p>
                    <p style="margin:5px 0 0; color:#ffffff; font-size:20px; font-weight:bold;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Info Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%); padding:20px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0; color:#ffffff; font-size:18px; font-weight:bold;">📋 ${profile.name}</p>
                    <p style="margin:5px 0 0; color:#dbeafe; font-size:13px;">
                      ${profile.contactPerson ? `👤 ${profile.contactPerson}` : ''} 
                      ${profile.contactPhone ? ` • 📞 ${profile.contactPhone}` : ''}
                    </p>
                  </td>
                  <td align="right">
                    <table cellpadding="0" cellspacing="0" style="background:${netBalance > 0 ? '#ef4444' : '#22c55e'}; border-radius:8px; padding:10px 20px;">
                      <tr>
                        <td style="color:#ffffff; font-size:11px; text-transform:uppercase;">Status</td>
                      </tr>
                      <tr>
                        <td style="color:#ffffff; font-size:16px; font-weight:bold;">${netBalance > 0 ? '⚠️ AMOUNT DUE' : '✅ ALL CLEAR'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN STATS - 4 Colored Cards -->
          <tr>
            <td style="padding:30px 35px 20px;">
              <p style="margin:0 0 15px; color:#1e293b; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">📊 Storage Overview</p>
              <table width="100%" cellpadding="0" cellspacing="10">
                <tr>
                  <!-- Shipments -->
                  <td width="25%" style="background:#3b82f6; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">${allShipments.length}</p>
                    <p style="margin:5px 0 0; color:#dbeafe; font-size:11px; text-transform:uppercase;">📦 Shipments</p>
                  </td>
                  <!-- Total CBM -->
                  <td width="25%" style="background:#8b5cf6; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">${totalCBM.toFixed(2)}</p>
                    <p style="margin:5px 0 0; color:#e9d5ff; font-size:11px; text-transform:uppercase;">📐 Total CBM</p>
                  </td>
                  <!-- Total Boxes -->
                  <td width="25%" style="background:#f59e0b; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">${totalBoxes}</p>
                    <p style="margin:5px 0 0; color:#fef3c7; font-size:11px; text-transform:uppercase;">📦 Boxes</p>
                  </td>
                  <!-- Pallets -->
                  <td width="25%" style="background:#10b981; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">${totalPallets}</p>
                    <p style="margin:5px 0 0; color:#d1fae5; font-size:11px; text-transform:uppercase;">🎨 Pallets</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BILLING RATES BOX -->
          <tr>
            <td style="padding:0 35px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7; border:2px solid #f59e0b; border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 15px; color:#92400e; font-size:14px; font-weight:bold;">💰 YOUR BILLING RATES</p>
                    <table width="100%" cellpadding="5" cellspacing="0">
                      <tr>
                        <td style="color:#78350f; font-size:13px;">📋 Billing Type:</td>
                        <td align="right" style="color:#92400e; font-size:13px; font-weight:bold;">${billingType.replace('_', ' ')}</td>
                        <td width="30"></td>
                        <td style="color:#78350f; font-size:13px;">💵 Rate per CBM/Day:</td>
                        <td align="right" style="color:#92400e; font-size:13px; font-weight:bold;">${cbmRatePerDay} KWD</td>
                      </tr>
                      <tr>
                        <td style="color:#78350f; font-size:13px;">🆓 Free Storage Days:</td>
                        <td align="right" style="color:#92400e; font-size:13px; font-weight:bold;">${freeStorageDays} days</td>
                        <td width="30"></td>
                        <td style="color:#78350f; font-size:13px;">📉 Minimum Charge:</td>
                        <td align="right" style="color:#92400e; font-size:13px; font-weight:bold;">${minimumCharge} KWD</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CHARGE PROJECTIONS - 3 Cards -->
          <tr>
            <td style="padding:0 35px 25px;">
              <p style="margin:0 0 15px; color:#1e293b; font-size:14px; font-weight:bold; text-transform:uppercase;">📈 Charge Projections (Based on Current Storage)</p>
              <table width="100%" cellpadding="0" cellspacing="10">
                <tr>
                  <!-- Per Day -->
                  <td width="33%" style="background:#0f172a; border-radius:12px; padding:20px; text-align:center;">
                    <p style="margin:0; color:#94a3b8; font-size:11px; text-transform:uppercase;">⏱️ Per Day</p>
                    <p style="margin:8px 0 0; color:#ffffff; font-size:24px; font-weight:bold;">${totalDailyCharge.toFixed(3)}</p>
                    <p style="margin:0; color:#64748b; font-size:12px;">KWD</p>
                  </td>
                  <!-- Per Month -->
                  <td width="33%" style="background:#1e40af; border-radius:12px; padding:20px; text-align:center;">
                    <p style="margin:0; color:#93c5fd; font-size:11px; text-transform:uppercase;">📅 Per Month (30 Days)</p>
                    <p style="margin:8px 0 0; color:#fbbf24; font-size:24px; font-weight:bold;">${monthlyCharge.toFixed(3)}</p>
                    <p style="margin:0; color:#93c5fd; font-size:12px;">KWD</p>
                  </td>
                  <!-- Per Year -->
                  <td width="33%" style="background:#059669; border-radius:12px; padding:20px; text-align:center;">
                    <p style="margin:0; color:#d1fae5; font-size:11px; text-transform:uppercase;">📆 Per Year (365 Days)</p>
                    <p style="margin:8px 0 0; color:#ffffff; font-size:24px; font-weight:bold;">${yearlyCharge.toFixed(3)}</p>
                    <p style="margin:0; color:#a7f3d0; font-size:12px;">KWD</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BALANCE SUMMARY - Big Box -->
          <tr>
            <td style="padding:0 35px 25px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:${netBalance > 0 ? '#fef2f2' : '#f0fdf4'}; border:3px solid ${netBalance > 0 ? '#ef4444' : '#22c55e'}; border-radius:12px;">
                <tr>
                  <td style="padding:25px;">
                    <p style="margin:0 0 20px; color:#1e293b; font-size:14px; font-weight:bold; text-transform:uppercase;">💳 PAYMENT SUMMARY</p>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr style="background:#ffffff; border-radius:8px;">
                        <td style="color:#64748b; font-size:13px; padding:12px; border-bottom:1px solid #e2e8f0;">📦 Current Storage Charges</td>
                        <td align="right" style="color:#1e293b; font-size:16px; font-weight:bold; padding:12px; border-bottom:1px solid #e2e8f0;">${totalCurrentCharges.toFixed(3)} KWD</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td style="color:#64748b; font-size:13px; padding:12px; border-bottom:1px solid #e2e8f0;">🧾 Total Invoiced</td>
                        <td align="right" style="color:#1e293b; font-size:16px; font-weight:bold; padding:12px; border-bottom:1px solid #e2e8f0;">${totalInvoiceAmount.toFixed(3)} KWD</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td style="color:#64748b; font-size:13px; padding:12px; border-bottom:1px solid #e2e8f0;">✅ Total Paid</td>
                        <td align="right" style="color:#22c55e; font-size:16px; font-weight:bold; padding:12px; border-bottom:1px solid #e2e8f0;">${totalPaidAmount.toFixed(3)} KWD</td>
                      </tr>
                      <tr style="background:#ffffff;">
                        <td style="color:#64748b; font-size:13px; padding:12px; border-bottom:1px solid #e2e8f0;">💰 Advance Balance</td>
                        <td align="right" style="color:#3b82f6; font-size:16px; font-weight:bold; padding:12px; border-bottom:1px solid #e2e8f0;">${advanceBalance.toFixed(3)} KWD</td>
                      </tr>
                      <tr style="background:${netBalance > 0 ? '#ef4444' : '#22c55e'};">
                        <td style="color:#ffffff; font-size:15px; font-weight:bold; padding:15px; border-radius:0 0 0 8px;">⚡ NET BALANCE TO PAY</td>
                        <td align="right" style="color:#ffffff; font-size:22px; font-weight:bold; padding:15px; border-radius:0 0 8px 0;">${netBalance.toFixed(3)} KWD</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${includeShipments && shipmentCharges.length > 0 ? `
          <!-- SHIPMENTS TABLE -->
          <tr>
            <td style="padding:0 35px 25px;">
              <p style="margin:0 0 15px; color:#1e293b; font-size:14px; font-weight:bold; text-transform:uppercase;">📦 SHIPMENT DETAILS</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <tr style="background:#0f172a;">
                  <td style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 10px; text-transform:uppercase;">Ref #</td>
                  <td style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 8px; text-transform:uppercase;">Client</td>
                  <td align="center" style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 8px; text-transform:uppercase;">📦 Boxes</td>
                  <td align="center" style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 8px; text-transform:uppercase;">🎨 Pallets</td>
                  <td align="center" style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 8px; text-transform:uppercase;">📐 CBM</td>
                  <td align="center" style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 8px; text-transform:uppercase;">⏱️ Days</td>
                  <td align="right" style="color:#ffffff; font-size:11px; font-weight:bold; padding:12px 10px; text-transform:uppercase;">💵 Charge</td>
                </tr>
                ${shipmentCharges.map((s, i) => `
                <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="color:#3b82f6; font-size:12px; font-weight:bold; padding:10px;">${s.referenceId}</td>
                  <td style="color:#64748b; font-size:12px; padding:10px 8px;">${s.clientName || '-'}</td>
                  <td align="center" style="color:#64748b; font-size:12px; padding:10px 8px;">${s.currentBoxCount}</td>
                  <td align="center" style="color:#8b5cf6; font-size:12px; font-weight:bold; padding:10px 8px;">${s.palletCount || '-'}</td>
                  <td align="center" style="color:#0891b2; font-size:12px; font-weight:bold; padding:10px 8px;">${s.cbm}</td>
                  <td align="center" style="color:#64748b; font-size:12px; padding:10px 8px;">${s.daysStored}</td>
                  <td align="right" style="color:#1e293b; font-size:13px; font-weight:bold; padding:10px;">${s.currentCharge} KWD</td>
                </tr>
                ${s.notes ? `<tr style="background:#fffbeb;">
                  <td colspan="7" style="color:#92400e; font-size:11px; padding:8px 10px;">📝 Note: ${s.notes}</td>
                </tr>` : ''}
                `).join('')}
                <tr style="background:#0f172a;">
                  <td colspan="4" style="color:#ffffff; font-size:13px; font-weight:bold; padding:12px 10px;">TOTAL</td>
                  <td align="center" style="color:#fbbf24; font-size:13px; font-weight:bold; padding:12px 8px;">${totalCBM.toFixed(3)}</td>
                  <td align="center" style="color:#94a3b8; font-size:12px; padding:12px 8px;">-</td>
                  <td align="right" style="color:#ffffff; font-size:15px; font-weight:bold; padding:12px 10px;">${totalCurrentCharges.toFixed(3)} KWD</td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          ${includeInvoices && allInvoices.length > 0 ? `
          <!-- INVOICES TABLE -->
          <tr>
            <td style="padding:0 35px 25px;">
              <p style="margin:0 0 15px; color:#1e293b; font-size:14px; font-weight:bold; text-transform:uppercase;">🧾 RECENT INVOICES</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <tr style="background:#475569;">
                  <td style="color:#ffffff; font-size:11px; font-weight:bold; padding:10px; text-transform:uppercase;">Invoice #</td>
                  <td style="color:#ffffff; font-size:11px; font-weight:bold; padding:10px; text-transform:uppercase;">Date</td>
                  <td align="right" style="color:#ffffff; font-size:11px; font-weight:bold; padding:10px; text-transform:uppercase;">Amount</td>
                  <td align="right" style="color:#ffffff; font-size:11px; font-weight:bold; padding:10px; text-transform:uppercase;">Paid</td>
                  <td align="center" style="color:#ffffff; font-size:11px; font-weight:bold; padding:10px; text-transform:uppercase;">Status</td>
                </tr>
                ${allInvoices.slice(0, 8).map((inv, i) => `
                <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="color:#3b82f6; font-size:12px; font-weight:bold; padding:10px;">${inv.invoiceNumber}</td>
                  <td style="color:#64748b; font-size:12px; padding:10px;">${new Date(inv.invoiceDate).toLocaleDateString('en-GB')}</td>
                  <td align="right" style="color:#1e293b; font-size:12px; font-weight:bold; padding:10px;">${(inv.totalAmount || 0).toFixed(3)}</td>
                  <td align="right" style="color:#22c55e; font-size:12px; padding:10px;">${(inv.paidAmount || 0).toFixed(3)}</td>
                  <td align="center" style="padding:10px;">
                    <span style="display:inline-block; padding:4px 12px; border-radius:20px; font-size:10px; font-weight:bold; background:${inv.paymentStatus === 'PAID' ? '#dcfce7' : inv.paymentStatus === 'PARTIAL' ? '#fef3c7' : '#fee2e2'}; color:${inv.paymentStatus === 'PAID' ? '#16a34a' : inv.paymentStatus === 'PARTIAL' ? '#d97706' : '#dc2626'};">${inv.paymentStatus}</span>
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f172a; padding:30px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="QGO Cargo" width="100" height="auto" style="display:block; margin-bottom:15px; max-height:40px;" />
                    <p style="margin:0 0 5px; color:#ffffff; font-size:14px; font-weight:bold;">${company?.name || 'QGO Cargo'}</p>
                    <p style="margin:0 0 15px; color:#94a3b8; font-size:12px;">Professional Warehouse & Storage Solutions</p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding:0 10px;">
                          <a href="https://qgocargo.com" style="color:#3b82f6; font-size:12px; text-decoration:none;">🌐 Website</a>
                        </td>
                        <td style="padding:0 10px;">
                          <a href="mailto:info@qgocargo.com" style="color:#3b82f6; font-size:12px; text-decoration:none;">📧 Email</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:20px 0 0; color:#64748b; font-size:11px;">This is an automated statement generated on ${new Date().toLocaleString()}</p>
                    <p style="margin:5px 0 0; color:#64748b; font-size:11px;">For queries, please contact your account manager.</p>
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
      subject: subject || `📊 Storage Statement - ${profile.name} - ${new Date().toLocaleDateString('en-GB')}`,
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
