import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/template-settings - Get current settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Template Settings] GET request received');
    const companyId = req.user!.companyId;
    console.log('[Template Settings] Company ID:', companyId);

    let settings = await prisma.templateSettings.findUnique({
      where: { companyId }
    });
    console.log('[Template Settings] Settings from DB:', settings ? 'Found' : 'Not found');

    // If no settings exist, return defaults
    if (!settings) {
      const defaultSettings = {
        companyName: 'QGO Cargo',
        companyAddress: 'Kuwait',
        companyPhone: '+965 XXXX XXXX',
        companyEmail: 'info@qgocargo.com',
        companyWebsite: 'www.qgocargo.com',
        invoiceTitle: 'TAX INVOICE',
        releaseNoteTitle: 'SHIPMENT RELEASE NOTE',
        invoicePrimaryColor: '#2563eb',
        releasePrimaryColor: '#1e40af',
        currencySymbol: 'KD',
        currencyPosition: 'AFTER',
        dateFormat: 'MMM dd, yyyy',
        timeFormat: 'hh:mm a',
        invoiceTemplateType: 'STANDARD',
        releaseNoteTemplate: 'PROFESSIONAL',
        invoiceFontSize: 'MEDIUM',
        invoicePaperSize: 'A4',
        printMarginTop: 10,
        printMarginBottom: 10,
        printMarginLeft: 10,
        printMarginRight: 10,
        invoiceShowLogo: true,
        invoiceShowAddress: true,
        invoiceShowPhone: true,
        invoiceShowEmail: true,
        invoiceShowWebsite: true,
        invoiceShowLicense: true,
        invoiceShowFooter: true,
        releaseNoteShowLogo: true,
        releaseShowShipment: true,
        releaseShowStorage: true,
        releaseShowItems: true,
        releaseShowCollector: true,
        releaseShowCharges: true,
        releaseShowPhotos: true,
        releaseShowTerms: true,
        releaseShowSignatures: true,
        requireStaffSignature: true,
        requireClientSignature: true,
        showQRCode: false,
        showWatermark: false,
      };
      
      return res.json({ success: true, settings: defaultSettings });
    }

    console.log('[Template Settings] Sending response');
    res.json({ success: true, settings });
  } catch (error) {
    console.error('[Template Settings] ERROR:', error);
    console.error('[Template Settings] Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' });
  }
});

// PUT /api/template-settings - Update settings
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const settingsData = req.body;

    // Remove fields that shouldn't be updated
    delete settingsData.id;
    delete settingsData.companyId;
    delete settingsData.createdAt;
    delete settingsData.updatedAt;

    const settings = await prisma.templateSettings.upsert({
      where: { companyId },
      update: settingsData,
      create: {
        companyId,
        ...settingsData
      }
    });

    res.json({ success: true, settings, message: 'Settings saved successfully!' });
  } catch (error) {
    console.error('Failed to update template settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// POST /api/template-settings/reset - Reset to defaults
router.post('/reset', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    await prisma.templateSettings.delete({
      where: { companyId }
    }).catch(() => {
      // Ignore error if record doesn't exist
    });

    res.json({ success: true, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('Failed to reset template settings:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
});

export default router;
