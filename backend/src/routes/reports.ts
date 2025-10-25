import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// ==================== JOB COST CALCULATIONS ====================

/**
 * POST /api/reports/cost-snapshot
 * Calculate and record a cost snapshot for a job
 */
router.post("/cost-snapshot", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId" });
    }

    // Get job basic info
    const job = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Calculate material costs
    const materialIssues = await prisma.materialIssue.findMany({
      where: { jobId },
    });
    const materialsCost = materialIssues.reduce((sum, issue) => sum + issue.totalCost, 0);

    // Calculate labor costs
    const assignments = await prisma.jobAssignment.findMany({
      where: { jobId },
    });
    let laborCost = 0;
    for (const assignment of assignments) {
      if (assignment.hourlyRate && assignment.hoursWorked) {
        laborCost += assignment.hourlyRate * assignment.hoursWorked;
      }
    }

    // Calculate damage loss
    const damages = await prisma.materialDamage.findMany({
      where: { return: { jobId } },
    });
    let damageLoss = 0;
    for (const damage of damages) {
      // Get material to find replacement value
      const material = await prisma.packingMaterial.findUnique({
        where: { id: damage.materialId },
      });
      if (material) {
        // Use average batch price or default
        damageLoss += damage.quantity * 10; // TODO: Get actual replacement cost
      }
    }

    // For now, assume other costs = 0
    const otherCost = 0;
    const revenue = job.clientName ? 0 : 0; // TODO: Get from invoice if exists

    // Calculate profit
    const totalCost = materialsCost + laborCost + damageLoss + otherCost;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Create or update cost snapshot
    const snapshot = await prisma.jobCostSnapshot.create({
      data: {
        jobId,
        recordedAt: new Date(),
        materialsCost,
        laborCost,
        damageLoss,
        otherCost,
        revenue,
        profit,
        profitMargin,
        currency: "KWD",
        companyId,
      },
    });

    res.status(201).json(snapshot);
  } catch (error) {
    console.error("Error creating cost snapshot:", error);
    res.status(500).json({ error: "Failed to create cost snapshot" });
  }
});

/**
 * GET /api/reports/job/:jobId/costs
 * Get all cost snapshots for a job
 */
router.get("/job/:jobId/costs", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;

    // Verify job belongs to company
    const job = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const snapshots = await prisma.jobCostSnapshot.findMany({
      where: { jobId },
      orderBy: { recordedAt: "asc" },
    });

    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching cost snapshots:", error);
    res.status(500).json({ error: "Failed to fetch cost snapshots" });
  }
});

/**
 * GET /api/reports/profitability
 * Get profitability report for company
 */
router.get("/profitability", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const snapshots = await prisma.jobCostSnapshot.findMany({
      where: { companyId },
    });

    const totalRevenue = snapshots.reduce((sum, s) => sum + s.revenue, 0);
    const totalCosts = snapshots.reduce((sum, s) => sum + (s.materialsCost + s.laborCost + s.damageLoss + s.otherCost), 0);
    const totalProfit = snapshots.reduce((sum, s) => sum + s.profit, 0);
    const avgProfitMargin = snapshots.length > 0 ? snapshots.reduce((sum, s) => sum + (s.profitMargin || 0), 0) / snapshots.length : 0;

    const breakdownByType = {
      materials: snapshots.reduce((sum, s) => sum + s.materialsCost, 0),
      labor: snapshots.reduce((sum, s) => sum + s.laborCost, 0),
      damage: snapshots.reduce((sum, s) => sum + s.damageLoss, 0),
      other: snapshots.reduce((sum, s) => sum + s.otherCost, 0),
    };

    res.json({
      totalRevenue,
      totalCosts,
      totalProfit,
      avgProfitMargin,
      jobCount: snapshots.length,
      breakdown: breakdownByType,
    });
  } catch (error) {
    console.error("Error generating profitability report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

/**
 * GET /api/reports/material-costs
 * Report on material costs by job
 */
router.get("/material-costs", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const issues = await prisma.materialIssue.findMany({
      where: { companyId },
      include: {
        job: { select: { jobCode: true, jobTitle: true } },
        material: { select: { name: true, sku: true } },
      },
    });

    const summary = issues.map((issue) => ({
      jobCode: issue.job?.jobCode,
      jobTitle: issue.job?.jobTitle,
      materialSku: issue.material?.sku,
      materialName: issue.material?.name,
      quantity: issue.quantity,
      unitCost: issue.unitCost,
      totalCost: issue.totalCost,
    }));

    res.json(summary);
  } catch (error) {
    console.error("Error generating material costs report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;

