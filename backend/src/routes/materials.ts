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

    const return_ = await prisma.materialReturn.create({
      data: {
        jobId,
        materialId,
        issueId,
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
            approvedBy: req.user?.name || 'Manager',
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
          // Reset job status to IN_PROGRESS so they can re-work and re-submit
          await prisma.movingJob.update({
            where: { id: job.id },
            data: { status: 'IN_PROGRESS' },
          });

          const company = await prisma.company.findUnique({ where: { id: companyId } });

          const { materials, totals } = await buildJobMaterialsSummary(companyId, job.id);

          // Send rejection notification to job creator/team leader
          await sendNotification(companyId, 'JOB_COMPLETION_REJECTED', {
            jobCode: job.jobCode,
            customerName: job.clientName,
            rejectedBy: req.user?.name || 'Manager',
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
        // Only add to running balance if return has been restocked (approved)
        const isRestocked = ret.restocked === true;
        if (isRestocked) {
          runningBalance += ret.quantityGood;
        }
        transactions.push({
          id: ret.id,
          type: isRestocked ? 'RETURN' : 'RETURN_PENDING_APPROVAL',
          quantity: ret.quantityGood,
          balanceAfter: runningBalance,
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

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

export default router;


