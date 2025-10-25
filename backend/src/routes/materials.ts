import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// ==================== PACKING MATERIALS ====================

/**
 * GET /api/materials
 * List all packing materials for the company with stock info
 */
router.get("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    
    if (!companyId) {
      return res.status(400).json({ error: "Company not found" });
    }

    const materials = await prisma.packingMaterial.findMany({
      where: { companyId, isActive: true },
      include: {
        stockBatches: {
          select: { 
            id: true,
            quantityRemaining: true,
            unitCost: true,
            sellingPrice: true,
          },
          where: { quantityRemaining: { gt: 0 } }
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

/**
 * GET /api/materials/job-materials/:jobId
 * Get all materials assigned to a specific job
 */
router.get("/job-materials/:jobId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { jobId } = req.params;

    const materials = await prisma.materialIssue.findMany({
      where: { jobId, companyId },
      include: {
        material: true,
        rack: {
          select: { id: true, code: true, location: true, status: true }
        }
      },
      orderBy: { issuedAt: "desc" },
    });

    res.json(materials);
  } catch (error) {
    console.error("Error fetching job materials:", error);
    res.status(500).json({ error: "Failed to fetch job materials" });
  }
});

/**
 * GET /api/materials/available-racks
 * Get list of active racks for material storage
 */
router.get("/available-racks", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    
    if (!companyId) {
      return res.status(400).json({ error: "Company not found" });
    }

    const racks = await prisma.rack.findMany({
      where: { 
        companyId,
        status: "ACTIVE"
      },
      select: {
        id: true,
        code: true,
        location: true,
        rackType: true,
        capacityTotal: true,
        capacityUsed: true,
        status: true,
      },
      orderBy: { code: "asc" },
    });

    res.json(racks);
  } catch (error) {
    console.error("Error fetching racks:", error);
    res.status(500).json({ error: "Failed to fetch racks" });
  }
});

/**
 * POST /api/materials
 * Create a new packing material
 */
router.post("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { sku, name, description, unit, category, minStockLevel, unitCost, sellingPrice } = req.body;

    if (!sku || !name || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const material = await prisma.packingMaterial.create({
      data: {
        sku,
        name,
        description,
        unit: unit || "PCS",
        category,
        minStockLevel: minStockLevel || 0,
        unitCost: unitCost || 0,
        sellingPrice: sellingPrice || 0,
        totalQuantity: 0,
        companyId,
      },
    });

    res.status(201).json(material);
  } catch (error: any) {
    console.error("Error creating material:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "SKU already exists for this company" });
    }
    res.status(500).json({ error: "Failed to create material" });
  }
});

// ==================== STOCK BATCHES ====================

/**
 * GET /api/materials/batches
 * List all stock batches for the company
 */
router.get("/batches", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const batches = await prisma.stockBatch.findMany({
      where: { companyId },
      include: {
        material: { select: { sku: true, name: true } },
        vendor: { select: { name: true } },
      },
      orderBy: { purchaseDate: "desc" },
    });
    res.json(batches);
  } catch (error) {
    console.error("Error fetching stock batches:", error);
    res.status(500).json({ error: "Failed to fetch stock batches" });
  }
});

/**
 * POST /api/materials/batches
 * Record a new stock batch (purchase)
 */
router.post("/batches", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { materialId, vendorId, vendorName, purchaseOrder, quantityPurchased, unitCost, sellingPrice, notes } = req.body;

    if (!materialId || !quantityPurchased || !unitCost) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const batch = await prisma.stockBatch.create({
      data: {
        materialId,
        vendorId,
        vendorName: vendorName || undefined,
        purchaseOrder,
        quantityPurchased,
        quantityRemaining: quantityPurchased,
        unitCost,
        sellingPrice,
        receivedById: req.user!.id,
        notes,
        companyId,
      },
      include: { material: true },
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error("Error creating stock batch:", error);
    res.status(500).json({ error: "Failed to create stock batch" });
  }
});

// ==================== MATERIAL ISSUES ====================

/**
 * POST /api/materials/issues
 * Issue materials from stock to a job with rack selection
 */
router.post("/issues", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { jobId, materialId, stockBatchId, quantity, rackId, notes } = req.body;

    if (!jobId || !materialId || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate rack exists
    if (rackId) {
      const rack = await prisma.rack.findUnique({
        where: { id: rackId },
      });
      if (!rack) {
        return res.status(404).json({ error: "Rack not found" });
      }
    }

    // Get material and batch info for cost calculation
    const material = await prisma.packingMaterial.findUnique({ where: { id: materialId } });
    const batch = stockBatchId ? await prisma.stockBatch.findUnique({ where: { id: stockBatchId } }) : null;

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    const unitCost = batch?.unitCost || material.unitCost || 0;
    const totalCost = quantity * unitCost;

    const issue = await prisma.materialIssue.create({
      data: {
        jobId,
        materialId,
        stockBatchId,
        quantity,
        unitCost,
        totalCost,
        rackId, // Store material in specified rack
        issuedById: req.user!.id,
        notes,
        companyId,
      },
      include: { 
        material: true,
        rack: {
          select: { id: true, code: true, location: true }
        }
      },
    });

    // Deduct from remaining quantity if batch specified
    if (batch) {
      await prisma.stockBatch.update({
        where: { id: stockBatchId },
        data: { quantityRemaining: Math.max(0, batch.quantityRemaining - quantity) },
      });
    }

    // Update material total quantity
    await prisma.packingMaterial.update({
      where: { id: materialId },
      data: {
        totalQuantity: Math.max(0, (material.totalQuantity || 0) - quantity)
      }
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error creating material issue:", error);
    res.status(500).json({ error: "Failed to issue material" });
  }
});

// ==================== MATERIAL RETURNS ====================

/**
 * POST /api/materials/returns
 * Record material return after job completion with rack allocation
 */
router.post("/returns", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { jobId, materialId, issueId, quantityGood, quantityDamaged, rackId, notes } = req.body;

    if (!jobId || !materialId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const return_ = await prisma.materialReturn.create({
      data: {
        jobId,
        materialId,
        issueId,
        quantityGood: quantityGood || 0,
        quantityDamaged: quantityDamaged || 0,
        rackId, // Rack to store returned good materials
        recordedById: req.user!.id,
        notes,
        companyId,
      },
      include: { 
        material: true,
        rack: {
          select: { id: true, code: true, location: true }
        }
      },
    });

    // Auto-restock good materials to specified rack
    if (quantityGood > 0 && rackId) {
      const uniqueBatchId = `RETURN-${return_.id}`;
      await prisma.rackStockLevel.upsert({
        where: {
          materialId_rackId_stockBatchId: { materialId, rackId, stockBatchId: uniqueBatchId },
        },
        create: {
          materialId,
          rackId,
          quantity: quantityGood,
          companyId,
          stockBatchId: uniqueBatchId,
        },
        update: {
          quantity: { increment: quantityGood },
        },
      });

      // Update material total quantity
      const material = await prisma.packingMaterial.findUnique({ where: { id: materialId } });
      await prisma.packingMaterial.update({
        where: { id: materialId },
        data: {
          totalQuantity: (material?.totalQuantity || 0) + quantityGood
        }
      });

      // Mark as restocked
      await prisma.materialReturn.update({
        where: { id: return_.id },
        data: { restocked: true, restockedAt: new Date() },
      });
    }

    // Create damage record if any damaged items
    if (quantityDamaged > 0) {
      await prisma.materialDamage.create({
        data: {
          returnId: return_.id,
          materialId,
          quantity: quantityDamaged,
          recordedById: req.user!.id,
          status: "PENDING", // Requires approval
          companyId,
        },
      });
    }

    res.status(201).json(return_);
  } catch (error) {
    console.error("Error creating material return:", error);
    res.status(500).json({ error: "Failed to record material return" });
  }
});

// ==================== MATERIAL APPROVALS ====================

/**
 * GET /api/materials/approvals
 * List all material approvals for the company
 */
router.get("/approvals", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { status, approvalType } = req.query;

    const where: any = { companyId };
    if (status) where.status = status;
    if (approvalType) where.approvalType = approvalType;

    const approvals = await prisma.materialApproval.findMany({
      where,
      include: {
        job: {
          select: { id: true, jobCode: true, jobTitle: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        decisionBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    res.json(approvals);
  } catch (error) {
    console.error("Error fetching approvals:", error);
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

/**
 * POST /api/materials/approvals
 * Request approval for material return or damage
 */
router.post("/approvals", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { jobId, approvalType, subjectReturnId, subjectDamageId, notes } = req.body;

    if (!jobId || !approvalType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const approval = await prisma.materialApproval.create({
      data: {
        jobId,
        approvalType,
        status: "PENDING",
        requestedById: req.user!.id,
        subjectReturnId,
        subjectDamageId,
        companyId,
      },
    });

    res.status(201).json(approval);
  } catch (error) {
    console.error("Error creating approval:", error);
    res.status(500).json({ error: "Failed to create approval request" });
  }
});

/**
 * PATCH /api/materials/approvals/:approvalId
 * Approve or reject a material approval request
 */
router.patch("/approvals/:approvalId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { approvalId } = req.params;
    const { status, notes } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be APPROVED or REJECTED" });
    }

    const approval = await prisma.materialApproval.update({
      where: { id: approvalId },
      data: {
        status,
        decisionById: req.user!.id,
        decidedAt: new Date(),
        decisionNotes: notes,
      },
    });

    res.json(approval);
  } catch (error) {
    console.error("Error updating approval:", error);
    res.status(500).json({ error: "Failed to update approval" });
  }
});

export default router;

