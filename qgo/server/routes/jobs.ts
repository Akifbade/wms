import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Get all jobs (with filters)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, skip = '0', take = '20' } = req.query;
    
    const where: any = {};
    if (status) where.status = status;

    const jobs = await prisma.jobFile.findMany({
      where,
      skip: parseInt(skip as string),
      take: parseInt(take as string),
      include: {
        charges: true,
        createdBy: { select: { id: true, uid: true, displayName: true, email: true } },
        checkedBy: { select: { id: true, uid: true, displayName: true } },
        approvedBy: { select: { id: true, uid: true, displayName: true } },
        rejectedBy: { select: { id: true, uid: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.jobFile.count({ where });

    res.json({ jobs, total, skip: parseInt(skip as string), take: parseInt(take as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single job
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const job = await prisma.jobFile.findUnique({
      where: { id: req.params.id },
      include: {
        charges: true,
        createdBy: { select: { id: true, uid: true, displayName: true, email: true } },
        checkedBy: { select: { id: true, uid: true, displayName: true } },
        approvedBy: { select: { id: true, uid: true, displayName: true } },
        rejectedBy: { select: { id: true, uid: true, displayName: true } },
        feedback: { include: { user: { select: { id: true, displayName: true, email: true } } } },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create job
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const jobData = req.body;
    const charges = jobData.charges || [];
    delete jobData.charges;

    const job = await prisma.jobFile.create({
      data: {
        ...jobData,
        createdById: req.user.id,
        charges: {
          create: charges.map((charge: any) => ({
            l: charge.l,
            c: charge.c,
            s: charge.s,
            n: charge.n || '',
          })),
        },
      },
      include: {
        charges: true,
        createdBy: { select: { id: true, uid: true, displayName: true, email: true } },
      },
    });

    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update job
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const jobData = req.body;
    const charges = jobData.charges || [];
    delete jobData.charges;

    // Delete existing charges
    await prisma.charge.deleteMany({ where: { jobFileId: req.params.id } });

    const job = await prisma.jobFile.update({
      where: { id: req.params.id },
      data: {
        ...jobData,
        lastUpdatedBy: req.user.uid,
        charges: {
          create: charges.map((charge: any) => ({
            l: charge.l,
            c: charge.c,
            s: charge.s,
            n: charge.n || '',
          })),
        },
      },
      include: {
        charges: true,
        createdBy: { select: { id: true, uid: true, displayName: true, email: true } },
      },
    });

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check job (checker action)
router.post('/:id/check', requireRole('checker', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const job = await prisma.jobFile.update({
      where: { id: req.params.id },
      data: {
        status: 'checked',
        checkedById: req.user.id,
        checkedAt: new Date(),
      },
      include: { charges: true },
    });

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve job (admin action)
router.post('/:id/approve', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const job = await prisma.jobFile.update({
      where: { id: req.params.id },
      data: {
        status: 'approved',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: { charges: true },
    });

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject job
router.post('/:id/reject', requireRole('checker', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { reason } = req.body;

    const job = await prisma.jobFile.update({
      where: { id: req.params.id },
      data: {
        status: 'rejected',
        rejectedById: req.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason || '',
      },
      include: { charges: true },
    });

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.jobFile.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
