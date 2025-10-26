import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/invoice-settings - Get invoice settings for company
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    let settings = await prisma.invoiceSettings.findUnique({
      where: { companyId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.invoiceSettings.create({
        data: {
          companyId,
          templateType: 'MODERN',
          showLogo: true,
          primaryColor: '#2563eb',
          secondaryColor: '#64748b',
          footerText: 'Thank you for your business',
        },
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    res.status(500).json({ error: 'Failed to fetch invoice settings' });
  }
});

// PUT /api/invoice-settings - Update invoice settings (ADMIN only)
router.put('/', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const {
      templateType,
      showLogo,
      primaryColor,
      secondaryColor,
      footerText,
      termsConditions,
    } = req.body;

    // Color validation (hex format)
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return res.status(400).json({ error: 'Invalid primary color format (use hex format: #RRGGBB)' });
    }
    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return res.status(400).json({ error: 'Invalid secondary color format (use hex format: #RRGGBB)' });
    }

    const settings = await prisma.invoiceSettings.upsert({
      where: { companyId },
      update: {
        templateType: templateType?.trim(),
        showLogo,
        primaryColor: primaryColor?.trim(),
        secondaryColor: secondaryColor?.trim(),
        footerText: footerText?.trim(),
        termsConditions: termsConditions?.trim(),
      },
      create: {
        companyId,
        templateType: templateType?.trim() || 'MODERN',
        showLogo: showLogo !== undefined ? showLogo : true,
        primaryColor: primaryColor?.trim() || '#2563eb',
        secondaryColor: secondaryColor?.trim() || '#64748b',
        footerText: footerText?.trim() || 'Thank you for your business',
        termsConditions: termsConditions?.trim(),
      },
    });

    res.json({ settings, message: 'Invoice settings updated successfully' });
  } catch (error) {
    console.error('Error updating invoice settings:', error);
    res.status(500).json({ error: 'Failed to update invoice settings' });
  }
});

export default router;
