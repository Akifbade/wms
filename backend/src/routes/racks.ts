import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

const rackSchema = z.object({
  code: z.string().min(1),
  rackType: z.enum(['STORAGE', 'MATERIALS', 'EQUIPMENT']).optional(),
  location: z.string().optional(),
  capacityTotal: z.number().positive().optional(),
});

// Get all racks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, section, search } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.code = { contains: search as string };
    }

    const racks = await prisma.rack.findMany({
      where,
      include: {
        inventory: true,
        boxes: {
          where: { status: 'IN_STORAGE' },
          select: {
            id: true,
            shipmentId: true,
          },
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Calculate utilization
    const racksWithStats = racks.map((rack: any) => ({
      ...rack,
      utilization: rack.capacityTotal > 0 
        ? Math.round((rack.capacityUsed / rack.capacityTotal) * 100) 
        : 0,
    }));

    res.json({ racks: racksWithStats });
  } catch (error) {
    console.error('Get racks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single rack
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const rack = await prisma.rack.findFirst({
      where: { id, companyId },
      include: {
        inventory: true,
        boxes: {
          where: { 
            status: 'IN_STORAGE'  // Only show boxes currently in storage
          },
          include: {
            shipment: {
              select: {
                id: true,
                name: true,
                referenceId: true,
                clientName: true,
                status: true,
              },
            },
          },
        },
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!rack) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    res.json({ rack });
  } catch (error) {
    console.error('Get rack error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create rack
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const data = rackSchema.parse(req.body);
    const companyId = req.user!.companyId;

    // Check if rack code already exists
    const existing = await prisma.rack.findFirst({
      where: {
        code: data.code,
        companyId,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Rack code already exists' });
    }

    const rack = await prisma.rack.create({
      data: {
        ...data,
        companyId,
        qrCode: `QR-${data.code}`,
        capacityTotal: data.capacityTotal || 100,
        capacityUsed: 0,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({ rack });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create rack error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update rack
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const existing = await prisma.rack.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    const rack = await prisma.rack.update({
      where: { id },
      data: req.body,
    });

    res.json({ rack });
  } catch (error) {
    console.error('Update rack error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete rack
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const existing = await prisma.rack.findFirst({
      where: { id, companyId },
      include: {
        boxes: {
          where: { status: 'IN_STORAGE' },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    if (existing.boxes.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete rack with boxes in storage' 
      });
    }

    await prisma.rack.delete({ where: { id } });

    res.json({ message: 'Rack deleted successfully' });
  } catch (error) {
    console.error('Delete rack error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
