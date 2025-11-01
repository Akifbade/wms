import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/moving-jobs
 * Fetch all moving jobs for the authenticated company
 */
router.get("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const jobs = await prisma.movingJob.findMany({
      where: { companyId },
      include: {
        assignments: {
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
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching moving jobs:", error);
    res.status(500).json({ error: "Failed to fetch moving jobs." });
  }
});

/**
 * GET /api/moving-jobs/:jobId
 * Fetch a specific moving job with all related data
 */
router.get("/:jobId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;

    const job = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job." });
  }
});

/**
 * POST /api/moving-jobs
 * Create a new moving job
 */
router.post("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const {
      jobCode,
      jobTitle,
      clientName,
      clientPhone,
      clientEmail,
      jobDate,
      jobAddress,
      dropoffAddress,
      teamLeaderId,
      driverName,
      vehicleNumber,
      notes,
    } = req.body;

    // Validate required fields
    if (!jobCode || !jobTitle || !clientName || !jobDate || !jobAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newJob = await prisma.movingJob.create({
      data: {
        jobCode,
        jobTitle,
        clientName,
        clientPhone,
        clientEmail,
        jobDate: new Date(jobDate),
        jobAddress,
        dropoffAddress,
        teamLeaderId,
        driverName,
        vehicleNumber,
        notes,
        companyId,
        status: "PLANNED",
      },
    });

    res.status(201).json(newJob);
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Failed to create job." });
  }
});

/**
 * PATCH /api/moving-jobs/:jobId
 * Update a moving job
 */
router.patch("/:jobId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;
    const updateData = req.body;

    // Verify job belongs to the company
    const existingJob = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const updatedJob = await prisma.movingJob.update({
      where: { id: jobId },
      data: updateData,
    });

    res.json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Failed to update job." });
  }
});

/**
 * DELETE /api/moving-jobs/:jobId
 * Delete a moving job (soft delete - preserves history and material records)
 */
router.delete("/:jobId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;
    const userId = req.user!.id;

    // Verify job belongs to the company and get all relations
    const existingJob = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
      include: {
        assignments: true,
        materialIssues: true,
        materialReturns: true,
        costSnapshots: true,
        approvals: true,
        files: true
      }
    });

    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if any materials are still pending/active
    const activeMaterials = existingJob.materialIssues.filter((m: any) => 
      m.status !== 'RETURNED' && m.status !== 'CANCELLED'
    );

    if (activeMaterials.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete job: ${activeMaterials.length} active material issue(s) still pending. Return or cancel them first.`,
        activeMaterialsCount: activeMaterials.length
      });
    }

    // Soft delete: mark deletedAt timestamp instead of hard delete
    // This preserves all material history and audit trails
    const deletedJob = await prisma.movingJob.update({
      where: { id: jobId },
      data: { 
        deletedAt: new Date(),
        status: 'CANCELLED' // Mark status as cancelled for clarity
      },
      include: {
        materialIssues: true,
        materialReturns: true,
        costSnapshots: true
      }
    });

    console.log(`Job ${jobId} soft deleted by user ${userId} - all material history preserved`);

    res.json({ 
      message: "Job deleted successfully (archived with full history preserved)",
      job: {
        id: deletedJob.id,
        jobCode: deletedJob.jobCode,
        status: deletedJob.status,
        deletedAt: deletedJob.deletedAt,
        materialIssuesCount: deletedJob.materialIssues.length,
        materialReturnsCount: deletedJob.materialReturns.length
      }
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job." });
  }
});

export default router;
