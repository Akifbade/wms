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
        res.json(profiles);
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
        res.json(profile);
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
        const profile = await prisma.companyProfile.create({
            data: {
                name: name.trim(),
                description: description?.trim() || '',
                contactPerson: contactPerson?.trim() || '',
                contactPhone: contactPhone?.trim() || '',
                logo: logoPath,
                contractStatus: contractStatus || 'ACTIVE',
                isActive: isActive !== false,
                companyId
            }
        });
        res.status(201).json(profile);
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
                isActive: isActive !== undefined ? isActive : profile.isActive
            }
        });
        res.json(updated);
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
