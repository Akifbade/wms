import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { calculatePalletUsage } from '../utils/rackCapacity';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

const rackSchema = z.object({
  code: z.string().min(1),
  rackType: z.enum(['STORAGE', 'MATERIALS', 'EQUIPMENT']).optional(),
  location: z.string().optional(),
  capacityTotal: z.number().positive().optional(),
  categoryId: z.string().optional(), // NEW: Category reference
  companyProfileId: z.string().optional(), // NEW: Company profile reference
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  dimensionUnit: z.enum(['CM', 'INCHES', 'METERS']).optional(),
});

// Get categories for rack assignment
router.get('/categories/list', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const profiles = await prisma.companyProfile.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        contractStatus: true,
        contactPerson: true,
        contactPhone: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(
      'Loaded company profiles for racks dropdown',
      profiles.length,
      'companyId:',
      companyId
    );

    res.json({
      categories: profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        logo: profile.logo,
        // Frontend still expects optional color/icon fields when rendering badges
        color: '#5B21B6',
        icon: '????',
        contractStatus: profile.contractStatus,
        contactPerson: profile.contactPerson,
        contactPhone: profile.contactPhone,
      })),
    });
  } catch (error) {
    console.error('Get rack company profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch company profiles' });
  }
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
        category: {
          select: {
            id: true,
            name: true,
            logo: true,
            color: true,
            icon: true,
          },
        },
        companyProfile: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
            contractStatus: true,
            contactPerson: true,
            contactPhone: true,
          },
        },
        boxes: {
          where: { 
            status: { in: ['IN_STORAGE', 'STORED'] },  // Only count stored boxes
            shipment: {
              status: { notIn: ['RELEASED'] }  // Exclude released shipments
            }
          },
          select: {
            id: true,
            shipmentId: true,
            status: true,
            boxNumber: true,
            photos: true,
            shipment: {
              select: {
                id: true,
                boxesPerPallet: true,
                palletCount: true,
              },
            },
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

    // Calculate utilization based on pallet usage rather than raw boxes
    const racksWithStats = racks.map((rack: any) => {
      const palletUsage = calculatePalletUsage(rack.boxes || []);
      
      // Determine status: FULL if at capacity, ACTIVE if has boxes, otherwise use stored status
      let derivedStatus = 'ACTIVE';
      if (palletUsage >= rack.capacityTotal) {
        derivedStatus = 'FULL';
      } else if (palletUsage === 0 && rack.status === 'INACTIVE') {
        derivedStatus = 'INACTIVE';
      }

      return {
        ...rack,
        capacityUsed: palletUsage,
        utilization: rack.capacityTotal > 0 
          ? Math.round((palletUsage / rack.capacityTotal) * 100) 
          : 0,
        status: derivedStatus,
      };
    });

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
        category: {
          select: {
            id: true,
            name: true,
            logo: true,
            color: true,
            icon: true,
          },
        },
        companyProfile: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
            contactPerson: true,
            contactPhone: true,
            contractStatus: true,
          },
        },
        boxes: {
          where: { 
            status: { in: ['IN_STORAGE', 'STORED'] },  // Only show boxes currently in storage
            shipment: {
              status: { notIn: ['RELEASED'] }  // Exclude released shipments
            }
          },
          include: {
            shipment: {
              select: {
                id: true,
                referenceId: true,
                shipper: true,
                consignee: true,
                status: true,
                boxesPerPallet: true,
                palletCount: true,
                companyProfile: {
                  select: {
                    id: true,
                    name: true,
                    logo: true,
                  }
                },
                clientName: true,
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

    // Calculate actual capacity used in pallet slots
    const palletUsage = calculatePalletUsage(rack.boxes || []);

    const derivedStatus = palletUsage >= rack.capacityTotal ? 'FULL' : (rack.status || 'ACTIVE');

    const rackWithStats = {
      ...rack,
      capacityUsed: palletUsage,
      utilization: rack.capacityTotal > 0 
        ? Math.round((palletUsage / rack.capacityTotal) * 100) 
        : 0,
      status: derivedStatus,
    };

    res.json({ rack: rackWithStats });
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

    // Validate categoryId if provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          companyId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    // Validate companyProfileId if provided
    if (data.companyProfileId) {
      const companyProfile = await prisma.companyProfile.findFirst({
        where: {
          id: data.companyProfileId,
          companyId,
        },
      });

      if (!companyProfile) {
        return res.status(404).json({ error: 'Company profile not found' });
      }
    }

    const rack = await prisma.rack.create({
      data: {
        code: data.code,
        rackType: data.rackType || 'STORAGE',
        location: data.location,
        categoryId: data.categoryId,
        companyProfileId: data.companyProfileId,
        length: data.length,
        width: data.width,
        height: data.height,
        dimensionUnit: data.dimensionUnit,
        companyId,
        qrCode: `QR-${data.code}`,
        capacityTotal: data.capacityTotal || 100,
        capacityUsed: 0,
        status: 'ACTIVE',
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            logo: true,
            color: true,
            icon: true,
          },
        },
        companyProfile: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
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

    // Validate categoryId if provided
    if (req.body.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: req.body.categoryId,
          companyId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    // Validate companyProfileId if provided
    if (req.body.companyProfileId) {
      const companyProfile = await prisma.companyProfile.findFirst({
        where: {
          id: req.body.companyProfileId,
          companyId,
        },
      });

      if (!companyProfile) {
        return res.status(404).json({ error: 'Company profile not found' });
      }
    }

    const rack = await prisma.rack.update({
      where: { id },
      data: req.body,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            logo: true,
            color: true,
            icon: true,
          },
        },
        companyProfile: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    res.json({ rack });
  } catch (error) {
    console.error('Update rack error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete rack - with strict delete protection and audit logging
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const userId = req.user!.id;

    const existing = await prisma.rack.findFirst({
      where: { id, companyId },
      include: {
        boxes: {
          where: { status: 'IN_STORAGE' },
        },
      },
    });

    if (!existing) {
      // Log failed deletion attempt
      await prisma.rackAuditLog.create({
        data: {
          rackId: id,
          action: 'DELETE',
          status: 'FAILED',
          message: 'Rack not found',
          performedBy: userId,
          companyId,
        },
      });
      return res.status(404).json({ error: 'Rack not found' });
    }

    // Check if boxes are allocated to this rack
    if (existing.boxes.length > 0) {
      // Log failed deletion due to allocated materials
      const boxDetails = existing.boxes.map(box => ({
        id: box.id,
        shipmentId: box.shipmentId,
        status: box.status,
      }));

      await prisma.rackAuditLog.create({
        data: {
          rackId: id,
          action: 'DELETE',
          status: 'FAILED',
          message: `Cannot delete: ${existing.boxes.length} box(es) allocated to this rack`,
          details: JSON.stringify({
            reason: 'MATERIALS_ALLOCATED',
            boxCount: existing.boxes.length,
            boxes: boxDetails,
          }),
          performedBy: userId,
          companyId,
        },
      });

      return res.status(400).json({
        error: `Cannot delete rack: ${existing.boxes.length} box(es) with materials are currently allocated`,
        details: {
          reason: 'MATERIALS_ALLOCATED',
          boxCount: existing.boxes.length,
          boxes: boxDetails,
        },
      });
    }

    // Perform soft delete
    const deletedRack = await prisma.rack.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        companyProfile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log successful deletion
    await prisma.rackAuditLog.create({
      data: {
        rackId: id,
        action: 'DELETE',
        status: 'SUCCESS',
        message: `Rack "${existing.code}" successfully deleted (soft delete)`,
        details: JSON.stringify({
          rackCode: existing.code,
          rackType: existing.rackType,
          location: existing.location,
          deletedAt: deletedRack.deletedAt,
        }),
        performedBy: userId,
        companyId,
      },
    });

    res.json({
      message: 'Rack deleted successfully',
      rack: deletedRack,
    });
  } catch (error) {
    console.error('Delete rack error:', error);

    // Log error
    try {
      await prisma.rackAuditLog.create({
        data: {
          rackId: req.params.id,
          action: 'DELETE',
          status: 'FAILED',
          message: `Error during deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
          performedBy: req.user!.id,
          companyId: req.user!.companyId,
        },
      });
    } catch (logError) {
      console.error('Failed to log deletion error:', logError);
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit trail for a specific rack
router.get('/:id/audit', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const { limit = 50, offset = 0 } = req.query;

    // Verify rack exists
    const rack = await prisma.rack.findFirst({
      where: { id, companyId },
      select: { id: true, code: true, companyId: true },
    });

    if (!rack) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    // Get audit logs
    const auditLogs = await prisma.rackAuditLog.findMany({
      where: { rackId: id, companyId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string) || 50,
      skip: parseInt(offset as string) || 0,
    });

    // Get total count
    const totalCount = await prisma.rackAuditLog.count({
      where: { rackId: id, companyId },
    });

    // Enrich logs with user information if available
    const enrichedLogs = auditLogs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    res.json({
      rackId: id,
      rackCode: rack.code,
      totalLogs: totalCount,
      logs: enrichedLogs,
      pagination: {
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error('Get rack audit trail error:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

export default router;

