"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// ==================== PACKING MATERIALS ====================
/**
 * GET /api/materials
 * List all packing materials for the company
 */
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const materials = await prisma.packingMaterial.findMany({
            where: { companyId },
            include: {
                stockBatches: {
                    select: { quantityRemaining: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(materials);
    }
    catch (error) {
        console.error("Error fetching materials:", error);
        res.status(500).json({ error: "Failed to fetch materials" });
    }
});
/**
 * POST /api/materials
 * Create a new packing material
 */
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const { sku, name, description, unit, category, minStockLevel } = req.body;
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
                companyId,
            },
        });
        res.status(201).json(material);
    }
    catch (error) {
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
router.get("/batches", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const batches = await prisma.stockBatch.findMany({
            where: { companyId },
            include: {
                material: { select: { sku: true, name: true } },
                vendor: { select: { name: true } },
            },
            orderBy: { purchaseDate: "desc" },
        });
        res.json(batches);
    }
    catch (error) {
        console.error("Error fetching stock batches:", error);
        res.status(500).json({ error: "Failed to fetch stock batches" });
    }
});
/**
 * POST /api/materials/batches
 * Record a new stock batch (purchase)
 */
router.post("/batches", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
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
                receivedById: req.user.id,
                notes,
                companyId,
            },
            include: { material: true },
        });
        res.status(201).json(batch);
    }
    catch (error) {
        console.error("Error creating stock batch:", error);
        res.status(500).json({ error: "Failed to create stock batch" });
    }
});
// ==================== MATERIAL ISSUES ====================
/**
 * POST /api/materials/issues
 * Issue materials from stock to a job
 */
router.post("/issues", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const { jobId, materialId, stockBatchId, quantity, notes } = req.body;
        if (!jobId || !materialId || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Get material and batch info for cost calculation
        const material = await prisma.packingMaterial.findUnique({ where: { id: materialId } });
        const batch = stockBatchId ? await prisma.stockBatch.findUnique({ where: { id: stockBatchId } }) : null;
        if (!material) {
            return res.status(404).json({ error: "Material not found" });
        }
        const unitCost = batch?.unitCost || 0;
        const totalCost = quantity * unitCost;
        const issue = await prisma.materialIssue.create({
            data: {
                jobId,
                materialId,
                stockBatchId,
                quantity,
                unitCost,
                totalCost,
                issuedById: req.user.id,
                notes,
                companyId,
            },
            include: { material: true },
        });
        // Deduct from remaining quantity if batch specified
        if (batch) {
            await prisma.stockBatch.update({
                where: { id: stockBatchId },
                data: { quantityRemaining: batch.quantityRemaining - quantity },
            });
        }
        res.status(201).json(issue);
    }
    catch (error) {
        console.error("Error creating material issue:", error);
        res.status(500).json({ error: "Failed to issue material" });
    }
});
// ==================== MATERIAL RETURNS ====================
/**
 * POST /api/materials/returns
 * Record material return after job completion
 */
router.post("/returns", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const { jobId, materialId, quantityGood, quantityDamaged, rackId, notes } = req.body;
        if (!jobId || !materialId) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const return_ = await prisma.materialReturn.create({
            data: {
                jobId,
                materialId,
                quantityGood: quantityGood || 0,
                quantityDamaged: quantityDamaged || 0,
                rackId,
                recordedById: req.user.id,
                notes,
                companyId,
            },
            include: { material: true },
        });
        // Auto-restock good materials to rack if specified
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
            // Mark as restocked
            await prisma.materialReturn.update({
                where: { id: return_.id },
                data: { restocked: true, restockedAt: new Date() },
            });
        }
        res.status(201).json(return_);
    }
    catch (error) {
        console.error("Error creating material return:", error);
        res.status(500).json({ error: "Failed to record material return" });
    }
});
// ==================== MATERIAL APPROVALS ====================
/**
 * GET /api/materials/approvals
 * List all material approvals for the company
 */
router.get("/approvals", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, approvalType } = req.query;
        const where = { companyId };
        if (status)
            where.status = status;
        if (approvalType)
            where.approvalType = approvalType;
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
    }
    catch (error) {
        console.error("Error fetching approvals:", error);
        res.status(500).json({ error: "Failed to fetch approvals" });
    }
});
/**
 * POST /api/materials/approvals
 * Request approval for material return or damage
 */
router.post("/approvals", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const { jobId, approvalType, subjectReturnId, subjectDamageId, notes } = req.body;
        if (!jobId || !approvalType) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const approval = await prisma.materialApproval.create({
            data: {
                jobId,
                approvalType,
                status: "PENDING",
                requestedById: req.user.id,
                subjectReturnId,
                subjectDamageId,
                companyId,
            },
        });
        res.status(201).json(approval);
    }
    catch (error) {
        console.error("Error creating approval:", error);
        res.status(500).json({ error: "Failed to create approval request" });
    }
});
/**
 * PATCH /api/materials/approvals/:approvalId
 * Approve or reject a material approval request
 */
router.patch("/approvals/:approvalId", auth_1.authenticateToken, async (req, res) => {
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
                decisionById: req.user.id,
                decidedAt: new Date(),
                decisionNotes: notes,
            },
        });
        res.json(approval);
    }
    catch (error) {
        console.error("Error updating approval:", error);
        res.status(500).json({ error: "Failed to update approval" });
    }
});
exports.default = router;
