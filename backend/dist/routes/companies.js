"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const parseBoolean = (value, fallback) => {
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
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/company-logos');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'company-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage });
// Get all company profiles for current company
router.get('/', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching company profiles:', error);
        res.status(500).json({ error: 'Failed to fetch company profiles' });
    }
});
// Get single company profile
router.get('/:profileId', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching company profile:', error);
        res.status(500).json({ error: 'Failed to fetch company profile' });
    }
});
// Get comprehensive company profile analytics
router.get('/:profileId/analytics', auth_1.authenticateToken, async (req, res) => {
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
        let placeholderProfile = null;
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
        const activeShipments = allShipments.filter(s => s.status === 'IN_WAREHOUSE' || s.status === 'ACTIVE' || s.status === 'PARTIAL').length;
        const releasedShipments = allShipments.filter(s => s.status === 'RELEASED').length;
        const pendingShipments = allShipments.filter(s => s.status === 'PENDING').length;
        // Calculate box statistics
        const totalBoxes = allShipments.reduce((sum, s) => sum + (s.originalBoxCount || 0), 0);
        const currentBoxes = allShipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0);
        // Calculate storage duration
        const storageDays = allShipments
            .filter(s => s.arrivalDate)
            .map(s => {
            const arrival = new Date(s.arrivalDate);
            const end = s.releasedAt ? new Date(s.releasedAt) : new Date();
            return Math.floor((end.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
        });
        const avgStorageDays = storageDays.length > 0
            ? Math.round(storageDays.reduce((a, b) => a + b, 0) / storageDays.length)
            : 0;
        // Calculate invoice statistics
        const totalInvoices = allInvoices.length;
        const totalInvoiceAmount = allInvoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);
        const paidInvoices = allInvoices.filter(inv => inv.paymentStatus === 'PAID').length;
        const partialInvoices = allInvoices.filter(inv => inv.paymentStatus === 'PARTIAL').length;
        const pendingInvoices = allInvoices.filter(inv => inv.paymentStatus === 'PENDING').length;
        const overdueInvoices = allInvoices.filter(inv => inv.paymentStatus === 'OVERDUE').length;
        // Calculate payment statistics
        const totalPaidAmount = allInvoices.reduce((sum, inv) => sum + (inv.paidAmount ?? 0), 0);
        const outstandingBalance = totalInvoiceAmount - totalPaidAmount;
        // Get all payments
        const allPayments = allInvoices.flatMap(inv => inv.payments || []);
        const totalPayments = allPayments.length;
        // Payment method breakdown
        const paymentMethods = allPayments.reduce((acc, payment) => {
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
    }
    catch (error) {
        console.error('Error fetching company analytics:', error);
        res.status(500).json({ error: 'Failed to fetch company analytics' });
    }
});
// Get single company profile (original endpoint kept for compatibility)
router.get('/:profileId/details', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching company profile:', error);
        res.status(500).json({ error: 'Failed to fetch company profile' });
    }
});
// Create new company profile
router.post('/', auth_1.authenticateToken, upload.single('logo'), async (req, res) => {
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
    }
    catch (error) {
        console.error('Error creating company profile:', error);
        res.status(500).json({ error: 'Failed to create company profile' });
    }
});
// Update company profile
router.put('/:profileId', auth_1.authenticateToken, upload.single('logo'), async (req, res) => {
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
                const oldPath = path_1.default.join(__dirname, `../../uploads/${profile.logo.split('/uploads/')[1]}`);
                if (fs_1.default.existsSync(oldPath)) {
                    fs_1.default.unlinkSync(oldPath);
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
    }
    catch (error) {
        console.error('Error updating company profile:', error);
        res.status(500).json({ error: 'Failed to update company profile' });
    }
});
// Delete company profile
router.delete('/:profileId', auth_1.authenticateToken, async (req, res) => {
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
            const filePath = path_1.default.join(__dirname, `../../uploads/${profile.logo.split('/uploads/')[1]}`);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await prisma.companyProfile.delete({
            where: { id: profileId }
        });
        res.json({ message: 'Company profile deleted' });
    }
    catch (error) {
        console.error('Error deleting company profile:', error);
        res.status(500).json({ error: 'Failed to delete company profile' });
    }
});
exports.default = router;
