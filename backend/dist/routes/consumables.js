"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
const addConsumableSchema = zod_1.z.object({
    rackId: zod_1.z.string(),
    itemType: zod_1.z.string(),
    quantity: zod_1.z.number().positive(),
    unit: zod_1.z.string(),
    minThreshold: zod_1.z.number().optional(),
});
const transferSchema = zod_1.z.object({
    fromRackId: zod_1.z.string(),
    toRackId: zod_1.z.string(),
    itemType: zod_1.z.string(),
    quantity: zod_1.z.number().positive(),
    unit: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
const disposeSchema = zod_1.z.object({
    rackId: zod_1.z.string(),
    itemType: zod_1.z.string(),
    quantity: zod_1.z.number().positive(),
    disposalType: zod_1.z.enum(['USED', 'DAMAGED', 'EXPIRED', 'WASTE']),
    reason: zod_1.z.string().optional(),
});
const sellSchema = zod_1.z.object({
    rackId: zod_1.z.string(),
    itemType: zod_1.z.string(),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().positive(),
    description: zod_1.z.string().optional(),
});
// GET all consumables for company
router.get('/company/all', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const consumables = await prisma.$queryRaw `
      SELECT rc.*, r.code as rackCode 
      FROM rack_consumables rc 
      LEFT JOIN racks r ON rc.rackId = r.id 
      WHERE rc.companyId = ${companyId}
      ORDER BY r.code, rc.itemType
    `;
        res.json({ success: true, data: consumables });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET consumables for specific rack
router.get('/rack/:rackId', async (req, res) => {
    try {
        const { rackId } = req.params;
        const companyId = req.user.companyId;
        const consumables = await prisma.$queryRaw `
      SELECT * FROM rack_consumables 
      WHERE rackId = ${rackId} AND companyId = ${companyId}
    `;
        res.json({ success: true, data: consumables });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST add new consumable
router.post('/', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = addConsumableSchema.parse(req.body);
        const companyId = req.user.companyId;
        const id = 'consumable_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        await prisma.$executeRaw `
      INSERT INTO rack_consumables 
      (id, rackId, companyId, itemType, quantity, unit, minThreshold, lastRestocked, restokedBy, createdAt, updatedAt)
      VALUES (${id}, ${data.rackId}, ${companyId}, ${data.itemType}, ${data.quantity}, ${data.unit}, ${data.minThreshold || 0}, NOW(), ${req.user.id}, NOW(), NOW())
    `;
        res.status(201).json({ success: true, message: 'Consumable added', id });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// POST transfer stock
router.post('/transfer/stock', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = transferSchema.parse(req.body);
        const companyId = req.user.companyId;
        // Get from consumable
        const fromResult = await prisma.$queryRaw `
      SELECT * FROM rack_consumables 
      WHERE rackId = ${data.fromRackId} AND itemType = ${data.itemType} AND companyId = ${companyId}
    `;
        const fromConsumable = fromResult[0];
        if (!fromConsumable || fromConsumable.quantity < data.quantity) {
            return res.status(400).json({ success: false, error: 'Insufficient quantity' });
        }
        // Get or create to consumable
        const toResult = await prisma.$queryRaw `
      SELECT * FROM rack_consumables 
      WHERE rackId = ${data.toRackId} AND itemType = ${data.itemType} AND companyId = ${companyId}
    `;
        let toConsumable = toResult[0];
        if (!toConsumable) {
            const newId = 'consumable_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            await prisma.$executeRaw `
        INSERT INTO rack_consumables 
        (id, rackId, companyId, itemType, quantity, unit, minThreshold, lastRestocked, restokedBy, createdAt, updatedAt)
        VALUES (${newId}, ${data.toRackId}, ${companyId}, ${data.itemType}, 0, ${data.unit}, 0, NOW(), ${req.user.id}, NOW(), NOW())
      `;
            toConsumable = { id: newId, quantity: 0 };
        }
        // Update quantities
        await prisma.$executeRaw `
      UPDATE rack_consumables SET quantity = quantity - ${data.quantity} WHERE id = ${fromConsumable.id}
    `;
        await prisma.$executeRaw `
      UPDATE rack_consumables SET quantity = quantity + ${data.quantity} WHERE id = ${toConsumable.id}
    `;
        // Log movement
        const movementId = 'movement_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        await prisma.$executeRaw `
      INSERT INTO consumable_movements 
      (id, fromRackId, toRackId, fromConsumableId, toConsumableId, companyId, itemType, quantity, unit, movementType, reason, movedBy, createdAt)
      VALUES (${movementId}, ${data.fromRackId}, ${data.toRackId}, ${fromConsumable.id}, ${toConsumable.id}, ${companyId}, ${data.itemType}, ${data.quantity}, ${data.unit}, 'TRANSFER', ${data.reason || null}, ${req.user.id}, NOW())
    `;
        res.json({ success: true, message: 'Stock transferred' });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// POST dispose
router.post('/dispose/item', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = disposeSchema.parse(req.body);
        const companyId = req.user.companyId;
        const result = await prisma.$queryRaw `
      SELECT * FROM rack_consumables 
      WHERE rackId = ${data.rackId} AND itemType = ${data.itemType} AND companyId = ${companyId}
    `;
        const consumable = result[0];
        if (!consumable || consumable.quantity < data.quantity) {
            return res.status(400).json({ success: false, error: 'Insufficient quantity' });
        }
        await prisma.$executeRaw `
      UPDATE rack_consumables SET quantity = quantity - ${data.quantity} WHERE id = ${consumable.id}
    `;
        const disposalId = 'disposal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        await prisma.$executeRaw `
      INSERT INTO consumable_disposals 
      (id, consumableId, companyId, itemType, quantity, unit, disposalType, reason, disposedBy, createdAt)
      VALUES (${disposalId}, ${consumable.id}, ${companyId}, ${data.itemType}, ${data.quantity}, ${consumable.unit}, ${data.disposalType}, ${data.reason || null}, ${req.user.id}, NOW())
    `;
        res.json({ success: true, message: 'Consumable disposed' });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// POST sell
router.post('/sell/material', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = sellSchema.parse(req.body);
        const companyId = req.user.companyId;
        const result = await prisma.$queryRaw `
      SELECT * FROM rack_consumables 
      WHERE rackId = ${data.rackId} AND itemType = ${data.itemType} AND companyId = ${companyId}
    `;
        const consumable = result[0];
        if (!consumable || consumable.quantity < data.quantity) {
            return res.status(400).json({ success: false, error: 'Insufficient quantity' });
        }
        const totalPrice = data.quantity * data.unitPrice;
        await prisma.$executeRaw `
      UPDATE rack_consumables SET quantity = quantity - ${data.quantity} WHERE id = ${consumable.id}
    `;
        const saleId = 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        await prisma.$executeRaw `
      INSERT INTO consumable_sales 
      (id, consumableId, companyId, itemType, quantity, unit, unitPrice, totalPrice, saleDescription, soldBy, createdAt)
      VALUES (${saleId}, ${consumable.id}, ${companyId}, ${data.itemType}, ${data.quantity}, ${consumable.unit}, ${data.unitPrice}, ${totalPrice}, ${data.description || null}, ${req.user.id}, NOW())
    `;
        res.json({ success: true, message: 'Material sold', revenue: totalPrice });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// GET sales report
router.get('/sales/report/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const sales = await prisma.$queryRaw `
      SELECT * FROM consumable_sales WHERE companyId = ${companyId} ORDER BY createdAt DESC
    `;
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);
        res.json({ success: true, sales, totalRevenue });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
