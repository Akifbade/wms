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
    const uploadDir = 'public/uploads/damages';
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
        materialCategory: {
          select: {
            id: true,
            name: true,
          }
        },
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

// ==================== STOCK BATCHES ====================

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
        materialCategory: true,
        stockBatches: {
          where: { quantityRemaining: { gt: 0 } }
        }
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
      activeBatches: material.stockBatches.length,
      avgUnitCost: material.stockBatches.length > 0 
        ? material.stockBatches.reduce((sum, b) => sum + b.unitCost, 0) / material.stockBatches.length 
        : material.unitCost || 0,
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
        isActive: true,
        totalQuantity: {
          lt: prisma.packingMaterial.fields.minStockLevel
        }
      },
      include: {
        materialCategory: true,
        stockBatches: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { purchaseDate: 'desc' },
          take: 1
        }
      },
      orderBy: { totalQuantity: 'asc' }
    });

    const alerts = lowStockMaterials.map(material => ({
      id: material.id,
      sku: material.sku,
      name: material.name,
      category: material.materialCategory?.name || 'Uncategorized',
      currentStock: material.totalQuantity,
      minStock: material.minStockLevel,
      shortfall: material.minStockLevel - material.totalQuantity,
      unit: material.unit,
      lastPurchaseDate: material.stockBatches[0]?.purchaseDate || null,
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
 * Get material consumption/usage report
 */
router.get("/reports/consumption", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, materialId } = req.query;

    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.usedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (materialId) {
      where.materialId = materialId;
    }

    const usages = await prisma.materialUsage.findMany({
      where,
      include: {
        material: {
          select: { sku: true, name: true, unit: true }
        },
        shipment: {
          select: { name: true, referenceId: true }
        },
        usedBy: {
          select: { name: true }
        }
      },
      orderBy: { usedAt: 'desc' }
    });

    const summary = usages.reduce((acc: any, usage) => {
      const key = usage.materialId;
      if (!acc[key]) {
        acc[key] = {
          material: usage.material,
          totalQuantityUsed: 0,
          totalCost: 0,
          usageCount: 0
        };
      }
      acc[key].totalQuantityUsed += usage.quantityUsed;
      acc[key].totalCost += usage.totalCost;
      acc[key].usageCount += 1;
      return acc;
    }, {});

    res.json({
      usages,
      summary: Object.values(summary),
      totalRecords: usages.length
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

    const purchases = await prisma.stockBatch.findMany({
      where,
      include: {
        material: {
          select: { sku: true, name: true, unit: true }
        },
        vendor: {
          select: { name: true, phone: true }
        }
      },
      orderBy: { purchaseDate: 'desc' }
    });

    const summary = {
      totalPurchases: purchases.length,
      totalQuantity: purchases.reduce((sum, p) => sum + p.quantityPurchased, 0),
      totalAmount: purchases.reduce((sum, p) => sum + (p.quantityPurchased * p.unitCost), 0)
    };

    res.json({ purchases, summary });
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
        stockBatches: {
          include: {
            material: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    const performance = vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      rating: vendor.rating || 0,
      totalPurchases: vendor.stockBatches.length,
      totalQuantitySupplied: vendor.stockBatches.reduce((sum, b) => sum + b.quantityPurchased, 0),
      totalAmount: vendor.stockBatches.reduce((sum, b) => sum + (b.quantityPurchased * b.unitCost), 0),
      avgUnitCost: vendor.stockBatches.length > 0
        ? vendor.stockBatches.reduce((sum, b) => sum + b.unitCost, 0) / vendor.stockBatches.length
        : 0,
      lastPurchaseDate: vendor.stockBatches.length > 0
        ? vendor.stockBatches.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())[0].purchaseDate
        : null
    }));

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

// ==================== MOVING JOBS MATERIAL INTEGRATION ====================

/**
 * POST /api/materials/issue
 * Issue material to a moving job
 */
router.post("/issue", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { jobId, materialId, quantity, rackId, notes } = req.body;

    if (!jobId || !materialId || !quantity) {
      return res.status(400).json({ error: "jobId, materialId, and quantity are required" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    // Get material details
    const material = await prisma.packingMaterial.findUnique({
      where: { id: materialId, companyId }
    });

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Check if enough stock is available
    if (material.totalQuantity < quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock. Available: ${material.totalQuantity} ${material.unit}` 
      });
    }

    // Get the most recent stock batch for cost calculation
    const latestBatch = await prisma.stockBatch.findFirst({
      where: { 
        materialId,
        quantityRemaining: { gt: 0 }
      },
      orderBy: { purchaseDate: 'desc' }
    });

    const unitCost = latestBatch?.unitCost || 0;
    const totalCost = unitCost * quantity;

    // Create material issue record
    const issue = await prisma.materialIssue.create({
      data: {
        companyId,
        materialId,
        jobId,
        quantity,
        unitCost,
        totalCost,
        rackId: rackId || null,
        notes,
        issuedById: userId,
        issuedAt: new Date()
      },
      include: {
        material: {
          select: {
            sku: true,
            name: true,
            unit: true
          }
        },
        rack: {
          select: {
            code: true,
            location: true
          }
        }
      }
    });

    // Deduct from stock batches (FIFO)
    let remainingToDeduct = quantity;
    const batches = await prisma.stockBatch.findMany({
      where: {
        materialId,
        quantityRemaining: { gt: 0 }
      },
      orderBy: { purchaseDate: 'asc' }
    });

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const deductFromBatch = Math.min(batch.quantityRemaining, remainingToDeduct);
      
      await prisma.stockBatch.update({
        where: { id: batch.id },
        data: {
          quantityRemaining: batch.quantityRemaining - deductFromBatch
        }
      });

      remainingToDeduct -= deductFromBatch;
    }

    // Update total quantity in material
    await prisma.packingMaterial.update({
      where: { id: materialId },
      data: {
        totalQuantity: material.totalQuantity - quantity
      }
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error issuing material:", error);
    res.status(500).json({ error: "Failed to issue material" });
  }
});

/**
 * POST /api/materials/return
 * Record material return from a job
 */
router.post("/return", authenticateToken as any, damagePhotoUpload.array('photos', 10), async (req: AuthRequest, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { 
      jobId, 
      issueId, 
      damageReason, 
      notes 
    } = req.body;

    // Parse numeric values from FormData (they come as strings)
    const quantityUsed = parseInt(req.body.quantityUsed) || 0;
    const quantityGood = parseInt(req.body.quantityGood) || 0;
    const quantityDamaged = parseInt(req.body.quantityDamaged) || 0;

    if (!jobId || !issueId) {
      return res.status(400).json({ error: "jobId and issueId are required" });
    }

    // Get the issue record
    const issue = await prisma.materialIssue.findUnique({
      where: { id: issueId, companyId },
      include: { material: true }
    });

    if (!issue) {
      return res.status(404).json({ error: "Material issue record not found" });
    }

    // Validate quantities - simple check that returned + damaged doesn't exceed issued
    const totalReturn = quantityGood + quantityDamaged;
    if (totalReturn > issue.quantity) {
      return res.status(400).json({ 
        error: `Total returned (${totalReturn}) cannot exceed issued quantity (${issue.quantity})` 
      });
    }

    if (quantityDamaged > 0 && !damageReason) {
      return res.status(400).json({ 
        error: "Damage reason is required when damaged quantity > 0" 
      });
    }

    // Handle photo uploads
    let photoUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      photoUrls = req.files.map((file: any) => `/uploads/damages/${file.filename}`);
    }

    // Create material return record
    const returnRecord = await prisma.materialReturn.create({
      data: {
        companyId,
        materialId: issue.materialId,
        jobId,
        issueId,
        quantityUsed,
        quantityGood,
        quantityDamaged,
        notes,
        recordedById: userId,
        recordedAt: new Date()
      }
    });

    // Add good quantity back to stock
    if (quantityGood > 0) {
      // Find most recent batch to add back to
      const latestBatch = await prisma.stockBatch.findFirst({
        where: { materialId: issue.materialId },
        orderBy: { purchaseDate: 'desc' }
      });

      if (latestBatch) {
        await prisma.stockBatch.update({
          where: { id: latestBatch.id },
          data: {
            quantityRemaining: latestBatch.quantityRemaining + quantityGood
          }
        });
      }

      // Update total quantity
      await prisma.packingMaterial.update({
        where: { id: issue.materialId },
        data: {
          totalQuantity: issue.material.totalQuantity + quantityGood
        }
      });
    }

    // Record damaged materials
    if (quantityDamaged > 0) {
      await prisma.materialDamage.create({
        data: {
          companyId,
          returnId: returnRecord.id,
          materialId: issue.materialId,
          quantity: quantityDamaged,
          reason: damageReason || '',
          photoUrls: photoUrls.join(','),
          recordedById: userId,
          recordedAt: new Date()
        }
      });
    }

    res.status(201).json({
      message: 'Material return recorded successfully',
      return: returnRecord,
      stockUpdated: quantityGood > 0,
      damageRecorded: quantityDamaged > 0
    });
  } catch (error) {
    console.error("Error recording material return:", error);
    res.status(500).json({ error: "Failed to record material return" });
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
          supplier: batch.supplier,
          purchaseOrderNo: batch.purchaseOrderNo,
          unitCost: batch.unitCost,
          notes: `Batch #${batch.batchNumber}`
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
      if (ret.quantityGood > 0) {
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

export default router;

