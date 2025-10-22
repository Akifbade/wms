import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get feedback for a job
router.get('/job/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const feedback = await prisma.feedback.findMany({
      where: { jobFileId: req.params.jobId },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create feedback
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { jobFileId, rating, comments } = req.body;

    if (!jobFileId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        jobFileId,
        userId: req.user.id,
        rating,
        comments,
      },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    res.status(201).json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update feedback
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comments } = req.body;

    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { rating, comments },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
