import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get all settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.appSetting.findMany();

    const result: any = {};
    settings.forEach((setting) => {
      result[setting.key] = JSON.parse(setting.value);
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get setting by key
router.get('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: req.params.key },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ [req.params.key]: JSON.parse(setting.value) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update setting (admin only)
router.put('/:key', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await prisma.appSetting.upsert({
      where: { key: req.params.key },
      update: { value: JSON.stringify(value) },
      create: { key: req.params.key, value: JSON.stringify(value) },
    });

    res.json({ [req.params.key]: JSON.parse(setting.value) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
