import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

const configSchema = z.object({
  itemTypes: z.array(z.string()),
  units: z.array(z.string()),
  lowStockThreshold: z.number().optional(),
});

// GET config
router.get('/:companyId', async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const result: any = await prisma.$queryRaw`
      SELECT * FROM inventory_configurations WHERE companyId = ${companyId}
    `;
    const config = result[0];
    
    if (!config) {
      return res.status(404).json({ success: false, error: 'Config not found' });
    }

    res.json({
      success: true,
      data: {
        ...config,
        itemTypes: JSON.parse(config.itemTypes || '[]'),
        units: JSON.parse(config.units || '[]'),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create config
router.post('/', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = configSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const id = 'config_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    await prisma.$executeRaw`
      INSERT INTO inventory_configurations 
      (id, companyId, itemTypes, units, lowStockThreshold, createdAt, updatedAt)
      VALUES (${id}, ${companyId}, ${JSON.stringify(data.itemTypes)}, ${JSON.stringify(data.units)}, ${data.lowStockThreshold || 10}, NOW(), NOW())
    `;

    res.status(201).json({ success: true, message: 'Config created', id });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT update config
router.put('/:companyId', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const data = configSchema.parse(req.body);

    await prisma.$executeRaw`
      UPDATE inventory_configurations 
      SET itemTypes = ${JSON.stringify(data.itemTypes)}, 
          units = ${JSON.stringify(data.units)}, 
          lowStockThreshold = ${data.lowStockThreshold || 10}, 
          updatedAt = NOW() 
      WHERE companyId = ${companyId}
    `;

    res.json({ success: true, message: 'Config updated' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
