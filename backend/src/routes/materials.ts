import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendNotification } from "../services/emailService";

const prisma = new PrismaClient();
const router = Router();

async function buildJobMaterialsSummary(companyId: string, jobId: string) {
  const issues = await prisma.materialIssue.findMany({
    where: { companyId, jobId },
    include: {
      material: { select: { name: true, unit: true } },
      returns: { select: { quantityGood: true, quantityDamaged: true } },
    },
    orderBy: { issuedAt: 'asc' },
  });

  const materials = issues.map(issue => {
    const returnedGood = (issue.returns || []).reduce((sum, r) => sum + (r.quantityGood || 0), 0);
    const damaged = (issue.returns || []).reduce((sum, r) => sum + (r.quantityDamaged || 0), 0);
    const used = Math.max(0, (issue.quantity || 0) - returnedGood - damaged);
    return {
      name: issue.material?.name || 'Unknown',
      unit: issue.material?.unit || 'pcs',
      issued: issue.quantity || 0,
      used,
      returnedGood,
      damaged,
      totalCost: issue.totalCost || 0,
    };
  });

  const totals = materials.reduce(
    (acc, m) => {
      acc.issued += m.issued;
      acc.used += m.used;
      acc.returnedGood += m.returnedGood;
      acc.damaged += m.damaged;
      acc.totalCost += m.totalCost;
      return acc;
    },
    { issued: 0, used: 0, returnedGood: 0, damaged: 0, totalCost: 0 }
  );

  return { materials, totals };
}

async function applyDeferredReturnRestock(companyId: string, jobId: string) {
  console.log(`[RESTOCK] ============ START RESTOCK FOR JOB ${jobId} ============`);

  const returns = await prisma.materialReturn.findMany({
    where: {
      companyId,
      jobId,
      restocked: false,
      quantityGood: { gt: 0 },
    },
    select: { id: true, materialId: true, rackId: true, quantityGood: true },
  });

  console.log(`[RESTOCK] Found ${returns.length} pending returns for job ${jobId}`);
  console.log(`[RESTOCK] Returns to process:`, JSON.stringify(returns, null, 2));

  for (const r of returns) {
    const qty = r.quantityGood || 0;
    console.log(`[RESTOCK] Processing return ${r.id}: qty=${qty}, materialId=${r.materialId}, rackId=${r.rackId}`);

    if (qty <= 0) {
      console.log(`[RESTOCK] Skipping return ${r.id} - quantity is 0`);
      continue;
    }

    // Get material before update
    const materialBefore = await prisma.packingMaterial.findUnique({ where: { id: r.materialId }, select: { totalQuantity: true, name: true } });
    console.log(`[RESTOCK] Material ${r.materialId} (${materialBefore?.name}) BEFORE: totalQuantity=${materialBefore?.totalQuantity}`);

    if (r.rackId) {
      const uniqueBatchId = `RETURN-${r.id}`;
      const rackBefore = await prisma.rackStockLevel.findUnique({
        where: { materialId_rackId_stockBatchId: { materialId: r.materialId, rackId: r.rackId!, stockBatchId: uniqueBatchId } },
        select: { quantity: true }
      });
      console.log(`[RESTOCK] Rack stock BEFORE: ${rackBefore?.quantity || 0}`);

      await prisma.rackStockLevel.upsert({
        where: { materialId_rackId_stockBatchId: { materialId: r.materialId, rackId: r.rackId!, stockBatchId: uniqueBatchId } },
        create: { materialId: r.materialId, rackId: r.rackId!, quantity: qty, companyId, stockBatchId: uniqueBatchId },
        update: { quantity: { increment: qty } },
      });

      const rackAfter = await prisma.rackStockLevel.findUnique({
        where: { materialId_rackId_stockBatchId: { materialId: r.materialId, rackId: r.rackId!, stockBatchId: uniqueBatchId } },
        select: { quantity: true }
      });
      console.log(`[RESTOCK] Rack stock AFTER: ${rackAfter?.quantity}`);
      console.log(`[RESTOCK] ✅ Restocked return ${r.id} material ${r.materialId} qty ${qty} -> rack ${r.rackId}`);
    } else {
      console.warn(`[RESTOCK] ⚠️ Return ${r.id} has no rackId. Incrementing only totalQuantity.`);
    }

    await prisma.packingMaterial.update({
      where: { id: r.materialId },
      data: { totalQuantity: { increment: qty } },
    });

    const materialAfter = await prisma.packingMaterial.findUnique({ where: { id: r.materialId }, select: { totalQuantity: true } });
    console.log(`[RESTOCK] Material ${r.materialId} AFTER: totalQuantity=${materialAfter?.totalQuantity}`);

    await prisma.materialReturn.update({
      where: { id: r.id },
      data: { restocked: true, restockedAt: new Date() },
    });
    console.log(`[RESTOCK] ✅ Marked return ${r.id} as restocked`);
  }

  console.log(`[RESTOCK] ============ END RESTOCK - Processed ${returns.length} returns ============`);
  return { restockedCount: returns.length };
}

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = ['uploads', 'uploads/physical-reports', 'uploads/damages'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Materials] Created directory: ${dir}`);
    } else {
      console.log(`[Materials] Directory already exists: ${dir}`);
    }
  });
};
ensureUploadDirs();

// Configure multer for damage photo uploads
const damagePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Simple relative paths - Express will serve from process.cwd()/uploads
    const uploadDir = file.fieldname === 'physicalReport' ? 'uploads/physical-reports' : 'uploads/damages';
    console.log(`[Materials] Destination for ${file.fieldname}: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'physicalReport' ? 'REPORT' : 'damage';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

const damagePhotoUpload = multer({
  storage: damagePhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /jpeg|jpg|png|gif|webp|pdf|application\/pdf/.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
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
          }
        }
      },
      orderBy: { issuedAt: "desc" },
    });

    // Sort returns client-side to avoid Prisma nested orderBy issues
    const materialsWithSortedReturns = materials.map(material => ({
      ...material,
      returns: material.returns.sort((a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      )
    }));

    res.json(materialsWithSortedReturns);
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
router.put("/:id", authenticateToken as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
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
router.delete("/:id", authenticateToken as any, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

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

    // Combine and sort by ORDER DATE (newest purchase first)
    const unified = [...normalizedBatches, ...normalizedPurchases]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

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
 * Add new stock batch (SIMPLE DIRECT ENTRY - immediately adds to stock)
 * This is the ONLY way to add stock - no pending/approval workflow
 */
router.post("/stock", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { materialId, batchNumber, quantityReceived, unitCost, sellingPrice, vendorName, notes } = req.body;

    if (!materialId || !batchNumber || !quantityReceived) {
      return res.status(400).json({ error: "Material, batch/invoice number, and quantity are required" });
    }

    // Create stock batch - IMMEDIATELY adds to stock
    const batch = await prisma.stockBatch.create({
      data: {
        materialId,
        batchNumber,
        vendorName: vendorName || 'Direct Entry',
        quantityPurchased: quantityReceived,
        quantityRemaining: quantityReceived,
        unitCost: unitCost || 0,
        sellingPrice: sellingPrice || 0,
        receivedById: userId,
        notes: notes || null,
        companyId,
        purchaseDate: new Date(),
      },
      include: {
        material: {
          select: { sku: true, name: true, unit: true, totalQuantity: true }
        }
      },
    });

    // Update material total quantity - IMMEDIATELY
    const updatedMaterial = await prisma.packingMaterial.update({
      where: { id: materialId },
      data: {
        totalQuantity: {
          increment: quantityReceived
        },
        // Update unit cost to latest
        unitCost: unitCost || undefined
      }
    });

    console.log(`[STOCK] Added ${quantityReceived} to ${batch.material?.name}. New total: ${updatedMaterial.totalQuantity}`);

    res.status(201).json({
      ...batch,
      newTotalQuantity: updatedMaterial.totalQuantity,
      message: `Successfully added ${quantityReceived} ${batch.material?.unit || 'units'} to stock`
    });
  } catch (error: any) {
    console.error("Error creating stock batch:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Batch/Invoice number already exists. Use a unique number." });
    }
    res.status(500).json({ error: "Failed to add stock" });
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

    // Check if sufficient stock is available - PREVENT NEGATIVE STOCK
    const availableStock = material.totalQuantity || 0;
    if (quantity > availableStock) {
      return res.status(400).json({ 
        error: `Insufficient stock. Available: ${availableStock} ${material.unit || 'pcs'}, Requested: ${quantity}`,
        availableStock,
        requestedQuantity: quantity
      });
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

    // Send email notification for material issued
    try {
      const job = jobId ? await prisma.movingJob.findUnique({ where: { id: jobId } }) : null;
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const issuedBy = await prisma.user.findUnique({ where: { id: req.user!.id } });

      await sendNotification(companyId, 'MATERIAL_ISSUED', {
        jobCode: job?.jobCode || reference || 'Direct Issue',
        materials: [{ name: material.name, quantity, unit: material.unit || 'pcs' }],
        issuedBy: issuedBy?.name || 'System',
        issuedAt: new Date().toLocaleString(),
        companyName: company?.name || 'WMS',
      });
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
    }

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error creating material issue:", error);
    res.status(500).json({ error: "Failed to issue material" });
  }
}

/**
 * POST /api/materials/issues/batch
 * Batch issue materials — issue multiple materials in one request
 * Body: { issues: [{ materialId, quantity, rackId?, notes?, stockBatchId? }] }
 */
async function handleBatchCreateIssues(req: AuthRequest, res: any) {
  try {
    const { companyId } = req.user!;
    const { issues } = req.body;

    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: "issues array is required and must not be empty" });
    }

    // Validate fields & check stock before creating any
    for (const [idx, item] of issues.entries()) {
      if (!item.materialId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: `Issue #${idx + 1}: materialId and quantity > 0 are required` });
      }
      const material = await prisma.packingMaterial.findUnique({ where: { id: item.materialId } });
      if (!material) {
        return res.status(404).json({ error: `Issue #${idx + 1}: Material not found (${item.materialId})` });
      }
      const availableStock = material.totalQuantity || 0;
      if (item.quantity > availableStock) {
        return res.status(400).json({
          error: `Issue #${idx + 1}: Insufficient stock for "${material.name}". Available: ${availableStock} ${material.unit || 'pcs'}, Requested: ${item.quantity}`,
          materialIndex: idx,
          availableStock,
          requestedQuantity: item.quantity,
        });
      }
      if (item.rackId) {
        const rack = await prisma.rack.findUnique({ where: { id: item.rackId } });
        if (!rack) {
          return res.status(404).json({ error: `Issue #${idx + 1}: Rack not found (${item.rackId})` });
        }
      }
    }

    const jobId = req.body.jobId || null;
    const createdIssues = [];

    for (const item of issues) {
      const batch = item.stockBatchId ? await prisma.stockBatch.findUnique({ where: { id: item.stockBatchId } }) : null;
      const material = await prisma.packingMaterial.findUnique({ where: { id: item.materialId } });
      const unitCost = batch?.unitCost || material?.unitCost || 0;
      const totalCost = item.quantity * unitCost;

      const issue = await prisma.materialIssue.create({
        data: {
          jobId,
          materialId: item.materialId,
          stockBatchId: item.stockBatchId || null,
          quantity: item.quantity,
          unitCost,
          totalCost,
          rackId: item.rackId || null,
          issuedById: req.user!.id,
          notes: item.notes || null,
          companyId,
        },
        include: {
          material: true,
          rack: { select: { id: true, code: true, location: true } },
        },
      });

      // Deduct from batch if specified
      if (batch) {
        await prisma.stockBatch.update({
          where: { id: item.stockBatchId },
          data: { quantityRemaining: Math.max(0, batch.quantityRemaining - item.quantity) },
        });
      }

      // Update material total quantity
      await prisma.packingMaterial.update({
        where: { id: item.materialId },
        data: { totalQuantity: Math.max(0, (material!.totalQuantity || 0) - item.quantity) },
      });

      createdIssues.push(issue);
    }

    // Send a single consolidated email notification
    try {
      const job = jobId ? await prisma.movingJob.findUnique({ where: { id: jobId } }) : null;
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const issuedBy = await prisma.user.findUnique({ where: { id: req.user!.id } });

      const materialsSummary = createdIssues.map(i => ({
        name: (i as any).material?.name || 'Unknown',
        quantity: i.quantity,
        unit: (i as any).material?.unit || 'pcs',
      }));

      await sendNotification(companyId, 'MATERIAL_ISSUED', {
        jobCode: job?.jobCode || 'Batch Issue',
        materials: materialsSummary,
        issuedBy: issuedBy?.name || 'System',
        issuedAt: new Date().toLocaleString(),
        companyName: company?.name || 'WMS',
      });
    } catch (emailErr) {
      console.error('Batch email notification error:', emailErr);
    }

    res.status(201).json({ issues: createdIssues, count: createdIssues.length });
  } catch (error) {
    console.error("Error batch issuing materials:", error);
    res.status(500).json({ error: "Failed to batch issue materials" });
  }
}

router.post("/issues/batch", authenticateToken as any, handleBatchCreateIssues);
router.post("/issues", authenticateToken as any, handleCreateIssue);

/**
 * GET /api/materials/issues/history
 * Get material issue history (edits and deletions)
 * NOTE: This route MUST come before /issues/:id to prevent 'history' being treated as an ID
 */
router.get("/issues/history", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;

    const whereClause: any = { companyId };
    if (startDate && endDate) {
      // Parse range. Check if it's already ISO format or just date
      const startStr = String(startDate).replace(/['"]/g, '');
      const endStr = String(endDate).replace(/['"]/g, '');

      console.log(`Parsing dates - Start: "${startStr}", End: "${endStr}"`);

      let start = new Date(startStr);
      if (isNaN(start.getTime()) && !startStr.includes('T')) {
        start = new Date(`${startStr}T00:00:00.000Z`);
      }

      let end = new Date(endStr);
      if (isNaN(end.getTime()) && !endStr.includes('T')) {
        end = new Date(`${endStr}T23:59:59.999Z`);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid Date parsed:', { startStr, endStr });
        // Fallback to current date range if invalid
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        end = new Date();
      }

      whereClause.performedAt = { gte: start, lte: end };
    }

    console.log(`Getting history for company ${companyId} - startDate: ${startDate}, endDate: ${endDate}`);
    console.log('Where clause:', JSON.stringify(whereClause));
    const history = await prisma.materialIssueHistory.findMany({
      where: whereClause,
      include: {
        material: { select: { name: true, sku: true, unit: true } },
        performedBy: { select: { name: true, email: true } }
      },
      orderBy: { performedAt: 'desc' }
    });

    console.log(`Found ${history.length} history entries for company ${companyId}`);
    res.json(history);
  } catch (error) {
    console.error("Error fetching material issue history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Debug route (DO NOT expose in production) - allow fetching history by companyId supplied in query for debugging purposes
router.get("/issues/debug/company", async (req: Request, res: Response) => {
  try {
    const { companyId, startDate, endDate } = req.query as any;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const whereClause: any = { companyId };
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const endNextDay = new Date(`${endDate}T00:00:00.000Z`);
      endNextDay.setUTCDate(endNextDay.getUTCDate() + 1);
      whereClause.performedAt = { gte: start, lt: endNextDay };
    }

    const history = await prisma.materialIssueHistory.findMany({ where: whereClause, orderBy: { performedAt: 'desc' } });
    res.json(history);
  } catch (error) {
    console.error('Debug history error', error);
    res.status(500).json({ error: 'Failed to fetch debug history' });
  }
});

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

/**
 * PUT /api/materials/issues/:id
 * Edit a material issue (only if not returned)
 */
router.put("/issues/:id", authenticateToken as any, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { id } = req.params;
    const { quantity, notes, reason } = req.body;

    // Get the existing issue with material info
    const existingIssue = await prisma.materialIssue.findFirst({
      where: { id, companyId },
      include: {
        material: true,
        rack: true,
        returns: true
      }
    });

    if (!existingIssue) {
      return res.status(404).json({ error: "Material issue not found" });
    }

    // Check if already returned
    if (existingIssue.returns && existingIssue.returns.length > 0) {
      return res.status(400).json({ error: "Cannot edit - material has already been returned" });
    }

    const previousQty = existingIssue.quantity;
    const newQuantity = quantity || previousQty;
    const qtyDifference = newQuantity - previousQty;

    // Calculate new total cost
    const newTotalCost = newQuantity * existingIssue.unitCost;

    // Update material stock (restore old quantity, deduct new quantity)
    const material = await prisma.packingMaterial.findUnique({ where: { id: existingIssue.materialId } });
    if (material) {
      const newStock = (material.totalQuantity || 0) + previousQty - newQuantity;
      if (newStock < 0) {
        return res.status(400).json({ error: `Insufficient stock. Available: ${(material.totalQuantity || 0) + previousQty}` });
      }
      await prisma.packingMaterial.update({
        where: { id: existingIssue.materialId },
        data: { totalQuantity: newStock }
      });
    }

    // Create history record for the edit
    await prisma.materialIssueHistory.create({
      data: {
        issueId: id,
        action: 'EDITED',
        jobId: existingIssue.jobId,
        materialId: existingIssue.materialId,
        materialName: existingIssue.material.name,
        materialSku: existingIssue.material.sku,
        quantity: newQuantity,
        previousQty: previousQty,
        unitCost: existingIssue.unitCost,
        totalCost: newTotalCost,
        rackId: existingIssue.rackId,
        rackCode: existingIssue.rack?.code || null,
        notes: notes || existingIssue.notes,
        reason: reason || 'Quantity updated',
        performedById: userId,
        companyId
      }
    });

    // Update the issue
    const updatedIssue = await prisma.materialIssue.update({
      where: { id },
      data: {
        quantity: newQuantity,
        totalCost: newTotalCost,
        notes: notes || existingIssue.notes
      },
      include: {
        material: true,
        rack: true
      }
    });

    res.json(updatedIssue);
  } catch (error) {
    console.error("Error updating material issue:", error);
    res.status(500).json({ error: "Failed to update material issue" });
  }
});

/**
 * DELETE /api/materials/issues/:id
 * Delete a material issue (restores stock, keeps history)
 */
router.delete("/issues/:id", authenticateToken as any, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    // Get the existing issue with material info
    const existingIssue = await prisma.materialIssue.findFirst({
      where: { id, companyId },
      include: {
        material: true,
        rack: true,
        returns: true
      }
    });

    if (!existingIssue) {
      return res.status(404).json({ error: "Material issue not found" });
    }

    // Check if already returned
    if (existingIssue.returns && existingIssue.returns.length > 0) {
      return res.status(400).json({ error: "Cannot delete - material has already been returned" });
    }

    // Create history record BEFORE deletion
    await prisma.materialIssueHistory.create({
      data: {
        issueId: null, // Will be null after deletion
        action: 'DELETED',
        jobId: existingIssue.jobId,
        materialId: existingIssue.materialId,
        materialName: existingIssue.material.name,
        materialSku: existingIssue.material.sku,
        quantity: existingIssue.quantity,
        previousQty: null,
        unitCost: existingIssue.unitCost,
        totalCost: existingIssue.totalCost,
        rackId: existingIssue.rackId,
        rackCode: existingIssue.rack?.code || null,
        notes: existingIssue.notes,
        reason: reason || 'Issue deleted',
        performedById: userId,
        companyId
      }
    });

    // Restore the material stock
    const material = await prisma.packingMaterial.findUnique({ where: { id: existingIssue.materialId } });
    if (material) {
      await prisma.packingMaterial.update({
        where: { id: existingIssue.materialId },
        data: { totalQuantity: (material.totalQuantity || 0) + existingIssue.quantity }
      });
    }

    // Delete the issue
    await prisma.materialIssue.delete({ where: { id } });

    res.json({ success: true, message: "Material issue deleted and stock restored" });
  } catch (error) {
    console.error("Error deleting material issue:", error);
    res.status(500).json({ error: "Failed to delete material issue" });
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

    console.log('\n[Materials] ====== START HANDLE CREATE RETURN ======');
    console.log('[Materials] Request body:', { jobId, materialId, issueId, quantityGood, quantityDamaged, rackId });

    if (!jobId || !materialId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parse quantities as integers (FormData sends strings)
    const parsedQuantityGood = parseInt(quantityGood) || 0;
    const parsedQuantityDamaged = parseInt(quantityDamaged) || 0;

    const job = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
      select: { id: true, status: true, jobCode: true },
    });

    // If job has pending approval, defer restock until approval
    const pendingJobCompletionApproval = await prisma.materialApproval.findFirst({
      where: {
        companyId,
        jobId,
        approvalType: 'JOB_COMPLETION_REPORT',
        status: 'PENDING',
      },
      select: { id: true },
    });
    // ALWAYS defer restock if there's a pending approval (job can be PENDING_APPROVAL or COMPLETED)
    const shouldDeferRestock = Boolean(pendingJobCompletionApproval);

    // Calculate quantityUsed: what was issued minus what was returned/damaged
    let calculatedQuantityUsed: number | undefined = undefined;
    if (issueId) {
      const materialIssue = await prisma.materialIssue.findUnique({
        where: { id: issueId },
        select: { quantity: true }
      });
      if (materialIssue) {
        calculatedQuantityUsed = Math.max(0, materialIssue.quantity - (parsedQuantityGood + parsedQuantityDamaged));
      }
    }

    const return_ = await prisma.materialReturn.create({
      data: {
        jobId,
        materialId,
        issueId,
        quantityUsed: calculatedQuantityUsed,
        quantityGood: parsedQuantityGood,
        quantityDamaged: parsedQuantityDamaged,
        rackId,
        recordedById: req.user!.id,
        notes,
        companyId,
        physicalReportUrl: null, // Will be set when file is uploaded
      },
      include: {
        material: true,
        rack: { select: { id: true, code: true, location: true } }
      },
    });

    // Don't restock immediately - wait for approval
    // Restock will happen in approval endpoint when manager approves
    // (All returns now require approval before restocking)

    // Handle uploaded files
    const uploadedFiles = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    console.log('[Materials] ====== FILE UPLOAD DEBUG START ======');
    console.log('[Materials] req.files keys:', uploadedFiles ? Object.keys(uploadedFiles) : 'UNDEFINED');
    console.log('[Materials] Has physicalReport?:', Boolean(uploadedFiles?.physicalReport));
    console.log('[Materials] PhysicalReport count:', uploadedFiles?.physicalReport?.length || 0);
    console.log('[Materials] Photos count:', uploadedFiles?.photos?.length || 0);
    if (uploadedFiles?.physicalReport) {
      uploadedFiles.physicalReport.forEach((f, i) => {
        console.log(`[Materials] PhysicalReport[${i}]: filename=${f.filename}, size=${f.size}, path=${f.path}, fieldname=${f.fieldname}`);
      });
    }
    console.log('[Materials] ====== FILE UPLOAD DEBUG END ======');

    // Handle physical report file (direct upload)
    let physicalReportUrl: string | null = null;
    if (uploadedFiles?.physicalReport && uploadedFiles.physicalReport.length > 0) {
      const physicalFile = uploadedFiles.physicalReport[0];
      physicalReportUrl = `/uploads/physical-reports/${physicalFile.filename}`;
      console.log('[Materials] ✅ PHYSICAL REPORT SAVED WITH URL:', physicalReportUrl);

      // Update the return with the physical report URL
      const updated = await prisma.materialReturn.update({
        where: { id: return_.id },
        data: { physicalReportUrl }
      });
      console.log('[Materials] ✅ Updated return record with physicalReportUrl:', updated.physicalReportUrl);
    } else {
      console.log('[Materials] ❌ NO PHYSICAL REPORT FILES RECEIVED');
    }

    // Handle damage photos
    let photoUrls: string[] = [];
    if (uploadedFiles?.photos && uploadedFiles.photos.length > 0) {
      photoUrls = uploadedFiles.photos.map(f => `/uploads/damages/${f.filename}`);
    }

    if (parsedQuantityDamaged > 0) {
      await prisma.materialDamage.create({
        data: {
          returnId: return_.id,
          materialId,
          quantity: parsedQuantityDamaged,
          recordedById: req.user!.id,
          status: "PENDING",
          photoUrls: photoUrls.length > 0 ? photoUrls.join(',') : null,
          companyId,
        }
      });

      // Send damage notification
      try {
        const job = await prisma.movingJob.findUnique({ where: { id: jobId } });
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        const reportedBy = await prisma.user.findUnique({ where: { id: req.user!.id } });

        await sendNotification(companyId, 'MATERIAL_DAMAGED', {
          jobCode: job?.jobCode || 'Unknown',
          materials: [{ name: return_.material.name, quantity: parsedQuantityDamaged, damageType: 'General Damage', cost: 0 }],
          reportedBy: reportedBy?.name || 'System',
          reportedAt: new Date().toLocaleString(),
          totalDamageCost: 0,
          currency: company?.currency || 'KWD',
          companyName: company?.name || 'WMS',
        });
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
      }
    }

    // Send return notification
    try {
      const jobFull = await prisma.movingJob.findUnique({ where: { id: jobId } });
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const returnedBy = await prisma.user.findUnique({ where: { id: req.user!.id } });

      await sendNotification(companyId, 'MATERIAL_RETURNED', {
        jobCode: jobFull?.jobCode || job?.jobCode || 'Unknown',
        materials: [{
          name: return_.material.name,
          quantity: parsedQuantityGood + parsedQuantityDamaged,
          unit: return_.material.unit || 'pcs',
          condition: parsedQuantityDamaged > 0 ? `${parsedQuantityGood} Good, ${parsedQuantityDamaged} Damaged` : 'Good'
        }],
        returnedBy: returnedBy?.name || 'System',
        returnedAt: new Date().toLocaleString(),
        companyName: company?.name || 'WMS',
      });
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
    }

    res.status(201).json({
      ...return_,
      physicalReportUrl,
      restockDeferred: shouldDeferRestock,
      pendingApprovalId: pendingJobCompletionApproval?.id || null
    });
  } catch (error) {
    console.error("Error creating material return:", error);
    res.status(500).json({ error: "Failed to record material return" });
  }
}

// Use .fields() to accept both damage photos and physical report
const returnUploadFields = damagePhotoUpload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'physicalReport', maxCount: 1 }
]);

router.post("/returns", authenticateToken as any, returnUploadFields, handleCreateReturn);

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
 * GET /api/materials/approvals/:approvalId
 * Get a single approval with optional job-completion materials summary
 */
router.get("/approvals/:approvalId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { approvalId } = req.params;

    const approval = await prisma.materialApproval.findFirst({
      where: { id: approvalId, companyId },
      include: {
        job: { select: { id: true, jobCode: true, jobTitle: true, clientName: true, status: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        decisionBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    if (approval.approvalType === 'JOB_COMPLETION_REPORT') {
      const summary = await buildJobMaterialsSummary(companyId, approval.jobId);

      // Get physical report URLs from material returns
      const materialReturns = await prisma.materialReturn.findMany({
        where: { jobId: approval.jobId, companyId, physicalReportUrl: { not: null } },
        select: { physicalReportUrl: true, id: true }
      });

      const physicalReports = materialReturns
        .map(r => r.physicalReportUrl)
        .filter((url): url is string => Boolean(url));

      // Return relative URLs so the browser can resolve via the current origin.
      // (Using req.get('host') can leak Docker-internal hostnames like wms-backend:5000.)
      return res.json({ approval, ...summary, physicalReports });
    }

    return res.json({ approval });
  } catch (error) {
    console.error('Error fetching approval:', error);
    res.status(500).json({ error: 'Failed to fetch approval' });
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
    const { companyId } = req.user!;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be APPROVED or REJECTED" });
    }

    const existingApproval = await prisma.materialApproval.findFirst({
      where: { id: approvalId, companyId },
    });

    if (!existingApproval) {
      return res.status(404).json({ error: "Approval not found" });
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

    // If this is a job completion report approval, send the completion email AFTER approval
    if (status === 'APPROVED' && existingApproval.approvalType === 'JOB_COMPLETION_REPORT') {
      try {
        // Apply any deferred restock from returns recorded while approval was pending
        const restockResult = await applyDeferredReturnRestock(companyId, existingApproval.jobId);
        console.log(`[RESTOCK] Approval ${approvalId} -> restocked ${restockResult.restockedCount} returns`);

        const job = await prisma.movingJob.findFirst({
          where: { id: existingApproval.jobId, companyId },
        });

        if (job) {
          // Update job status to COMPLETED now that it's approved
          await prisma.movingJob.update({
            where: { id: job.id },
            data: { status: 'COMPLETED' },
          });

          const company = await prisma.company.findUnique({ where: { id: companyId } });

          const { materials, totals } = await buildJobMaterialsSummary(companyId, job.id);

          await sendNotification(companyId, 'MOVING_JOB_COMPLETED', {
            jobCode: job.jobCode,
            customerName: job.clientName,
            completedAt: approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : new Date().toLocaleString(),
            totalAmount: (job as any).totalCost || totals.totalCost || 0,
            currency: company?.currency || 'KWD',
            companyName: company?.name || 'WMS',
            approvedBy: req.user?.name || req.user?.email || 'Unknown Approver',
            approvalNotes: notes || '',
            materials,
            totals,
          });
        }
      } catch (emailErr) {
        console.error('Error sending MOVING_JOB_COMPLETED after approval:', emailErr);
      }
    }

    // If this is a job completion report REJECTION, notify job creator and reset job status
    if (status === 'REJECTED' && existingApproval.approvalType === 'JOB_COMPLETION_REPORT') {
      try {
        const job = await prisma.movingJob.findFirst({
          where: { id: existingApproval.jobId, companyId },
          include: {
            teamLeader: { select: { name: true, email: true } },
          },
        });

        if (job) {
          const company = await prisma.company.findUnique({ where: { id: companyId } });
          const { materials, totals } = await buildJobMaterialsSummary(companyId, job.id);

          // Save materials snapshot for comparison on resubmit
          const materialsSnapshot = JSON.stringify({
            materials,
            totals,
            rejectedAt: new Date().toISOString(),
            rejectedBy: req.user?.name || req.user?.email || 'Unknown User',
            rejectionReason: notes || 'No reason provided'
          });

          // Update approval with snapshot and increment rejection count
          await prisma.materialApproval.update({
            where: { id: approvalId },
            data: {
              previousMaterialsSnapshot: materialsSnapshot,
              rejectionCount: { increment: 1 }
            }
          });

          // Reset job status to IN_PROGRESS so they can re-work and re-submit
          await prisma.movingJob.update({
            where: { id: job.id },
            data: { status: 'IN_PROGRESS' },
          });

          // Send rejection notification to job creator/team leader
          await sendNotification(companyId, 'JOB_COMPLETION_REJECTED', {
            jobCode: job.jobCode,
            customerName: job.clientName,
            rejectedBy: req.user?.name || req.user?.email || 'Unknown Rejector',
            rejectedAt: approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : new Date().toLocaleString(),
            rejectionReason: notes || 'No reason provided',
            companyName: company?.name || 'WMS',
            materials,
            totals,
          });
        }
      } catch (emailErr) {
        console.error('Error sending JOB_COMPLETION_REJECTED notification:', emailErr);
      }
    }

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

    // 1. Get all stock batches (PURCHASES)
    const batches = await prisma.stockBatch.findMany({
      where: { materialId, companyId },
      orderBy: { purchaseDate: 'asc' }
    });

    for (const batch of batches) {
      transactions.push({
        id: batch.id,
        type: 'PURCHASE',
        quantity: batch.quantityPurchased,
        balanceAfter: 0, // Will calculate after sorting
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
      transactions.push({
        id: issue.id,
        type: 'ISSUE',
        quantity: issue.quantity,
        balanceAfter: 0, // Will calculate after sorting
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
        const isRestocked = ret.restocked === true;
        transactions.push({
          id: ret.id,
          type: isRestocked ? 'RETURN' : 'RETURN_PENDING_APPROVAL',
          quantity: ret.quantityGood,
          balanceAfter: 0, // Will calculate after sorting
          date: ret.recordedAt,
          details: {
            jobCode: ret.issue.job.jobCode,
            jobTitle: ret.issue.job.jobTitle,
            notes: isRestocked 
              ? (ret.notes || 'Good condition materials returned to stock')
              : '🕒 WAITING FOR APPROVAL - Not yet added to stock',
            isPending: !isRestocked
          }
        });
      }
    }

    // Sort all transactions by date FIRST
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // NOW calculate running balance in correct chronological order
    let runningBalance = 0;
    for (const txn of transactions) {
      if (txn.type === 'PURCHASE') {
        runningBalance += txn.quantity;
      } else if (txn.type === 'ISSUE') {
        runningBalance -= txn.quantity;
      } else if (txn.type === 'RETURN') {
        runningBalance += txn.quantity;
      }
      // RETURN_PENDING_APPROVAL does NOT affect balance yet
      txn.balanceAfter = runningBalance;
    }

    // Calculate summary - only count restocked returns
    const restockedReturns = returns.filter((r: any) => r.restocked === true);
    const pendingReturns = returns.filter((r: any) => r.restocked === false);
    const summary = {
      currentStock: material.totalQuantity,
      totalPurchased: batches.reduce((sum: number, b: any) => sum + b.quantityPurchased, 0),
      totalIssued: issues.reduce((sum: number, i: any) => sum + i.quantity, 0),
      totalReturned: restockedReturns.reduce((sum: number, r: any) => sum + r.quantityGood, 0),
      totalDamaged: returns.reduce((sum: number, r: any) => sum + r.quantityDamaged, 0),
      pendingReturns: pendingReturns.reduce((sum: number, r: any) => sum + r.quantityGood, 0)
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

    if (!vendorName || !materialId || !quantity || unitCost === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const totalCost = quantity * unitCost;

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Auto-generate unique order number if not provided
      let finalOrderNumber = orderNumber;
      if (!finalOrderNumber) {
        const lastOrder = await prisma.purchaseOrder.findFirst({
          where: { companyId },
          orderBy: { createdAt: 'desc' }
        });

        const timestamp = Date.now().toString().slice(-6);
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        finalOrderNumber = `PO${timestamp}${randomNum}`;
      }

      // Check if order number already exists for this company
      const existingOrder = await prisma.purchaseOrder.findFirst({
        where: {
          orderNumber: finalOrderNumber,
          companyId
        }
      });

      if (existingOrder) {
        // Generate a guaranteed unique number with timestamp
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        finalOrderNumber = `PO${timestamp}${randomNum}`;
      }

      // Create purchase order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          orderNumber: finalOrderNumber,
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

    console.log(`[MATERIAL-STATEMENT] Query params - startDate: ${startDate}, endDate: ${endDate}, materialId: ${materialId}, companyId: ${companyId}`);

    // Build date filter
    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    } : undefined;

    console.log(`[MATERIAL-STATEMENT] Date filter - gte: ${dateFilter?.gte}, lte: ${dateFilter?.lte}`);

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
      // Fetch all PO items for this material, then filter by date in code to avoid Prisma relation filter issues
      const purchaseItems = await prisma.purchaseOrderItem.findMany({
        where: {
          materialId: material.id,
          companyId
        },
        include: {
          purchaseOrder: {
            include: { vendor: true }
          }
        },
        orderBy: { purchaseOrder: { orderDate: 'asc' } }
      });

      console.log(`[MATERIAL-STATEMENT] Material ${material.name} (${material.id}) - Found ${purchaseItems.length} PO items`);

      for (const item of purchaseItems) {
        // Check if PO is RECEIVED
        if (item.purchaseOrder.status !== 'RECEIVED') {
          console.log(`[MATERIAL-STATEMENT] Skipping PO ${item.purchaseOrder.orderNumber} - status: ${item.purchaseOrder.status}`);
          continue;
        }

        // Apply date filter in code if present
        if (dateFilter) {
          const orderDate = new Date(item.purchaseOrder.orderDate);
          console.log(`[MATERIAL-STATEMENT] PO ${item.purchaseOrder.orderNumber} orderDate: ${orderDate.toISOString()}, filter gte: ${dateFilter.gte?.toISOString()}, filter lte: ${dateFilter.lte?.toISOString()}`);
          if (dateFilter.gte && orderDate < dateFilter.gte) {
            console.log(`[MATERIAL-STATEMENT] SKIPPED - orderDate < gte`);
            continue;
          }
          if (dateFilter.lte && orderDate > dateFilter.lte) {
            console.log(`[MATERIAL-STATEMENT] SKIPPED - orderDate > lte`);
            continue;
          }
          console.log(`[MATERIAL-STATEMENT] PASSED date filter`);
        }

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
          // Check if this return is waiting for approval
          const isPendingApproval = ret.restocked === false;

          transactions.push({
            id: ret.id,
            date: ret.recordedAt,
            type: isPendingApproval ? 'RETURN_PENDING_APPROVAL' : 'RETURN',
            description: isPendingApproval
              ? `🕒 Returned from Job: ${ret.issue?.job?.jobCode || 'N/A'} (WAITING FOR APPROVAL)`
              : `Returned from Job: ${ret.issue?.job?.jobCode || 'N/A'} (Good condition)`,
            reference: ret.issue?.job?.jobCode || 'N/A',
            referenceType: 'moving_job',
            referenceId: ret.issue?.jobId,
            stockIn: isPendingApproval ? 0 : ret.quantityGood,  // Don't add to balance until approved
            stockOut: 0,
            pendingApproval: isPendingApproval ? ret.quantityGood : 0,  // Show separately
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

      // Sort all transactions by date - OLDEST FIRST for balance calculation
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

        // Add returns before start date - ONLY count restocked returns
        const priorReturns = await prisma.materialReturn.findMany({
          where: {
            materialId: material.id,
            companyId,
            recordedAt: { lt: dateFilter.gte }
          }
        });
        openingStock += priorReturns.filter(r => r.restocked === true).reduce((sum, r) => sum + r.quantityGood, 0);

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

      // Reverse to show NEWEST FIRST for display
      transactions.reverse();

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

      // Debug: Log totals for each material
      if (transactions.length > 0) {
        console.log(`[MATERIAL-STATEMENT] ${material.name} - Transactions: ${transactions.length}, TotalPurchased: ${totals.totalPurchased}`);
      }
    }

    // Sort statements by most recent transaction date (newest activity first)
    statements.sort((a, b) => {
      // Get the most recent transaction date for each material
      // Since transactions are already reversed (newest first), first transaction is the most recent
      const aLatest = a.transactions.length > 0 ? new Date(a.transactions[0].date).getTime() : 0;
      const bLatest = b.transactions.length > 0 ? new Date(b.transactions[0].date).getTime() : 0;
      return bLatest - aLatest; // Newest first
    });

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

    console.log(`[MATERIAL-STATEMENT] OVERALL SUMMARY - totalPurchased: ${overallSummary.totalPurchased}, totalMaterials: ${overallSummary.totalMaterials}`);

    res.json({ statements, summary: overallSummary });
  } catch (error) {
    console.error("Error generating material statement:", error);
    res.status(500).json({ error: "Failed to generate material statement" });
  }
});


/**
 * PUT /api/materials/returns/:id
 * Update a material return
 */
router.put("/returns/:id", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    const { quantityGood, quantityDamaged, notes } = req.body;

    const existingReturn = await prisma.materialReturn.findFirst({
      where: { id, companyId },
      include: { material: true }
    });

    if (!existingReturn) {
      return res.status(404).json({ error: "Return not found" });
    }

    // Authorization: allow ADMIN/MANAGER or the user who recorded the return
    const userRole = req.user?.role || '';
    const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';
    if (!isAdminOrManager && existingReturn.recordedById !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: cannot edit this return' });
    }

    const oldQtyGood = existingReturn.quantityGood;
    const newQtyGood = parseInt(quantityGood);
    const diffQtyGood = newQtyGood - oldQtyGood;

    // Update stock if quantity good changed
    if (diffQtyGood !== 0 && existingReturn.rackId) {
      const uniqueBatchId = `RETURN-${existingReturn.id}`;

      // Update rack stock
      const rackStock = await prisma.rackStockLevel.findUnique({
        where: { materialId_rackId_stockBatchId: { materialId: existingReturn.materialId, rackId: existingReturn.rackId, stockBatchId: uniqueBatchId } }
      });

      if (rackStock) {
        await prisma.rackStockLevel.update({
          where: { materialId_rackId_stockBatchId: { materialId: existingReturn.materialId, rackId: existingReturn.rackId, stockBatchId: uniqueBatchId } },
          data: { quantity: { increment: diffQtyGood } }
        });
      } else if (newQtyGood > 0) {
        // If it didn't exist (maybe deleted manually?), create it
        await prisma.rackStockLevel.create({
          data: {
            materialId: existingReturn.materialId,
            rackId: existingReturn.rackId,
            quantity: newQtyGood,
            companyId,
            stockBatchId: uniqueBatchId
          }
        });
      }

      // Update material total
      await prisma.packingMaterial.update({
        where: { id: existingReturn.materialId },
        data: { totalQuantity: { increment: diffQtyGood } }
      });
    }

    // Update return record
    const updatedReturn = await prisma.materialReturn.update({
      where: { id },
      data: {
        quantityGood: newQtyGood,
        quantityDamaged: parseInt(quantityDamaged),
        notes
      }
    });

    // Log history
    if (existingReturn.issueId) {
      await prisma.materialIssueHistory.create({
        data: {
          issueId: existingReturn.issueId,
          action: 'RETURN_EDITED',
          jobId: existingReturn.jobId,
          materialId: existingReturn.materialId,
          materialName: existingReturn.material.name,
          materialSku: existingReturn.material.sku,
          quantity: newQtyGood, // Tracking the returned good quantity
          previousQty: oldQtyGood,
          unitCost: 0, // Not relevant for return edit
          totalCost: 0,
          rackId: existingReturn.rackId,
          notes: notes || existingReturn.notes,
          reason: 'Return record updated',
          performedById: req.user!.id,
          companyId
        }
      });
    }

    res.json(updatedReturn);
  } catch (error) {
    console.error("Error updating return:", error);
    res.status(500).json({ error: "Failed to update return" });
  }
});

/**
 * DELETE /api/materials/returns/:id
 * Delete a material return
 */
router.delete("/returns/:id", authenticateToken as any, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    const existingReturn = await prisma.materialReturn.findFirst({
      where: { id, companyId },
      include: { material: true }
    });

    if (!existingReturn) {
      return res.status(404).json({ error: "Return not found" });
    }

    // Reverse stock addition
    if (existingReturn.quantityGood > 0 && existingReturn.rackId) {
      const uniqueBatchId = `RETURN-${existingReturn.id}`;

      // Decrease rack stock
      try {
        await prisma.rackStockLevel.update({
          where: { materialId_rackId_stockBatchId: { materialId: existingReturn.materialId, rackId: existingReturn.rackId, stockBatchId: uniqueBatchId } },
          data: { quantity: { decrement: existingReturn.quantityGood } }
        });
      } catch (e) {
        // Ignore if not found
      }

      // Decrease material total
      await prisma.packingMaterial.update({
        where: { id: existingReturn.materialId },
        data: { totalQuantity: { decrement: existingReturn.quantityGood } }
      });
    }

    // Log history BEFORE deletion
    if (existingReturn.issueId) {
      await prisma.materialIssueHistory.create({
        data: {
          issueId: existingReturn.issueId,
          action: 'RETURN_DELETED',
          jobId: existingReturn.jobId,
          materialId: existingReturn.materialId,
          materialName: existingReturn.material.name,
          materialSku: existingReturn.material.sku,
          quantity: existingReturn.quantityGood,
          previousQty: null,
          unitCost: 0,
          totalCost: 0,
          rackId: existingReturn.rackId,
          notes: existingReturn.notes,
          reason: 'Return record deleted',
          performedById: req.user!.id,
          companyId
        }
      });
    }

    // Delete damages
    await prisma.materialDamage.deleteMany({ where: { returnId: id } });

    // Delete return
    await prisma.materialReturn.delete({ where: { id } });

    res.json({ message: "Return deleted successfully" });
  } catch (error) {
    console.error("Error deleting return:", error);
    res.status(500).json({ error: "Failed to delete return" });
  }
});

/**
 * GET /api/materials/report-2/all-job-materials
 * Material Report 2.0 — Returns ALL jobs with complete material breakdown
 * Includes: job info, all issued materials, returns, damages, costs, remaining calculation
 */
router.get("/report-2/all-job-materials", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate, status } = req.query;

    // Date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Get all jobs for this company (with optional status filter)
    const jobWhere: any = { companyId };
    if (status) jobWhere.status = status;
    if (startDate || endDate) {
      jobWhere.createdAt = dateFilter;
    }

    const jobs = await prisma.movingJob.findMany({
      where: jobWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        materialIssues: {
          include: {
            material: true,
            rack: { select: { id: true, code: true, location: true } },
            returns: {
              include: {
                damages: true,
              },
              orderBy: { recordedAt: 'desc' },
            },
          },
          orderBy: { issuedAt: 'desc' },
        },
      },
    });

    // Build report
    const reportData = jobs.map(job => {
      const materials = job.materialIssues || [];

      let totalIssued = 0;
      let totalUsed = 0;
      let totalReturned = 0;
      let totalDamaged = 0;
      let totalCost = 0;
      let totalRemaining = 0;

      const materialDetails = materials.map(issue => {
        const qty = issue.quantity || 0;
        const latestReturn = issue.returns?.[0];
        const used = latestReturn?.quantityUsed || 0;
        const returned = latestReturn?.quantityGood || 0;
        const damaged = latestReturn?.quantityDamaged || 0;
        const remaining = qty - used - returned - damaged;
        const cost = issue.totalCost || 0;

        totalIssued += qty;
        totalUsed += used;
        totalReturned += returned;
        totalDamaged += damaged;
        totalCost += cost;
        totalRemaining += Math.max(0, remaining);

        return {
          id: issue.id,
          materialId: issue.materialId,
          materialName: issue.material?.name || 'Unknown',
          materialSku: issue.material?.sku || 'N/A',
          materialUnit: issue.material?.unit || 'pcs',
          unitCost: issue.unitCost || 0,
          quantity: qty,
          quantityUsed: used,
          quantityReturned: returned,
          quantityDamaged: damaged,
          quantityRemaining: Math.max(0, remaining),
          totalCost: cost,
          rackCode: issue.rack?.code || null,
          notes: issue.notes || null,
          issuedAt: issue.issuedAt,
          returns: (issue.returns || []).map(r => ({
            id: r.id,
            quantityUsed: r.quantityUsed || 0,
            quantityGood: r.quantityGood || 0,
            quantityDamaged: r.quantityDamaged || 0,
            damageReason: r.damageReason || null,
            notes: r.notes || null,
            recordedAt: r.recordedAt,
            damages: (r.damages || []).map((d: any) => ({
              id: d.id,
              quantity: d.quantity || 0,
              reason: d.reason || null,
              photoUrls: d.photoUrls || null,
            })),
          })),
          status: latestReturn ? 'Returned' : 'Pending',
        };
      });

      // Remaining after approval logic
      const isApproved = job.status === 'APPROVED' || job.status === 'COMPLETED';

      return {
        jobId: job.id,
        jobCode: job.jobCode,
        jobTitle: job.jobTitle,
        clientName: job.clientName || job.company?.name || '',
        jobDate: job.jobDate || job.createdAt,
        status: job.status,
        isApproved,
        assignedTo: '',
        createdAt: job.createdAt,
        totals: {
          totalMaterials: materials.length,
          totalIssued,
          totalUsed,
          totalReturned,
          totalDamaged,
          totalCost,
          totalRemaining,
        },
        materials: materialDetails,
      };
    });

    // Calculate grand totals
    const grandTotals = {
      totalJobs: reportData.length,
      totalMaterialsIssued: reportData.reduce((s, j) => s + j.totals.totalMaterials, 0),
      totalIssued: reportData.reduce((s, j) => s + j.totals.totalIssued, 0),
      totalUsed: reportData.reduce((s, j) => s + j.totals.totalUsed, 0),
      totalReturned: reportData.reduce((s, j) => s + j.totals.totalReturned, 0),
      totalDamaged: reportData.reduce((s, j) => s + j.totals.totalDamaged, 0),
      totalCost: reportData.reduce((s, j) => s + j.totals.totalCost, 0),
      totalRemaining: reportData.reduce((s, j) => s + j.totals.totalRemaining, 0),
    };

    res.json({ jobs: reportData, grandTotals });
  } catch (error) {
    console.error("Error in Material Report 2.0:", error);
    res.status(500).json({ error: "Failed to generate material report" });
  }
});

/**
 * GET /api/materials/reports/material-statement-pro
 * Professional complete material statement with ALL details
 * - Stock before/after each transaction
 * - Batch numbers, vendor names, purchase dates
 * - Job names with clickable links
 * - Approval status for pending returns
 * - Running balance like a bank statement
 */
router.get("/reports/material-statement-pro", authenticateToken as any, async (req: AuthRequest, res) => {
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
    const statements: any[] = [];

    for (const material of materials) {
      const transactions: any[] = [];

      // ===== 1. PURCHASES from Purchase Orders =====
      const purchaseItems = await prisma.purchaseOrderItem.findMany({
        where: { materialId: material.id, companyId },
        include: {
          purchaseOrder: {
            include: { vendor: true }
          }
        },
        orderBy: { purchaseOrder: { orderDate: 'asc' } }
      });

      for (const item of purchaseItems) {
        if (item.purchaseOrder.status !== 'RECEIVED') continue;

        if (dateFilter) {
          const d = new Date(item.purchaseOrder.orderDate);
          if (dateFilter.gte && d < dateFilter.gte) continue;
          if (dateFilter.lte && d > dateFilter.lte) continue;
        }

        transactions.push({
          id: item.id,
          date: item.purchaseOrder.orderDate,
          type: 'PURCHASE',
          description: `Purchase from ${item.purchaseOrder.vendorName || item.purchaseOrder.vendor?.name || 'Vendor'}`,
          reference: item.purchaseOrder.orderNumber,
          referenceType: 'purchase_order',
          referenceId: item.purchaseOrder.id,
          linkedPage: null,
          stockIn: item.quantity,
          stockOut: 0,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          // Extra purchase details
          batchNumber: null,
          vendorName: item.purchaseOrder.vendorName || item.purchaseOrder.vendor?.name || 'Unknown',
          poNumber: item.purchaseOrder.orderNumber,
          poDate: item.purchaseOrder.orderDate,
          receivedDate: item.purchaseOrder.receivedDate,
          personName: null
        });
      }

      // ===== 1b. PURCHASES from Stock Batches =====
      const stockBatches = await prisma.stockBatch.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { purchaseDate: dateFilter } : {})
        },
        include: { vendor: true, receivedBy: true },
        orderBy: { purchaseDate: 'asc' }
      });

      for (const batch of stockBatches) {
        transactions.push({
          id: batch.id,
          date: batch.purchaseDate,
          type: 'PURCHASE',
          description: `Batch: ${batch.batchNumber || 'No Batch'} - ${batch.vendorName || batch.vendor?.name || 'Direct'}`,
          reference: batch.batchNumber || 'BATCH',
          referenceType: 'stock_batch',
          referenceId: batch.id,
          linkedPage: null,
          stockIn: batch.quantityPurchased,
          stockOut: 0,
          unitCost: batch.unitCost,
          totalCost: batch.quantityPurchased * batch.unitCost,
          // Extra purchase details
          batchNumber: batch.batchNumber || 'N/A',
          vendorName: batch.vendorName || batch.vendor?.name || 'Direct Entry',
          poNumber: batch.purchaseOrder || 'N/A',
          poDate: batch.purchaseDate,
          receivedDate: batch.purchaseDate,
          personName: batch.receivedBy?.name || 'Unknown',
          quantityRemaining: batch.quantityRemaining
        });
      }

      // ===== 2. ISSUES (Stock OUT to jobs) =====
      const issues = await prisma.materialIssue.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { issuedAt: dateFilter } : {})
        },
        include: {
          job: true,
          issuedBy: true,
          stockBatch: true
        },
        orderBy: { issuedAt: 'asc' }
      });

      for (const issue of issues) {
        transactions.push({
          id: issue.id,
          date: issue.issuedAt,
          type: 'ISSUE',
          description: `Issued to Job: ${issue.job?.jobCode || 'N/A'}`,
          reference: issue.job?.jobCode || issue.reference || 'N/A',
          referenceType: 'moving_job',
          referenceId: issue.jobId,
          linkedPage: issue.jobId ? `/moving-jobs/${issue.jobId}` : null,
          stockIn: 0,
          stockOut: issue.quantity,
          unitCost: issue.unitCost,
          totalCost: issue.totalCost,
          // Extra issue details
          jobId: issue.jobId,
          jobCode: issue.job?.jobCode || 'N/A',
          jobTitle: issue.job?.jobTitle || 'Unknown Job',
          jobStatus: issue.job?.status || 'UNKNOWN',
          batchNumber: issue.stockBatch?.batchNumber || null,
          personName: issue.issuedBy?.name || 'Unknown',
          notes: issue.notes || null,
          rackId: issue.rackId,
          issueType: issue.issueType
        });
      }

      // ===== 3. RETURNS (Stock IN from jobs) =====
      const returns = await prisma.materialReturn.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { recordedAt: dateFilter } : {})
        },
        include: {
          issue: { include: { job: true } },
          recordedBy: true,
          approval: true
        },
        orderBy: { recordedAt: 'asc' }
      });

      for (const ret of returns) {
        if (ret.quantityGood > 0) {
          const isPending = ret.restocked === false;
          const approvalStatus = ret.approval?.status || (isPending ? 'PENDING' : 'APPROVED');

          transactions.push({
            id: ret.id,
            date: ret.recordedAt,
            type: isPending ? 'RETURN_PENDING' : 'RETURN',
            description: isPending
              ? `⏳ Return from ${ret.issue?.job?.jobCode || 'Job'} (Pending Approval)`
              : `Return from ${ret.issue?.job?.jobCode || 'Job'} (Approved ✓)`,
            reference: ret.issue?.job?.jobCode || 'N/A',
            referenceType: 'moving_job',
            referenceId: ret.issue?.jobId,
            linkedPage: ret.issue?.jobId ? `/moving-jobs/${ret.issue.jobId}` : null,
            stockIn: isPending ? 0 : ret.quantityGood,
            stockOut: 0,
            unitCost: ret.issue?.unitCost || 0,
            totalCost: ret.quantityGood * (ret.issue?.unitCost || 0),
            // Extra return details
            jobId: ret.issue?.jobId,
            jobCode: ret.issue?.job?.jobCode || 'N/A',
            jobTitle: ret.issue?.job?.jobTitle || 'Unknown Job',
            pendingApproval: isPending ? ret.quantityGood : 0,
            approvalStatus,
            approvalId: ret.approval?.id || null,
            quantityGood: ret.quantityGood,
            quantityDamaged: ret.quantityDamaged,
            quantityUsed: ret.quantityUsed || 0,
            personName: ret.recordedBy?.name || 'Unknown',
            notes: ret.notes || null,
            restocked: ret.restocked,
            restockedAt: ret.restockedAt
          });
        }
      }

      // ===== 4. DAMAGES (Stock loss) =====
      const damages = await prisma.materialDamage.findMany({
        where: {
          materialId: material.id,
          companyId,
          ...(dateFilter ? { recordedAt: dateFilter } : {})
        },
        include: {
          return: { include: { issue: { include: { job: true } } } },
          recordedBy: true,
          approvedBy: true
        },
        orderBy: { recordedAt: 'asc' }
      });

      for (const damage of damages) {
        const statusLabel = damage.status === 'APPROVED' ? 'Approved' : damage.status === 'REJECTED' ? 'Rejected' : 'Pending';
        const statusColor = damage.status === 'APPROVED' ? 'green' : damage.status === 'REJECTED' ? 'red' : 'amber';

        transactions.push({
          id: damage.id,
          date: damage.recordedAt,
          type: 'DAMAGE',
          description: `Damaged: ${damage.reason || 'No reason'} (${statusLabel})`,
          reference: damage.return?.issue?.job?.jobCode || 'N/A',
          referenceType: 'damage_report',
          referenceId: damage.id,
          linkedPage: damage.return?.issue?.jobId ? `/moving-jobs/${damage.return.issue.jobId}` : null,
          stockIn: 0,
          stockOut: damage.quantity,
          unitCost: damage.return?.issue?.unitCost || material.unitCost || 0,
          totalCost: damage.quantity * (damage.return?.issue?.unitCost || material.unitCost || 0),
          // Extra damage details
          jobCode: damage.return?.issue?.job?.jobCode || 'N/A',
          jobTitle: damage.return?.issue?.job?.jobTitle || null,
          reason: damage.reason || null,
          damageStatus: damage.status,
          damageStatusLabel: statusLabel,
          photoUrls: damage.photoUrls,
          personName: damage.recordedBy?.name || 'Unknown',
          approvedBy: damage.approvedBy?.name || null,
          approvedAt: damage.approvedAt,
          approvalNotes: damage.approvalNotes
        });
      }

      // ===== Sort ALL by date ASC for balance =====
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // ===== Calculate OPENING stock (before date range) =====
      let openingStock = 0;
      if (dateFilter && dateFilter.gte) {
        const priorPurchases = await prisma.purchaseOrderItem.findMany({
          where: {
            materialId: material.id, companyId,
            purchaseOrder: { orderDate: { lt: dateFilter.gte }, status: 'RECEIVED' }
          }
        });
        openingStock += priorPurchases.reduce((s, p) => s + p.quantity, 0);

        const priorBatches = await prisma.stockBatch.findMany({
          where: { materialId: material.id, companyId, purchaseDate: { lt: dateFilter.gte } }
        });
        openingStock += priorBatches.reduce((s, b) => s + b.quantityPurchased, 0);

        const priorIssues = await prisma.materialIssue.findMany({
          where: { materialId: material.id, companyId, issuedAt: { lt: dateFilter.gte } }
        });
        openingStock -= priorIssues.reduce((s, i) => s + i.quantity, 0);

        const priorReturns = await prisma.materialReturn.findMany({
          where: { materialId: material.id, companyId, recordedAt: { lt: dateFilter.gte } }
        });
        openingStock += priorReturns.filter(r => r.restocked === true).reduce((s, r) => s + r.quantityGood, 0);

        const priorDamages = await prisma.materialDamage.findMany({
          where: { materialId: material.id, companyId, recordedAt: { lt: dateFilter.gte } }
        });
        openingStock -= priorDamages.reduce((s, d) => s + d.quantity, 0);
      }

      // ===== Calculate running balance with stockBefore/stockAfter =====
      let runningBalance = openingStock;
      for (const txn of transactions) {
        txn.stockBefore = runningBalance;
        runningBalance += txn.stockIn - txn.stockOut;
        txn.stockAfter = runningBalance;
        txn.balance = runningBalance;
      }

      // ===== Reverse for display (newest first) =====
      transactions.reverse();

      // ===== Transactions summary =====
      // Count by type in the date range
      const dateRangeTxns = dateFilter
        ? transactions.filter(t => {
            const d = new Date(t.date);
            return (!dateFilter.gte || d >= dateFilter.gte) && (!dateFilter.lte || d <= dateFilter.lte);
          })
        : transactions;

      const totals = {
        openingStock,
        totalPurchased: dateRangeTxns.filter(t => t.type === 'PURCHASE').reduce((s, t) => s + t.stockIn, 0),
        totalIssued: dateRangeTxns.filter(t => t.type === 'ISSUE').reduce((s, t) => s + t.stockOut, 0),
        totalReturned: dateRangeTxns.filter(t => t.type === 'RETURN').reduce((s, t) => s + t.stockIn, 0),
        totalPendingReturn: dateRangeTxns.filter(t => t.type === 'RETURN_PENDING').reduce((s, t) => s + (t.pendingApproval || 0), 0),
        totalDamaged: dateRangeTxns.filter(t => t.type === 'DAMAGE').reduce((s, t) => s + t.stockOut, 0),
        closingBalance: runningBalance,
        currentStock: material.totalQuantity,
        totalValue: material.totalQuantity * (material.unitCost || 0),
        totalTransactions: transactions.length
      };

      // ===== Get active batches for this material =====
      const activeBatches = await prisma.stockBatch.findMany({
        where: { materialId: material.id, companyId, quantityRemaining: { gt: 0 } },
        include: { vendor: true },
        orderBy: { purchaseDate: 'desc' }
      });

      statements.push({
        material: {
          id: material.id,
          sku: material.sku,
          name: material.name,
          category: material.materialCategory?.name || material.category || 'Uncategorized',
          unit: material.unit,
          unitCost: material.unitCost || 0,
          currentStock: material.totalQuantity,
          minStockLevel: material.minStockLevel,
          description: material.description,
          totalValue: material.totalQuantity * (material.unitCost || 0),
          isLowStock: material.totalQuantity <= material.minStockLevel && material.minStockLevel > 0
        },
        batches: activeBatches.map(b => ({
          id: b.id,
          batchNumber: b.batchNumber || 'N/A',
          purchaseDate: b.purchaseDate,
          vendorName: b.vendorName || b.vendor?.name || 'Direct',
          quantityPurchased: b.quantityPurchased,
          quantityRemaining: b.quantityRemaining,
          unitCost: b.unitCost,
          totalCost: b.quantityPurchased * b.unitCost
        })),
        transactions,
        totals
      });
    }

    // Sort by most recent activity
    statements.sort((a, b) => {
      const aLatest = a.transactions.length > 0 ? new Date(a.transactions[0].date).getTime() : 0;
      const bLatest = b.transactions.length > 0 ? new Date(b.transactions[0].date).getTime() : 0;
      return bLatest - aLatest;
    });

    // Grand summary
    const overallSummary = {
      totalMaterials: statements.length,
      totalOpeningStock: statements.reduce((s, st) => s + st.totals.openingStock, 0),
      totalPurchased: statements.reduce((s, st) => s + st.totals.totalPurchased, 0),
      totalIssued: statements.reduce((s, st) => s + st.totals.totalIssued, 0),
      totalReturned: statements.reduce((s, st) => s + st.totals.totalReturned, 0),
      totalPendingReturn: statements.reduce((s, st) => s + st.totals.totalPendingReturn, 0),
      totalDamaged: statements.reduce((s, st) => s + st.totals.totalDamaged, 0),
      totalClosingStock: statements.reduce((s, st) => s + st.totals.closingBalance, 0),
      totalValue: statements.reduce((s, st) => s + st.totals.totalValue, 0),
      totalTransactions: statements.reduce((s, st) => s + st.totals.totalTransactions, 0),
      lowStockCount: statements.filter(s => s.material.isLowStock).length
    };

    res.json({ statements, summary: overallSummary });
  } catch (error) {
    console.error("Error in material-statement-pro:", error);
    res.status(500).json({ error: "Failed to generate professional material statement" });
  }
});

// ── REUSABLE: Statement data fetcher ──
async function getStatementData(companyId: string, startDate?: string, endDate?: string) {
  const dateFilter = startDate && endDate ? {
    gte: new Date(startDate as string),
    lte: new Date(endDate as string)
  } : undefined;

  const materials = await prisma.packingMaterial.findMany({
    where: { companyId, isActive: true },
    include: { materialCategory: true }
  });

  const statements: any[] = [];
  for (const material of materials) {
    const transactions: any[] = [];

    // Purchases
    const purchaseItems = await prisma.purchaseOrderItem.findMany({
      where: { materialId: material.id, companyId },
      include: { purchaseOrder: { include: { vendor: true } } },
      orderBy: { purchaseOrder: { orderDate: 'asc' } }
    });
    for (const item of purchaseItems) {
      if (item.purchaseOrder.status !== 'RECEIVED') continue;
      if (dateFilter) { const d = new Date(item.purchaseOrder.orderDate); if (dateFilter.gte && d < dateFilter.gte) continue; if (dateFilter.lte && d > dateFilter.lte) continue; }
      transactions.push({
        id: item.id, date: item.purchaseOrder.orderDate, type: 'PURCHASE',
        reference: item.purchaseOrder.poNumber, description: `Purchase: ${material.name}`,
        batchNumber: null, vendorName: item.purchaseOrder.vendor?.name || '', poNumber: item.purchaseOrder.poNumber,
        stockIn: item.receivedQuantity || 0, stockOut: 0, unitCost: item.unitCost || 0, totalCost: (item.receivedQuantity || 0) * (item.unitCost || 0),
        personName: item.purchaseOrder.receivedBy || '',
        poDate: item.purchaseOrder.orderDate, quantityRemaining: (item.receivedQuantity || 0) - (item.quantity || 0),
        linkedPage: null, referenceType: 'purchase', referenceId: item.id,
        jobId: null, jobCode: null, jobTitle: null, jobStatus: null, notes: null,
        rackId: null, issueType: null,
        pendingApproval: null, approvalStatus: null, approvalId: null, quantityGood: null, quantityDamaged: null, quantityUsed: null, restocked: null, restockedAt: null,
        reason: null, damageStatus: null, damageStatusLabel: null, photoUrls: null,
        approvedBy: null, approvedAt: null, approvalNotes: null
      });
    }

    // Issues
    const issues = await prisma.materialIssue.findMany({
      where: { materialId: material.id, companyId },
      include: { job: true, issuedBy: true },
      orderBy: { issuedAt: 'asc' }
    });
    for (const issue of issues) {
      if (dateFilter) { const d = new Date(issue.issuedAt); if (dateFilter.gte && d < dateFilter.gte) continue; if (dateFilter.lte && d > dateFilter.lte) continue; }
      transactions.push({
        id: issue.id, date: issue.issuedAt, type: 'ISSUE',
        reference: issue.reference || `ISS-${issue.id.substring(0, 8)}`, description: `Issued to Job`,
        batchNumber: null, vendorName: null, poNumber: null,
        stockIn: 0, stockOut: issue.quantity || 0, unitCost: issue.unitCost || 0, totalCost: (issue.quantity || 0) * (issue.unitCost || 0),
        personName: issue.issuedBy?.name || issue.issuedBy || '',
        jobId: issue.job?.id, jobCode: issue.job?.jobCode, jobTitle: issue.job?.title, jobStatus: issue.job?.status,
        notes: issue.notes, rackId: issue.rackId, issueType: issue.issueType,
        linkedPage: issue.job ? `/moving-jobs/${issue.job.id}` : null,
        referenceType: 'issue', referenceId: issue.id,
        pendingApproval: null, approvalStatus: null, approvalId: null, quantityGood: null, quantityDamaged: null, quantityUsed: null, restocked: null, restockedAt: null,
        reason: null, damageStatus: null, damageStatusLabel: null, photoUrls: null,
        approvedBy: null, approvedAt: null, approvalNotes: null
      });
    }

    // Returns
    const returns = await prisma.materialReturn.findMany({
      where: { materialId: material.id, companyId },
      include: { job: true, recordedBy: true },
      orderBy: { recordedAt: 'asc' }
    });
    for (const ret of returns) {
      if (dateFilter) { const d = new Date(ret.recordedAt); if (dateFilter.gte && d < dateFilter.gte) continue; if (dateFilter.lte && d > dateFilter.lte) continue; }
      transactions.push({
        id: ret.id, date: ret.recordedAt, type: 'RETURN',
        reference: `RET-${ret.id.substring(0, 8)}`, description: `Material Return`,
        batchNumber: null, vendorName: null, poNumber: null,
        stockIn: (ret.quantityGood || 0) + (ret.quantityDamaged || 0),
        stockOut: 0, unitCost: 0, totalCost: 0,
        personName: ret.recordedBy?.name || '',
        jobId: ret.job?.id, jobCode: ret.job?.jobCode, jobTitle: ret.job?.title, jobStatus: ret.job?.status,
        notes: ret.notes, rackId: null, issueType: null,
        linkedPage: ret.job ? `/moving-jobs/${ret.job.id}` : null,
        referenceType: 'return', referenceId: ret.id,
        pendingApproval: null, approvalStatus: null, approvalId: null,
        quantityGood: ret.quantityGood, quantityDamaged: ret.quantityDamaged, quantityUsed: ret.quantityUsed,
        restocked: ret.restocked, restockedAt: ret.restockedAt,
        approvedBy: null, approvedAt: null, approvalNotes: null
      });
    }

    // Damages
    const damages = await prisma.materialDamage.findMany({
      where: { materialId: material.id, companyId },
      include: { approvedBy: true, recordedBy: true },
      orderBy: { recordedAt: 'asc' }
    });
    for (const dmg of damages) {
      if (dateFilter) { const d = new Date(dmg.recordedAt); if (dateFilter.gte && d < dateFilter.gte) continue; if (dateFilter.lte && d > dateFilter.lte) continue; }
      transactions.push({
        id: dmg.id, date: dmg.recordedAt, type: 'DAMAGE',
        reference: `DMG-${dmg.id.substring(0, 8)}`, description: `Material Damage`,
        batchNumber: null, vendorName: null, poNumber: null,
        stockIn: 0, stockOut: dmg.quantity || 0, unitCost: 0, totalCost: 0,
        personName: dmg.recordedBy?.name || '',
        jobId: null, jobCode: null, jobTitle: null, jobStatus: null,
        notes: dmg.notes, rackId: null, issueType: null,
        linkedPage: null,
        referenceType: 'damage', referenceId: dmg.id,
        reason: dmg.reason, damageStatus: dmg.status, damageStatusLabel: dmg.status === 'APPROVED' ? 'Approved' : dmg.status === 'REJECTED' ? 'Rejected' : 'Pending',
        photoUrls: dmg.photoUrls
      });
    }

    // Sort by date
    transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance and stock before/after
    // Find the earliest transaction date to calculate opening stock
    const allPOHistory = await prisma.purchaseOrderItem.findMany({
      where: { materialId: material.id, companyId, purchaseOrder: { status: 'RECEIVED' } },
      include: { purchaseOrder: true }
    });
    let totalReceived = 0, totalConsumed = 0;
    for (const po of allPOHistory) {
      if (dateFilter && new Date(po.purchaseOrder.orderDate) < dateFilter.gte) {
        totalReceived += po.quantityReceived || 0;
      }
    }
    // Count issues before start date
    const allIssuesHistory = dateFilter ? await prisma.materialIssue.findMany({
      where: { materialId: material.id, companyId, issuedAt: { lt: dateFilter.gte } }
    }) : [];
    for (const iss of allIssuesHistory) totalConsumed += iss.quantity || 0;
    // Count damages before start date
    const allDmgHistory = dateFilter ? await prisma.materialDamage.findMany({
      where: { materialId: material.id, companyId, reportedAt: { lt: dateFilter.gte } }
    }) : [];
    for (const d of allDmgHistory) totalConsumed += d.quantity || 0;
    // Returns before start date
    const allRetHistory = dateFilter ? await prisma.materialReturn.findMany({
      where: { materialId: material.id, companyId, returnedAt: { lt: dateFilter.gte }, status: { not: 'PENDING' } }
    }) : [];
    for (const r of allRetHistory) totalReceived += (r.quantityGood || 0) + (r.quantityDamaged || 0);

    const openingStock = Math.max(0, totalReceived - totalConsumed);
    let runningBalance = openingStock;

    for (const txn of transactions) {
      txn.stockBefore = runningBalance;
      txn.balance = runningBalance + txn.stockIn - txn.stockOut;
      txn.stockAfter = txn.balance;
      runningBalance = txn.balance;
    }

    const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : openingStock;
    const totalPurchased = transactions.filter((t: any) => t.type === 'PURCHASE').reduce((s: number, t: any) => s + t.stockIn, 0);
    const totalIssued = transactions.filter((t: any) => t.type === 'ISSUE').reduce((s: number, t: any) => s + t.stockOut, 0);
    const totalReturned = transactions.filter((t: any) => t.type === 'RETURN').reduce((s: number, t: any) => s + t.stockIn, 0);
    const totalPendingReturn = transactions.filter((t: any) => t.type === 'RETURN_PENDING').length;
    const totalDamaged = transactions.filter((t: any) => t.type === 'DAMAGE').reduce((s: number, t: any) => s + t.stockOut, 0);
    const totalValue = closingBalance * (material.unitCost || 0);

    // Batches (simplified for staging - no batchNumber field)
    const batches: any[] = [];
    const batchItems = await prisma.purchaseOrderItem.findMany({
      where: { materialId: material.id, companyId },
      include: { purchaseOrder: { include: { vendor: true } } },
      orderBy: { purchaseOrder: { orderDate: 'desc' } }
    });
    for (const bi of batchItems) {
      if ((bi.receivedQuantity || 0) > 0) {
        batches.push({
          id: bi.id, batchNumber: `PO-${bi.id.substring(0, 8)}`,
          purchaseDate: bi.purchaseOrder.orderDate,
          vendorName: bi.purchaseOrder.vendor?.name || 'N/A',
          quantityPurchased: bi.receivedQuantity || 0,
          quantityRemaining: (bi.receivedQuantity || 0) - (bi.quantity || 0),
          unitCost: bi.unitCost || 0,
          totalCost: ((bi.receivedQuantity || 0) - (bi.quantity || 0)) * (bi.unitCost || 0)
        });
      }
    }

    statements.push({
      material: {
        id: material.id, sku: material.sku, name: material.name,
        category: material.materialCategory?.name || 'Uncategorized',
        unit: material.unit, unitCost: material.unitCost || 0,
        currentStock: material.currentStock || 0, minStockLevel: material.minStockLevel || 0,
        description: material.description, totalValue,
        isLowStock: (material.currentStock || 0) <= (material.minStockLevel || 0)
      },
      batches,
      transactions,
      totals: { openingStock, totalPurchased, totalIssued, totalReturned, totalPendingReturn, totalDamaged, closingBalance, currentStock: closingBalance, totalValue, totalTransactions: transactions.length }
    });
  }

  const overallSummary = {
    totalMaterials: statements.length,
    totalOpeningStock: statements.reduce((s: number, st: any) => s + st.totals.openingStock, 0),
    totalPurchased: statements.reduce((s: number, st: any) => s + st.totals.totalPurchased, 0),
    totalIssued: statements.reduce((s: number, st: any) => s + st.totals.totalIssued, 0),
    totalReturned: statements.reduce((s: number, st: any) => s + st.totals.totalReturned, 0),
    totalPendingReturn: statements.reduce((s: number, st: any) => s + st.totals.totalPendingReturn, 0),
    totalDamaged: statements.reduce((s: number, st: any) => s + st.totals.totalDamaged, 0),
    totalClosingStock: statements.reduce((s: number, st: any) => s + st.totals.closingBalance, 0),
    totalValue: statements.reduce((s: number, st: any) => s + st.totals.totalValue, 0),
    totalTransactions: statements.reduce((s: number, st: any) => s + st.totals.totalTransactions, 0),
    lowStockCount: statements.filter((s: any) => s.material.isLowStock).length
  };

  return { statements, summary: overallSummary };
}

// ── EXCEL EXPORT ──
router.get("/reports/material-statement-pro/excel", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { startDate, endDate } = req.query;
    const data = await getStatementData(companyId, startDate as string, endDate as string);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'QGO Cargo WMS';
    wb.created = new Date();

    // Styles
    const headerFont = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    const altFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    const grandFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    const titleFont = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    const subtitleFont = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
    const moneyFmt = '#,##0.000';
    const fill = (color: string): any => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });

    const styleCell = (cell: any, opts: any = {}) => {
      if (opts.bold) cell.font = { ...cell.font, bold: true };
      if (opts.fill) cell.fill = opts.fill;
      if (opts.font) cell.font = { ...cell.font, ...opts.font };
      if (opts.alignment) cell.alignment = opts.alignment;
      if (opts.numFmt) cell.numFmt = opts.numFmt;
      cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    };

    // ── Sheet 1: Executive Summary ──
    const ws1 = wb.addWorksheet('Executive Summary');
    ws1.mergeCells('A1:O1');
    ws1.getCell('A1').value = `QGO Cargo WMS — Material Stock Statement PRO`;
    ws1.getCell('A1').font = titleFont;
    ws1.mergeCells('A2:O2');
    ws1.getCell('A2').value = `Report Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`;
    ws1.getCell('A2').font = subtitleFont;
    ws1.mergeCells('A3:O3');
    ws1.getCell('A3').value = `Generated: ${new Date().toLocaleString()}`;
    ws1.getCell('A3').font = subtitleFont;

    // Grand Summary
    if (data.summary) {
      const s = data.summary;
      ws1.getCell('A5').value = 'GRAND SUMMARY';
      ws1.getCell('A5').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      const grandHeaders = ['Materials', 'Opening', 'Purchased +', 'Issued -', 'Return +', 'Pending ↩', 'Damaged -', 'Closing', 'Total Value', 'Transactions'];
      const grandValues = [s.totalMaterials, s.totalOpeningStock, s.totalPurchased, s.totalIssued, s.totalReturned, s.totalPendingReturn, s.totalDamaged, s.totalClosingStock, Number(s.totalValue.toFixed(3)), s.totalTransactions];
      grandHeaders.forEach((h, i) => { const c = ws1.getCell(6, i + 1); c.value = h; c.font = headerFont; c.fill = headerFill; c.alignment = { horizontal: 'center', vertical: 'middle' }; styleCell(c); });
      grandValues.forEach((v, i) => { const c = ws1.getCell(7, i + 1); c.value = v; c.font = { name: 'Segoe UI', size: 12, bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; c.alignment = { horizontal: 'center' }; styleCell(c); if (typeof v === 'number' && i >= 4) c.numFmt = i === 8 ? moneyFmt : '#,##0'; });
    }

    // Material-wise table
    const matStartRow = 9;
    ws1.getCell(`A${matStartRow}`).value = 'MATERIAL-WISE BREAKDOWN';
    ws1.getCell(`A${matStartRow}`).font = { name: 'Segoe UI', size: 11, bold: true };
    const matHeaders = ['Material', 'SKU', 'Category', 'Unit', 'Stock', 'Unit Cost', 'Opening', 'Purch +', 'Issue -', 'Rtrn +', 'Pend ↩️', 'Dmg -', 'Closing', 'Value', 'Txns'];
    matHeaders.forEach((h, i) => { const c = ws1.getCell(matStartRow + 1, i + 1); c.value = h; c.font = headerFont; c.fill = headerFill; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; styleCell(c); });
    const colWidths = [32, 16, 16, 8, 10, 12, 10, 10, 10, 10, 10, 10, 10, 14, 8];
    colWidths.forEach((w, i) => { ws1.getColumn(i + 1).width = w; });

    data.statements.forEach((stmt: any, idx: number) => {
      const m = stmt.material;
      const t = stmt.totals;
      const row = matStartRow + 2 + idx;
      const vals = [m.name, m.sku, m.category, m.unit, t.currentStock, Number(m.unitCost.toFixed(3)), t.openingStock, t.totalPurchased, t.totalIssued, t.totalReturned, t.totalPendingReturn, t.totalDamaged, t.closingBalance, Number(t.totalValue.toFixed(3)), t.totalTransactions];
      vals.forEach((v: any, ci: number) => {
        const c = ws1.getCell(row, ci + 1);
        c.value = v;
        c.font = { name: 'Segoe UI', size: 9 };
        if (idx % 2 === 1) c.fill = altFill;
        c.alignment = ci === 0 ? { horizontal: 'left' } : { horizontal: 'center' };
        if (typeof v === 'number' && ci >= 4) c.numFmt = ci === 5 || ci === 13 ? moneyFmt : '#,##0';
        styleCell(c);
        if (ci === 4 && m.isLowStock) { c.font = { ...c.font, bold: true, color: { argb: 'FFDC2626' } }; c.fill = fill('FFFEE2E2'); }
      });
    });

    if (data.summary) {
      const s = data.summary;
      const gtRow = matStartRow + 2 + data.statements.length;
      const gv = ['GRAND TOTAL', '', '', '', s.totalClosingStock, '', s.totalOpeningStock, s.totalPurchased, s.totalIssued, s.totalReturned, s.totalPendingReturn, s.totalDamaged, s.totalClosingStock, Number(s.totalValue.toFixed(3)), s.totalTransactions];
      gv.forEach((v: any, ci: number) => {
        const c = ws1.getCell(gtRow, ci + 1);
        c.value = v;
        c.font = { name: 'Segoe UI', size: 10, bold: true };
        c.fill = grandFill;
        c.alignment = ci === 0 ? { horizontal: 'left' } : { horizontal: 'center' };
        if (typeof v === 'number' && ci >= 4) c.numFmt = ci === 13 ? moneyFmt : '#,##0';
        styleCell(c);
      });
    }

    // ── Sheet 2: Transactions ──
    const ws2 = wb.addWorksheet('Transactions');
    const txnCols = [14, 14, 16, 38, 14, 18, 14, 12, 24, 10, 10, 10, 10, 10, 12, 14, 14, 14, 20];
    txnCols.forEach((w, i) => { ws2.getColumn(i + 1).width = w; });
    const txnHeaders = ['Date', 'Type', 'Reference', 'Description', 'Batch #', 'Vendor / Job', 'PO #', 'Job Code', 'Job Title', 'In +', 'Out -', 'Before', 'Balance', 'After', 'Unit Cost', 'Total', 'Person', 'Status', 'Notes'];
    txnHeaders.forEach((h, i) => { const c = ws2.getCell(1, i + 1); c.value = h; c.font = headerFont; c.fill = headerFill; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; styleCell(c); });

    let txnRow = 2;
    const matColors = ['FF3B82F6', 'FF8B5CF6', 'FF10B981', 'FFF59E0B', 'FFEF4444', 'FF6366F1', 'FFEC4899'];
    data.statements.forEach((stmt: any, matIdx: number) => {
      const m = stmt.material;
      const t = stmt.totals;
      const formatD = (ds: string) => { const d = new Date(ds); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
      ws2.mergeCells(txnRow, 1, txnRow, 19);
      const mCell = ws2.getCell(txnRow, 1);
      mCell.value = `${m.name} (${m.sku}) — ${m.category}  |  Opening: ${t.openingStock}  →  Closing: ${t.closingBalance}  |  ${t.totalTransactions} txns`;
      mCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      mCell.fill = fill(matColors[matIdx % matColors.length]);
      txnRow++;
      // Opening row
      ['OPENING', '', '', 'Opening Stock', '', '', '', '', '', '', '', '', t.openingStock, t.openingStock, '', '', '', '', ''].forEach((v: any, ci: number) => {
        const c = ws2.getCell(txnRow, ci + 1);
        c.value = ci === 0 ? (startDate || '') : v;
        c.font = { name: 'Segoe UI', size: 9, bold: ci === 1, color: { argb: 'FF1E40AF' } };
        c.fill = fill('FFDBEAFE');
        c.alignment = ci >= 9 ? { horizontal: 'center' } : { horizontal: 'left' };
        if (typeof v === 'number') c.numFmt = '#,##0';
        styleCell(c);
      });
      txnRow++;
      // Transactions
      stmt.transactions.forEach((tx: any, txi: number) => {
        const txVals = [formatD(tx.date), tx.type, tx.reference || '', tx.description || '', tx.batchNumber || '', tx.vendorName || tx.jobCode || '', tx.poNumber || '', tx.jobCode || '', tx.jobTitle || '', tx.stockIn || 0, tx.stockOut || 0, tx.stockBefore ?? '', tx.balance ?? '', tx.stockAfter ?? '', Number((tx.unitCost || 0).toFixed(3)), Number((tx.totalCost || 0).toFixed(3)), tx.personName || '', tx.approvalStatus || tx.damageStatusLabel || '', tx.notes || ''];
        txVals.forEach((v: any, ci: number) => {
          const c = ws2.getCell(txnRow, ci + 1);
          c.value = v;
          c.font = { name: 'Segoe UI', size: 9 };
          if (txi % 2 === 1) c.fill = altFill;
          if (ci === 1) c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: tx.type === 'PURCHASE' ? 'FF059669' : tx.type === 'ISSUE' ? 'FF2563EB' : tx.type === 'RETURN' ? 'FF059669' : tx.type === 'RETURN_PENDING' ? 'FFD97706' : tx.type === 'DAMAGE' ? 'FFDC2626' : 'FF1E293B' } };
          if (ci >= 9 && ci <= 15 && typeof v === 'number') c.numFmt = ci >= 14 ? moneyFmt : '#,##0';
          c.alignment = ci >= 9 ? { horizontal: 'center' } : { horizontal: 'left' };
          styleCell(c);
        });
        txnRow++;
      });
      // Closing row
      [endDate || '', 'CLOSING', '', 'Closing Stock', '', '', '', '', '', '', '', '', t.closingBalance, t.closingBalance, '', Number(t.totalValue.toFixed(3)), '', '', ''].forEach((v: any, ci: number) => {
        const c = ws2.getCell(txnRow, ci + 1);
        c.value = v;
        c.font = { name: 'Segoe UI', size: 9, bold: ci === 1, color: { argb: 'FF166534' } };
        c.fill = fill('FFDCFCE7');
        c.alignment = ci >= 9 ? { horizontal: 'center' } : { horizontal: 'left' };
        if (typeof v === 'number') c.numFmt = ci >= 14 ? moneyFmt : '#,##0';
        styleCell(c);
      });
      txnRow += 2;
    });

    // ── Sheet 3: Stock Batches ──
    const ws3 = wb.addWorksheet('Stock Batches');
    [28, 14, 16, 22, 14, 14, 14, 12, 12, 14].forEach((w, i) => { ws3.getColumn(i + 1).width = w; });
    const batchHeaders = ['Material', 'SKU', 'Batch #', 'Vendor', 'Purchase Date', 'Qty Purchased', 'Qty Remaining', 'Utilization %', 'Unit Cost', 'Total Cost'];
    batchHeaders.forEach((h, i) => { const c = ws3.getCell(1, i + 1); c.value = h; c.font = headerFont; c.fill = headerFill; c.alignment = { horizontal: 'center' }; styleCell(c); });

    let bRow = 2;
    data.statements.forEach((stmt: any) => {
      if (!stmt.batches || stmt.batches.length === 0) return;
      stmt.batches.forEach((b: any, bi: number) => {
        const util = b.quantityPurchased > 0 ? Number((((b.quantityPurchased - b.quantityRemaining) / b.quantityPurchased) * 100).toFixed(1)) : 0;
        const vals = [stmt.material.name, stmt.material.sku, b.batchNumber, b.vendorName, b.purchaseDate ? new Date(b.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '', b.quantityPurchased, b.quantityRemaining, util, Number((b.unitCost || 0).toFixed(3)), Number((b.totalCost || 0).toFixed(3))];
        vals.forEach((v: any, ci: number) => {
          const c = ws3.getCell(bRow, ci + 1);
          c.value = v;
          c.font = { name: 'Segoe UI', size: 9 };
          if (bi % 2 === 1) c.fill = altFill;
          c.alignment = ci >= 5 ? { horizontal: 'center' } : { horizontal: 'left' };
          if (typeof v === 'number' && ci >= 5) c.numFmt = ci >= 8 ? moneyFmt : ci === 7 ? '0.0' : '#,##0';
          styleCell(c);
          if (ci === 7) {
            if (util > 75) c.fill = fill('FFFEE2E2');
            else if (util > 50) c.fill = fill('FFFEF3C7');
            else c.fill = fill('FFDCFCE7');
          }
        });
        bRow++;
      });
    });

    // Write response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Material_Stock_Statement_PRO_${startDate || 'N/A'}_to_${endDate || 'N/A'}.xlsx"`);
    const buf = await wb.xlsx.writeBuffer();
    res.send(Buffer.from(buf));
  } catch (error) {
    console.error("Error in material-statement-pro/excel:", error);
    res.status(500).json({ error: "Failed to generate Excel report" });
  }
});

export default router;


