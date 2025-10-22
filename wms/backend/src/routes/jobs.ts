import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

const jobSchema = z.object({
  title: z.string().min(2),
  jobType: z.enum(['LOCAL', 'INTERNATIONAL', 'PACKING_ONLY']),
  clientName: z.string().min(2),
  clientPhone: z.string(),
  fromAddress: z.string(),
  toAddress: z.string().optional(),
  scheduledDate: z.string().transform(str => new Date(str)),
  estimatedHours: z.number().positive().optional(),
  totalCost: z.number().optional(),
});

// Get all moving jobs
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const companyId = req.user!.companyId;

    const where: any = { companyId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { clientName: { contains: search as string } },
      ];
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate as string);
      if (endDate) where.scheduledDate.lte = new Date(endDate as string);
    }

    const jobs = await prisma.movingJob.findMany({
      where,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    res.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single job
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const job = await prisma.movingJob.findFirst({
      where: { id, companyId },
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create job
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const data = jobSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const { workerIds, ...jobData } = req.body;

    const job = await prisma.movingJob.create({
      data: {
        ...jobData,
        companyId,
        scheduledDate: new Date(jobData.scheduledDate),
        status: 'SCHEDULED',
      },
    });

    // Assign workers if provided
    if (workerIds && Array.isArray(workerIds)) {
      await Promise.all(
        workerIds.map((userId: string) =>
          prisma.jobAssignment.create({
            data: {
              jobId: job.id,
              userId,
              companyId,
              role: 'HELPER',
            },
          })
        )
      );
    }

    const jobWithAssignments = await prisma.movingJob.findUnique({
      where: { id: job.id },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ job: jobWithAssignments });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update job
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const existing = await prisma.movingJob.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await prisma.movingJob.update({
      where: { id },
      data: req.body,
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json({ job });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete job
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const existing = await prisma.movingJob.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await prisma.movingJob.delete({ where: { id } });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
