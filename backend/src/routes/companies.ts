import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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

    res.json(profiles);
  } catch (error: any) {
    console.error('Error fetching company profiles:', error);
    res.status(500).json({ error: 'Failed to fetch company profiles' });
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

    res.json(profile);
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
        isActive: isActive !== undefined ? isActive : profile.isActive
      }
    });

    res.json(updated);
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
