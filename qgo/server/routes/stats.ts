import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get dashboard stats
router.get('/dashboard/summary', async (req: AuthRequest, res: Response) => {
  try {
    const totalJobs = await prisma.jobFile.count();
    const pendingJobs = await prisma.jobFile.count({ where: { status: 'pending' } });
    const checkedJobs = await prisma.jobFile.count({ where: { status: 'checked' } });
    const approvedJobs = await prisma.jobFile.count({ where: { status: 'approved' } });
    const rejectedJobs = await prisma.jobFile.count({ where: { status: 'rejected' } });

    const totalUsers = await prisma.user.count();
    const totalClients = await prisma.client.count();

    // Calculate totals
    const jobsData = await prisma.jobFile.aggregate({
      _sum: { totalCost: true, totalSelling: true, totalProfit: true },
    });

    res.json({
      jobs: {
        total: totalJobs,
        pending: pendingJobs,
        checked: checkedJobs,
        approved: approvedJobs,
        rejected: rejectedJobs,
      },
      totals: {
        cost: jobsData._sum.totalCost || 0,
        selling: jobsData._sum.totalSelling || 0,
        profit: jobsData._sum.totalProfit || 0,
      },
      users: totalUsers,
      clients: totalClients,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get jobs by status
router.get('/jobs/by-status', async (req: AuthRequest, res: Response) => {
  try {
    const statuses = ['pending', 'checked', 'approved', 'rejected'];
    const data = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await prisma.jobFile.count({ where: { status: status as any } }),
      }))
    );

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent activity
router.get('/activity/recent', async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.jobFile.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { displayName: true } },
      },
    });

    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
