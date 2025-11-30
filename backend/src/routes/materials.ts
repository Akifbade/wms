import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const router = Router();

// Configure multer for damage photo uploads
const damagePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/damages';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `damage-${uniqueSuffix}${ext}`);
  }
});

const damagePhotoUpload = multer({
  storage: damagePhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


// ==================== MATERIAL CATEGORIES ====================

/**
 * GET /api/materials/categories
 * List all material categories with hierarchy
 */
router.get("/categories", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const categories = await prisma.materialCategory.findMany({
      where: { companyId },
      include: {
        _count: { select: { materials: true } },
        children: {
          include: {
            _count: { select: { materials: true } },
          }
        }
      },
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * POST /api/materials/categories
 * Create a new material category
 */
router.post("/categories", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const category = await prisma.materialCategory.create({
      data: {
        name,
        description,
        parentId: parentId || null,
        companyId,
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// ==================== MATERIALS LIST ====================

/**
 * GET /api/materials
 * Get all materials for the company
 */
router.get("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const materials = await prisma.packingMaterial.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        materialCategory: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: "asc" },
    });

    res.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

// Old route removed. Using handleCreateReturn with multer middleware via alias routes.

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
        },
        returns: {
          include: {
            damages: true // Include damage records with photos
          },
          orderBy: { recordedAt: 'desc' }
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
    const { sku, name, description, unit, category, categoryId, minStockLevel, unitCost, sellingPrice } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: "SKU and Name are required" });
    }

    // Use categoryId if provided, otherwise use category string for backward compatibility
    const materialData: any = {
      sku,
      name,
      description,
      unit: unit || "PCS",
      category: category || "General", // Legacy field
      minStockLevel: minStockLevel || 0,
      unitCost: unitCost || 0,
      sellingPrice: sellingPrice || 0,
      totalQuantity: 0,
      companyId,
    };

    // Add categoryId if provided
    if (categoryId) {
      materialData.categoryId = categoryId;
    }

    const material = await prisma.packingMaterial.create({
      data: materialData,
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

/**
 * PUT /api/materials/:id
 * Update a packing material
 */
router.put("/:id", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    const { sku, name, description, unit, categoryId, minStockLevel, unitCost, sellingPrice, isActive } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: "SKU and Name are required" });
    }

    const material = await prisma.packingMaterial.update({
      where: { id, companyId },
      data: {
        sku,
        name,
        description,
        unit,
        categoryId,
        minStockLevel,
        unitCost,
        sellingPrice,
        isActive
      },
    });

    res.json(material);
  } catch (error: any) {
    console.error("Error updating material:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "SKU already exists for this company" });
    }
    res.status(500).json({ error: "Failed to update material" });
  }
});

/**
 * DELETE /api/materials/:id
 * Delete a packing material
 */
router.delete("/:id", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId, role } = req.user!;
    const { id } = req.params;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: "Only admins can delete materials" });
    }

    const material = await prisma.packingMaterial.findUnique({
      where: { id, companyId },
    });

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    if (material.totalQuantity > 0) {
      return res.status(400).json({ error: "Cannot delete material with existing stock" });
    }

    // Check if material has been used in transactions (optional but good practice)
    // For now, we just check stock as requested.
    // But we should probably check if there are any related records that would violate foreign keys.
    // Prisma might throw an error if we delete and there are related records.
    // Let's try to delete and catch the error.

    try {
      await prisma.packingMaterial.delete({
        where: { id },
      });
      res.json({ message: "Material deleted successfully" });
    } catch (deleteError: any) {
      if (deleteError.code === 'P2003') { // Foreign key constraint failed
        // If we can't delete, maybe we should just deactivate it?
        // But the user asked for delete.
        // If it's used in history, we can't delete it.
        return res.status(400).json({ error: "Cannot delete material because it has transaction history. Try deactivating it instead." });
      }
      throw deleteError;
    }

  } catch (error: any) {
    console.error("Error deleting material:", error);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

// ==================== STOCK BATCHES ====================

/**
 * GET /api/materials/stock/unified
 * Get ALL stock purchases from BOTH stock_batches AND purchase_order_items combined
 * This is the unified view that shows everything in one list
 */
router.get("/stock/unified", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    
    // Get stock batches (old data)
    const batches = await prisma.stockBatch.findMany({
      where: { companyId },
      include: {
        material: { select: { id: true, sku: true, name: true, unit: true } },
      },
      orderBy: { purchaseDate: "desc" },
    });
    
    // Get purchase order items (new data)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            material: { select: { id: true, sku: true, name: true, unit: true } }
          }
        },
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Normalize stock batches to unified format
    const normalizedBatches = batches.map(batch => ({
      id: batch.id,
      source: 'stock_batch' as const,
      orderNumber: batch.batchNumber || batch.purchaseOrder || 'N/A',
      invoiceNumber: batch.purchaseOrder || batch.batchNumber || 'N/A',
      vendorName: batch.vendorName || 'Unknown',
      materialId: batch.materialId,
      materialName: batch.material?.name || 'Unknown',
      materialSku: batch.material?.sku || '',
      materialUnit: batch.material?.unit || 'PCS',
      quantity: batch.quantityPurchased,
      quantityRemaining: batch.quantityRemaining,
      unitCost: batch.unitCost,
      sellingPrice: batch.sellingPrice,
      orderDate: batch.purchaseDate,
      receivedDate: batch.purchaseDate,
      status: 'RECEIVED',
      notes: batch.notes,
      createdAt: batch.createdAt
    }));
    
    // Normalize purchase order items to unified format
    const normalizedPurchases = purchaseOrders.flatMap(po =>
      po.items.map(item => ({
        id: item.id,
        source: 'purchase_order' as const,
        orderNumber: po.orderNumber,
        invoiceNumber: po.orderNumber,
        vendorName: po.vendorName || po.vendor?.name || 'Unknown',
        materialId: item.materialId,
        materialName: item.material?.name || 'Unknown',
        materialSku: item.material?.sku || '',
        materialUnit: item.material?.unit || 'PCS',
        quantity: item.quantity,
        quantityRemaining: item.quantity,
        unitCost: item.unitCost,
        sellingPrice: item.unitCost * 1.2, // Default markup
        orderDate: po.orderDate,
        receivedDate: po.receivedDate,
        status: po.status,
        notes: po.notes,
        createdAt: po.createdAt
      }))
    );
    
    // Combine and sort by date (newest first)
    const unified = [...normalizedBatches, ...normalizedPurchases]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(unified);
  } catch (error) {
    console.error("Error fetching unified stock:", error);
    res.status(500).json({ error: "Failed to fetch unified stock" });
  }
});

/**
 * GET /api/materials/stock/all
 * Get all stock batches (simplified endpoint)
 */
router.get("/stock/all", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const batches = await prisma.stockBatch.findMany({
      where: { companyId },
      include: {
        material: { select: { sku: true, name: true, unit: true } },
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
 * POST /api/materials/stock
 * Add new stock batch (simplified endpoint)
 */
router.post("/stock", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { materialId, batchNumber, quantityReceived, unitCost, sellingPrice } = req.body;

    if (!materialId || !batchNumber || !quantityReceived) {
      return res.status(400).json({ error: "Material, batch number, and quantity are required" });
    }

    // Create stock batch
    const batch = await prisma.stockBatch.create({
      data: {
        materialId,
        batchNumber,
        quantityPurchased: quantityReceived,
        quantityRemaining: quantityReceived,
        unitCost: unitCost || 0,
        sellingPrice: sellingPrice || 0,
        receivedById: userId,
        companyId,
        purchaseDate: new Date(),
      },
      include: {
        material: {
          select: { sku: true, name: true, unit: true }
        }
      },
    });

    // Update material total quantity
    await prisma.packingMaterial.update({
      where: { id: materialId },
      data: {
        totalQuantity: {
          increment: quantityReceived
        }
      }
    });

    res.status(201).json(batch);
  } catch (error: any) {
    console.error("Error creating stock batch:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Batch number already exists" });
    }
    res.status(500).json({ error: "Failed to create stock batch" });
  }
});

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
 * POST /api/materials/issue (compat alias)
 * Issue materials from stock to a job with rack selection
 */
async function handleCreateIssue(req: AuthRequest, res: any) {
  try {
    const { companyId } = req.user!;
    const { jobId, materialId, stockBatchId, quantity, rackId, notes, issueType = 'JOB', reference } = req.body;

    if (!materialId || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate Job ID if issue type is JOB
    if (issueType === 'JOB' && !jobId) {
      return res.status(400).json({ error: "Job ID is required for Job issues" });
    }

    // Validate rack exists
    if (rackId) {
      const rack = await prisma.rack.findUnique({ where: { id: rackId } });
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
        jobId: jobId || null,
        materialId,
        stockBatchId,
        quantity,
        unitCost,
        totalCost,
        rackId,
        issuedById: req.user!.id,
        notes,
        companyId,
      },
      include: {
        material: true,
        rack: { select: { id: true, code: true, location: true } },
      },
    });

    // Deduct from remaining quantity if batch specified
    if (batch) {
      await prisma.stockBatch.update({ where: { id: stockBatchId }, data: { quantityRemaining: Math.max(0, batch.quantityRemaining - quantity) } });
    }

    // Update material total quantity
    await prisma.packingMaterial.update({ where: { id: materialId }, data: { totalQuantity: Math.max(0, (material.totalQuantity || 0) - quantity) } });

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error creating material issue:", error);
    res.status(500).json({ error: "Failed to issue material" });
  }
}

router.post("/issues", authenticateToken as any, handleCreateIssue);

/**
 * GET /api/materials/issues
 * Get all material issues for the company
 */
router.get("/issues", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const issues = await prisma.materialIssue.findMany({
      where: { companyId },
      include: {
        material: true,
        job: true
      },
      orderBy: { issuedAt: 'desc' }
    });

    res.json(issues);
  } catch (error) {
    console.error("Error fetching material issues:", error);
    res.status(500).json({ error: "Failed to fetch material issues" });
  }
});

// ==================== MATERIAL RETURNS ====================

/**
 * POST /api/materials/returns
 * POST /api/materials/return (compat alias)
 * Record material return after job completion with rack allocation
 */
async function handleCreateReturn(req: AuthRequest, res: any) {
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
        rackId,
        recordedById: req.user!.id,
        notes,
        companyId,
      },
      include: {
        material: true,
        rack: { select: { id: true, code: true, location: true } }
      },
    });

    // Auto-restock good materials to specified rack
    if (quantityGood > 0 && rackId) {
      const uniqueBatchId = `RETURN-${return_.id}`;
      await prisma.rackStockLevel.upsert({
        where: { materialId_rackId_stockBatchId: { materialId, rackId, stockBatchId: uniqueBatchId } },
        create: { materialId, rackId, quantity: quantityGood, companyId, stockBatchId: uniqueBatchId },
        update: { quantity: { increment: quantityGood } },
      });

      const material = await prisma.packingMaterial.findUnique({ where: { id: materialId } });
      await prisma.packingMaterial.update({ where: { id: materialId }, data: { totalQuantity: (material?.totalQuantity || 0) + quantityGood } });

      await prisma.materialReturn.update({ where: { id: return_.id }, data: { restocked: true, restockedAt: new Date() } });
    }

    // Handle any uploaded files for damaged items
    let photoUrls: string[] = [];
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (files && Array.isArray(files)) {
      photoUrls = files.map(f => `/uploads/damages/${f.filename}`);
    }

    if (quantityDamaged > 0) {
      await prisma.materialDamage.create({
        data: {
          returnId: return_.id,
          materialId,
          quantity: quantityDamaged,
          recordedById: req.user!.id,
          status: "PENDING",
          photoUrls: photoUrls.length > 0 ? photoUrls.join(',') : null,
          companyId,
        }
      });
    }

    res.status(201).json(return_);
  } catch (error) {
    console.error("Error creating material return:", error);
    res.status(500).json({ error: "Failed to record material return" });
  }
}

router.post("/returns", authenticateToken as any, damagePhotoUpload.array('photos', 10), handleCreateReturn);

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

// ==================== MATERIAL REPORTS ====================

/**
 * GET /api/materials/reports/stock-summary
 * Get comprehensive stock summary report
 */
router.get("/reports/stock-summary", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const materials = await prisma.packingMaterial.findMany({
      where: { companyId, isActive: true },
      include: {
        materialCategory: true
      }
    });

    const summary = materials.map(material => ({
      id: material.id,
      sku: material.sku,
      name: material.name,
      category: material.materialCategory?.name || 'Uncategorized',
      unit: material.unit,
      totalQuantity: material.totalQuantity,
      minStockLevel: material.minStockLevel,
      stockStatus: material.totalQuantity < material.minStockLevel ? 'LOW' :
        material.totalQuantity === 0 ? 'OUT_OF_STOCK' : 'ADEQUATE',
      activeBatches: 0, // Deprecated
      avgUnitCost: material.unitCost || 0,
      totalValue: material.totalQuantity * (material.unitCost || 0)
    }));

    res.json({
      summary,
      totals: {
        totalMaterials: materials.length,
        lowStockItems: summary.filter(s => s.stockStatus === 'LOW').length,
        outOfStockItems: summary.filter(s => s.stockStatus === 'OUT_OF_STOCK').length,
        totalValue: summary.reduce((sum, s) => sum + s.totalValue, 0)
      }
    });
  } catch (error) {
    console.error("Error generating stock summary:", error);
    res.status(500).json({ error: "Failed to generate stock summary report" });
  }
});

/**
 * GET /api/materials/reports/low-stock
 * Get materials with low stock levels
 */
router.get("/reports/low-stock", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const lowStockMaterials = await prisma.packingMaterial.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        materialCategory: true
      },
      orderBy: { totalQuantity: 'asc' }
    });

    // Filter for low stock items
    const filtered = lowStockMaterials.filter(m => m.totalQuantity < m.minStockLevel);

    const alerts = filtered.map(material => ({
      id: material.id,
      sku: material.sku,
      name: material.name,
      category: material.materialCategory?.name || 'Uncategorized',
      currentStock: material.totalQuantity,
      minStock: material.minStockLevel,
      shortfall: material.minStockLevel - material.totalQuantity,
      unit: material.unit,
      unitCost: material.unitCost || 0,
      suggestedReorderQty: Math.max(material.minStockLevel * 2 - material.totalQuantity, 0)
    }));

    res.json({ lowStockAlerts: alerts, totalAlerts: alerts.length });
  } catch (error) {
    console.error("Error fetching low stock report:", error);
    res.status(500).json({ error: "Failed to fetch low stock report" });
  }
});

/**
 * GET /api/materials/reports/consumption
 * Get material consumption/usage report (from moving jobs)
 */
router.get("/reports/consumption", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, materialId } = req.query;

    // Query material issues that went to jobs (consumption)
    const where: any = { companyId };

    if (startDate && endDate) {
      where.issuedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (materialId) {
      where.materialId = materialId;
    }

    // Get all material issues (these represent consumption for moving jobs)
    const issues = await prisma.materialIssue.findMany({
      where,
      include: {
        material: {
          select: { id: true, sku: true, name: true, unit: true, unitCost: true }
        },
        job: {
          select: { id: true, jobCode: true, jobTitle: true }
        },
        issuedBy: {
          select: { id: true, name: true }
        },
        returns: {
          select: { quantityUsed: true, quantityDamaged: true, quantityGood: true }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    // Calculate consumption per material
    const summary: any = {};
    const consumptionRecords: any[] = [];

    for (const issue of issues) {
      const key = issue.materialId;

      // Calculate consumed quantity (issued - returned good)
      const totalReturned = issue.returns.reduce((sum: number, ret: any) => sum + (ret.quantityGood || 0), 0);
      const consumed = issue.quantity - totalReturned;
      const consumptionCost = consumed * issue.unitCost;

      if (!summary[key]) {
        summary[key] = {
          material: issue.material,
          totalQuantityConsumed: 0,
          totalConsumptionCost: 0,
          consumptionCount: 0,
          jobsAffected: new Set()
        };
      }
      summary[key].totalQuantityConsumed += consumed;
      summary[key].totalConsumptionCost += consumptionCost;
      summary[key].consumptionCount += 1;
      summary[key].jobsAffected.add(issue.jobId);

      // Add detailed record
      consumptionRecords.push({
        id: issue.id,
        materialSku: issue.material.sku,
        materialName: issue.material.name,
        materialId: issue.materialId,
        jobCode: issue.job?.jobCode || 'N/A',
        jobTitle: issue.job?.jobTitle || 'Unknown',
        quantityIssued: issue.quantity,
        quantityReturned: totalReturned,
        quantityConsumed: consumed,
        unitCost: issue.unitCost,
        consumptionCost,
        issuedDate: issue.issuedAt,
        issuedBy: issue.issuedBy?.name || 'Unknown'
      });
    }

    // Convert summary
    const summaryArray = Object.values(summary).map((item: any) => ({
      material: item.material,
      totalQuantityConsumed: item.totalQuantityConsumed,
      totalConsumptionCost: item.totalConsumptionCost,
      consumptionCount: item.consumptionCount,
      jobsAffected: item.jobsAffected.size
    }));

    res.json({
      consumptions: consumptionRecords,
      summary: summaryArray,
      totals: {
        totalMaterials: Object.keys(summary).length,
        totalQuantityConsumed: consumptionRecords.reduce((sum: number, r: any) => sum + r.quantityConsumed, 0),
        totalCost: consumptionRecords.reduce((sum: number, r: any) => sum + r.consumptionCost, 0)
      }
    });
  } catch (error) {
    console.error("Error fetching consumption report:", error);
    res.status(500).json({ error: "Failed to fetch consumption report" });
  }
});

/**
 * GET /api/materials/reports/purchase-history
 * Get purchase history report
 */
router.get("/reports/purchase-history", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, vendorId } = req.query;

    const where: any = { companyId };

    if (startDate && endDate) {
      where.purchaseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    const purchases = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        ...(startDate && endDate ? {
          orderDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        } : {}),
        ...(vendorId ? { vendorId: vendorId as string } : {})
      },
      include: {
        vendor: {
          select: { name: true, phone: true }
        },
        items: {
          include: {
            material: {
              select: { sku: true, name: true, unit: true }
            }
          }
        }
      },
      orderBy: { orderDate: 'desc' }
    });

    // Flatten items for the report
    const flattenedPurchases = purchases.flatMap(po =>
      po.items.map(item => ({
        id: item.id,
        orderNumber: po.orderNumber,
        purchaseDate: po.orderDate,
        vendorName: po.vendorName || po.vendor?.name || 'Unknown',
        materialName: item.material.name,
        sku: item.material.sku,
        quantityPurchased: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        status: po.status
      }))
    );

    const summary = {
      totalPurchases: purchases.length,
      totalQuantity: flattenedPurchases.reduce((sum, p) => sum + p.quantityPurchased, 0),
      totalAmount: flattenedPurchases.reduce((sum, p) => sum + p.totalCost, 0)
    };

    res.json({ purchases: flattenedPurchases, summary });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

/**
 * GET /api/materials/reports/vendor-performance
 * Get vendor performance report
 */
router.get("/reports/vendor-performance", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const vendors = await prisma.vendor.findMany({
      where: { companyId },
      include: {
        purchaseOrders: {
          include: {
            items: true
          }
        }
      }
    });

    const performance = vendors.map(vendor => {
      const allItems = vendor.purchaseOrders.flatMap(po => po.items);

      return {
        id: vendor.id,
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email,
        rating: vendor.rating || 0,
        totalPurchases: vendor.purchaseOrders.length,
        totalQuantitySupplied: allItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: allItems.reduce((sum, item) => sum + item.totalCost, 0),
        avgUnitCost: allItems.length > 0
          ? allItems.reduce((sum, item) => sum + item.unitCost, 0) / allItems.length
          : 0,
        lastPurchaseDate: vendor.purchaseOrders.length > 0
          ? vendor.purchaseOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())[0].orderDate
          : null
      };
    });

    res.json({ vendors: performance });
  } catch (error) {
    console.error("Error fetching vendor performance:", error);
    res.status(500).json({ error: "Failed to fetch vendor performance report" });
  }
});

/**
 * GET /api/materials/reports/movement
 * Get material movement/transfer history
 */
router.get("/reports/movement", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, materialId } = req.query;

    const where: any = { companyId };

    if (startDate && endDate) {
      where.requestedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (materialId) {
      where.materialId = materialId;
    }

    const transfers = await prisma.materialTransfer.findMany({
      where,
      include: {
        material: {
          select: { sku: true, name: true, unit: true }
        },
        fromRack: {
          select: { code: true, location: true }
        },
        toRack: {
          select: { code: true, location: true }
        },
        requestedBy: {
          select: { name: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    res.json({ transfers, totalRecords: transfers.length });
  } catch (error) {
    console.error("Error fetching movement report:", error);
    res.status(500).json({ error: "Failed to fetch movement report" });
  }
});

/**
 * GET /api/materials/reports/valuation
 * Get stock valuation report (FIFO method)
 */
router.get("/reports/valuation", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;

    const materials = await prisma.packingMaterial.findMany({
      where: { companyId, isActive: true },
      include: {
        materialCategory: true,
        stockBatches: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { purchaseDate: 'asc' } // FIFO order
        }
      }
    });

    const valuation = materials.map(material => {
      const fifoValue = material.stockBatches.reduce((sum, batch) =>
        sum + (batch.quantityRemaining * batch.unitCost), 0
      );

      return {
        id: material.id,
        sku: material.sku,
        name: material.name,
        category: material.materialCategory?.name || 'Uncategorized',
        totalQuantity: material.totalQuantity,
        fifoValue,
        avgCost: material.totalQuantity > 0 ? fifoValue / material.totalQuantity : 0,
        batches: material.stockBatches.map(b => ({
          batchNumber: b.batchNumber,
          quantity: b.quantityRemaining,
          unitCost: b.unitCost,
          value: b.quantityRemaining * b.unitCost,
          purchaseDate: b.purchaseDate
        }))
      };
    });

    const totalValuation = valuation.reduce((sum, v) => sum + v.fifoValue, 0);

    res.json({
      valuation,
      totalValue: totalValuation,
      valuationMethod: 'FIFO'
    });
  } catch (error) {
    console.error("Error generating valuation report:", error);
    res.status(500).json({ error: "Failed to generate valuation report" });
  }
});

// ==================== MATERIAL TRACKING REPORTS ====================

/**
 * GET /api/materials/reports/complete-tracking
 * Get complete tracking for all materials: WHERE they came from → WHERE they went
 */
router.get("/reports/complete-tracking", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, materialId } = req.query;

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    } : undefined;

    // Get all purchases
    const purchases = await prisma.purchaseOrder.findMany({
      where: { companyId, ...(dateFilter ? { orderDate: dateFilter } : {}) },
      include: {
        items: {
          include: { material: true }
        },
        vendor: true
      }
    });

    // Get all issues
    const issues = await prisma.materialIssue.findMany({
      where: { companyId, ...(dateFilter ? { issuedAt: dateFilter } : {}) },
      include: {
        material: true,
        job: true,
        issuedBy: true,
        returns: true
      }
    });

    // Build complete tracking map
    const trackingMap: any = {};

    // Step 1: Add purchases
    for (const po of purchases) {
      for (const item of po.items) {
        if (materialId && item.materialId !== materialId) continue;

        const key = item.materialId;
        if (!trackingMap[key]) {
          trackingMap[key] = {
            material: item.material,
            purchases: [],
            usage: [],
            totalPurchased: 0,
            totalUsed: 0,
            totalReturned: 0,
            totalDamaged: 0,
            currentStock: item.material.totalQuantity
          };
        }
        trackingMap[key].purchases.push({
          type: 'PURCHASE',
          orderNumber: po.orderNumber,
          vendor: po.vendorName || po.vendor?.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          status: po.status,
          date: po.orderDate
        });
        trackingMap[key].totalPurchased += item.quantity;
      }
    }

    // Step 2: Add issues (consumption)
    for (const issue of issues) {
      if (materialId && issue.materialId !== materialId) continue;

      const key = issue.materialId;
      if (!trackingMap[key]) {
        trackingMap[key] = {
          material: issue.material,
          purchases: [],
          usage: [],
          totalPurchased: 0,
          totalUsed: 0,
          totalReturned: 0,
          totalDamaged: 0,
          currentStock: issue.material.totalQuantity
        };
      }

      const totalReturned = issue.returns.reduce((sum: number, r: any) => sum + (r.quantityGood || 0), 0);
      const totalDamaged = issue.returns.reduce((sum: number, r: any) => sum + (r.quantityDamaged || 0), 0);
      const consumed = issue.quantity - totalReturned;

      trackingMap[key].usage.push({
        type: 'USAGE',
        jobCode: issue.job?.jobCode || 'N/A',
        jobTitle: issue.job?.jobTitle || 'Unknown',
        quantityIssued: issue.quantity,
        quantityConsumed: consumed,
        quantityReturned: totalReturned,
        quantityDamaged: totalDamaged,
        unitCost: issue.unitCost,
        issuedDate: issue.issuedAt,
        issuedBy: issue.issuedBy?.name || 'Unknown'
      });
      trackingMap[key].totalUsed += consumed;
      trackingMap[key].totalReturned += totalReturned;
      trackingMap[key].totalDamaged += totalDamaged;
    }

    res.json({
      tracking: Object.values(trackingMap),
      totals: {
        materialsTracked: Object.keys(trackingMap).length,
        totalPurchased: Object.values(trackingMap).reduce((sum: number, m: any) => sum + m.totalPurchased, 0),
        totalUsed: Object.values(trackingMap).reduce((sum: number, m: any) => sum + m.totalUsed, 0),
        totalReturned: Object.values(trackingMap).reduce((sum: number, m: any) => sum + m.totalReturned, 0),
        totalDamaged: Object.values(trackingMap).reduce((sum: number, m: any) => sum + m.totalDamaged, 0)
      }
    });
  } catch (error) {
    console.error("Error fetching complete tracking:", error);
    res.status(500).json({ error: "Failed to fetch complete tracking" });
  }
});

/**
 * GET /api/materials/:materialId/history
 * Get complete transaction history for a material
 */
router.get("/:materialId/history", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { materialId } = req.params;

    // Get material info
    const material = await prisma.packingMaterial.findFirst({
      where: { id: materialId, companyId }
    });

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    const transactions: any[] = [];
    let runningBalance = 0;

    // 1. Get all stock batches (PURCHASES)
    const batches = await prisma.stockBatch.findMany({
      where: { materialId, companyId },
      orderBy: { purchaseDate: 'asc' }
    });

    for (const batch of batches) {
      runningBalance += batch.quantityPurchased;
      transactions.push({
        id: batch.id,
        type: 'PURCHASE',
        quantity: batch.quantityPurchased,
        balanceAfter: runningBalance,
        date: batch.purchaseDate,
        details: {
          supplier: batch.vendorName || 'N/A',
          purchaseOrderNo: batch.purchaseOrder || 'N/A',
          unitCost: batch.unitCost,
          notes: batch.batchNumber ? `Batch #${batch.batchNumber}` : 'Stock purchase'
        }
      });
    }

    // 2. Get all material issues (ISSUED TO JOBS)
    const issues = await prisma.materialIssue.findMany({
      where: { materialId, companyId },
      include: {
        job: {
          select: { jobCode: true, jobTitle: true }
        },
        rack: {
          select: { code: true, location: true }
        }
      },
      orderBy: { issuedAt: 'asc' }
    });

    for (const issue of issues) {
      runningBalance -= issue.quantity;
      transactions.push({
        id: issue.id,
        type: 'ISSUE',
        quantity: issue.quantity,
        balanceAfter: runningBalance,
        date: issue.issuedAt,
        details: {
          jobCode: issue.job.jobCode,
          jobTitle: issue.job.jobTitle,
          rack: issue.rack ? `${issue.rack.code} - ${issue.rack.location}` : 'N/A',
          unitCost: issue.unitCost,
          notes: issue.notes
        }
      });
    }

    // 3. Get all returns (RETURNED FROM JOBS)
    const returns = await prisma.materialReturn.findMany({
      where: { materialId, companyId },
      include: {
        issue: {
          include: {
            job: {
              select: { jobCode: true, jobTitle: true }
            }
          }
        }
      },
      orderBy: { recordedAt: 'asc' }
    });

    for (const ret of returns) {
      if (ret.quantityGood > 0 && ret.issue) {
        runningBalance += ret.quantityGood;
        transactions.push({
          id: ret.id,
          type: 'RETURN',
          quantity: ret.quantityGood,
          balanceAfter: runningBalance,
          date: ret.recordedAt,
          details: {
            jobCode: ret.issue.job.jobCode,
            jobTitle: ret.issue.job.jobTitle,
            notes: ret.notes || 'Good condition materials returned to stock'
          }
        });
      }
    }

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate summary
    const summary = {
      currentStock: material.totalQuantity,
      totalPurchased: batches.reduce((sum: number, b: any) => sum + b.quantityPurchased, 0),
      totalIssued: issues.reduce((sum: number, i: any) => sum + i.quantity, 0),
      totalReturned: returns.reduce((sum: number, r: any) => sum + r.quantityGood, 0),
      totalDamaged: returns.reduce((sum: number, r: any) => sum + r.quantityDamaged, 0)
    };

    res.json({ transactions, summary });
  } catch (error) {
    console.error("Error fetching material history:", error);
    res.status(500).json({ error: "Failed to fetch material history" });
  }
});

// ==================== PURCHASE ORDERS ====================

/**
 * GET /api/purchase-orders
 * Get all purchase orders for the company
 */
router.get("/purchase-orders", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const purchases = await prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            material: true
          }
        },
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Flatten the response to include item details
    const flattened = purchases.flatMap(po =>
      po.items.map(item => ({
        id: item.id,
        orderNumber: po.orderNumber,
        invoiceNumber: po.orderNumber, // Using orderNumber as invoice for now
        vendorName: po.vendorName || po.vendor?.name || 'Unknown',
        vendorId: po.vendorId,
        materialId: item.materialId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        orderDate: po.orderDate,
        receivedDate: po.receivedDate,
        status: po.status,
        notes: po.notes
      }))
    );

    res.json(flattened);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

/**
 * POST /api/purchase-orders
 * Create a new purchase order
 */
router.post("/purchase-orders", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      orderNumber,
      invoiceNumber,
      vendorName,
      vendorId,
      materialId,
      quantity,
      unitCost,
      orderDate,
      receivedDate,
      status,
      notes
    } = req.body;

    if (!orderNumber || !vendorName || !materialId || !quantity || unitCost === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const totalCost = quantity * unitCost;

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Create purchase order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          vendorName,
          vendorId: vendorId || null,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          receivedDate: receivedDate ? new Date(receivedDate) : null,
          status: status || 'PENDING',
          notes: notes || null,
          totalAmount: totalCost,
          createdById: userId,
          companyId
        }
      });

      // Create purchase order item
      const item = await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          materialId,
          quantity,
          unitCost,
          totalCost,
          companyId
        },
        include: {
          material: true,
          purchaseOrder: true
        }
      });

      // If status is RECEIVED, update material stock
      if (status === 'RECEIVED') {
        await prisma.packingMaterial.update({
          where: { id: materialId },
          data: {
            totalQuantity: {
              increment: quantity
            },
            // Update unit cost to the latest cost
            unitCost: unitCost
          }
        });
      }

      return {
        id: item.id,
        orderNumber: purchaseOrder.orderNumber,
        invoiceNumber: invoiceNumber || orderNumber,
        vendorName,
        vendorId,
        materialId,
        quantity,
        unitCost,
        totalCost,
        orderDate: purchaseOrder.orderDate,
        receivedDate: purchaseOrder.receivedDate,
        status: purchaseOrder.status,
        notes
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

// ==================== MATERIAL STATEMENT (COMPREHENSIVE REPORT) ====================

/**
 * GET /api/materials/reports/material-statement
 * Get complete material statement like a bank statement
 * Shows all transactions: purchases, issues, returns, damages with running balance
 */
router.get("/reports/material-statement", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, materialId } = req.query;

    // Build date filter
    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    } : undefined;

    // Get all materials
    const materialsWhere: any = { companyId, isActive: true };
    if (materialId) {
      materialsWhere.id = materialId as string;
    }

    const materials = await prisma.packingMaterial.findMany({
      where: materialsWhere,
      include: { materialCategory: true }
    });

    // Build statement for each material
    const statements = [];

    for (const material of materials) {
      const transactions: any[] = [];

      // 1a. Get all PURCHASES from Purchase Orders (Stock IN)
      const purchaseItems = await prisma.purchaseOrderItem.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { purchaseOrder: { orderDate: dateFilter } } : {})
        },
        include: {
          purchaseOrder: {
            include: { vendor: true }
          }
        },
        orderBy: { purchaseOrder: { orderDate: 'asc' } }
      });

      for (const item of purchaseItems) {
        if (item.purchaseOrder.status === 'RECEIVED') {
          transactions.push({
            id: item.id,
            date: item.purchaseOrder.orderDate,
            type: 'PURCHASE',
            description: `Purchased from ${item.purchaseOrder.vendorName || item.purchaseOrder.vendor?.name || 'Unknown Vendor'}`,
            reference: item.purchaseOrder.orderNumber,
            referenceType: 'purchase_order',
            referenceId: item.purchaseOrder.id,
            stockIn: item.quantity,
            stockOut: 0,
            unitCost: item.unitCost,
            totalCost: item.totalCost
          });
        }
      }

      // 1b. Get all PURCHASES from Stock Batches (Stock IN)
      const stockBatches = await prisma.stockBatch.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { purchaseDate: dateFilter } : {})
        },
        include: {
          vendor: true
        },
        orderBy: { purchaseDate: 'asc' }
      });

      for (const batch of stockBatches) {
        transactions.push({
          id: batch.id,
          date: batch.purchaseDate,
          type: 'PURCHASE',
          description: `Stock: ${batch.batchNumber || 'Batch'} - ${batch.vendorName || batch.vendor?.name || 'Direct Entry'}`,
          reference: batch.batchNumber || batch.purchaseOrder || 'BATCH',
          referenceType: 'stock_batch',
          referenceId: batch.id,
          stockIn: batch.quantityPurchased,
          stockOut: 0,
          unitCost: batch.unitCost || 0,
          totalCost: (batch.quantityPurchased * (batch.unitCost || 0))
        });
      }

      // 2. Get all ISSUES (Stock OUT to jobs)
      const issues = await prisma.materialIssue.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { issuedAt: dateFilter } : {})
        },
        include: {
          job: true,
          issuedBy: true
        },
        orderBy: { issuedAt: 'asc' }
      });

      for (const issue of issues) {
        transactions.push({
          id: issue.id,
          date: issue.issuedAt,
          type: 'ISSUE',
          description: `Issued to Job: ${issue.job?.jobCode || 'N/A'} - ${issue.job?.jobTitle || 'Unknown'}`,
          reference: issue.job?.jobCode || issue.reference || 'N/A',
          referenceType: 'moving_job',
          referenceId: issue.jobId,
          stockIn: 0,
          stockOut: issue.quantity,
          unitCost: issue.unitCost,
          totalCost: issue.totalCost,
          issuedBy: issue.issuedBy?.name || 'Unknown'
        });
      }

      // 3. Get all RETURNS (Stock IN from jobs - good condition only)
      const returns = await prisma.materialReturn.findMany({
        where: {
          materialId: material.id,
          companyId,
          quantityGood: { gt: 0 },
          ...(dateFilter ? { recordedAt: dateFilter } : {})
        },
        include: {
          issue: { include: { job: true } },
          recordedBy: true
        },
        orderBy: { recordedAt: 'asc' }
      });

      for (const ret of returns) {
        if (ret.quantityGood > 0) {
          transactions.push({
            id: ret.id,
            date: ret.recordedAt,
            type: 'RETURN',
            description: `Returned from Job: ${ret.issue?.job?.jobCode || 'N/A'} (Good condition)`,
            reference: ret.issue?.job?.jobCode || 'N/A',
            referenceType: 'moving_job',
            referenceId: ret.issue?.jobId,
            stockIn: ret.quantityGood,
            stockOut: 0,
            unitCost: ret.issue?.unitCost || 0,
            totalCost: ret.quantityGood * (ret.issue?.unitCost || 0),
            recordedBy: ret.recordedBy?.name || 'Unknown'
          });
        }
      }

      // 4. Get all DAMAGES (Stock loss)
      const damages = await prisma.materialDamage.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { recordedAt: dateFilter } : {})
        },
        include: {
          return: { include: { issue: { include: { job: true } } } },
          recordedBy: true
        },
        orderBy: { recordedAt: 'asc' }
      });

      for (const damage of damages) {
        transactions.push({
          id: damage.id,
          date: damage.recordedAt,
          type: 'DAMAGE',
          description: `Damaged: ${damage.reason || 'No reason provided'}`,
          reference: damage.return?.issue?.job?.jobCode || 'N/A',
          referenceType: 'damage_report',
          referenceId: damage.id,
          stockIn: 0,
          stockOut: damage.quantity,
          unitCost: damage.return?.issue?.unitCost || material.unitCost || 0,
          totalCost: damage.quantity * (damage.return?.issue?.unitCost || material.unitCost || 0),
          recordedBy: damage.recordedBy?.name || 'Unknown',
          photoUrls: damage.photoUrls
        });
      }

      // Sort all transactions by date
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate OPENING STOCK (transactions BEFORE the date range)
      let openingStock = 0;
      if (dateFilter && dateFilter.gte) {
        // Get all purchases from purchase_order_items before start date
        const priorPurchases = await prisma.purchaseOrderItem.findMany({
          where: {
            materialId: material.id,
            companyId,
            purchaseOrder: {
              orderDate: { lt: dateFilter.gte },
              status: 'RECEIVED'
            }
          }
        });
        openingStock += priorPurchases.reduce((sum, p) => sum + p.quantity, 0);

        // Get all stock batches before start date
        const priorBatches = await prisma.stockBatch.findMany({
          where: {
            materialId: material.id,
            companyId,
            purchaseDate: { lt: dateFilter.gte }
          }
        });
        openingStock += priorBatches.reduce((sum, b) => sum + b.quantityPurchased, 0);

        // Subtract issues before start date
        const priorIssues = await prisma.materialIssue.findMany({
          where: {
            materialId: material.id,
            companyId,
            issuedAt: { lt: dateFilter.gte }
          }
        });
        openingStock -= priorIssues.reduce((sum, i) => sum + i.quantity, 0);

        // Add returns before start date
        const priorReturns = await prisma.materialReturn.findMany({
          where: {
            materialId: material.id,
            companyId,
            recordedAt: { lt: dateFilter.gte }
          }
        });
        openingStock += priorReturns.reduce((sum, r) => sum + r.quantityGood, 0);

        // Subtract damages before start date
        const priorDamages = await prisma.materialDamage.findMany({
          where: {
            materialId: material.id,
            companyId,
            recordedAt: { lt: dateFilter.gte }
          }
        });
        openingStock -= priorDamages.reduce((sum, d) => sum + d.quantity, 0);
      }

      // Calculate running balance starting from opening stock
      let runningBalance = openingStock;
      for (const txn of transactions) {
        runningBalance += txn.stockIn - txn.stockOut;
        txn.balance = runningBalance;
      }

      // Calculate totals
      const totals = {
        openingStock: openingStock,
        totalPurchased: transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.stockIn, 0),
        totalIssued: transactions.filter(t => t.type === 'ISSUE').reduce((sum, t) => sum + t.stockOut, 0),
        totalReturned: transactions.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + t.stockIn, 0),
        totalDamaged: transactions.filter(t => t.type === 'DAMAGE').reduce((sum, t) => sum + t.stockOut, 0),
        closingBalance: runningBalance,
        currentStock: material.totalQuantity,
        totalValue: material.totalQuantity * (material.unitCost || 0)
      };

      statements.push({
        material: {
          id: material.id,
          sku: material.sku,
          name: material.name,
          category: material.materialCategory?.name || material.category || 'Uncategorized',
          unit: material.unit,
          unitCost: material.unitCost || 0,
          currentStock: material.totalQuantity,
          minStockLevel: material.minStockLevel
        },
        transactions,
        totals
      });
    }

    // Overall summary
    const overallSummary = {
      totalMaterials: statements.length,
      totalOpeningStock: statements.reduce((sum, s) => sum + s.totals.openingStock, 0),
      totalPurchased: statements.reduce((sum, s) => sum + s.totals.totalPurchased, 0),
      totalIssued: statements.reduce((sum, s) => sum + s.totals.totalIssued, 0),
      totalReturned: statements.reduce((sum, s) => sum + s.totals.totalReturned, 0),
      totalDamaged: statements.reduce((sum, s) => sum + s.totals.totalDamaged, 0),
      totalClosingStock: statements.reduce((sum, s) => sum + s.totals.closingBalance, 0),
      totalValue: statements.reduce((sum, s) => sum + s.totals.totalValue, 0)
    };

    res.json({ statements, summary: overallSummary });
  } catch (error) {
    console.error("Error generating material statement:", error);
    res.status(500).json({ error: "Failed to generate material statement" });
  }
});

export default router;


