"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Validation schemas
const createItemSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1, 'Item name is required'),
    itemDescription: zod_1.z.string().optional(),
    category: zod_1.z.enum([
        'BAGS',
        'SHOES',
        'ELECTRONICS',
        'FURNITURE',
        'CLOTHING',
        'DOCUMENTS',
        'FRAGILE',
        'GENERAL',
    ]),
    quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    weight: zod_1.z.number().positive().optional(),
    value: zod_1.z.number().positive().optional(),
    barcode: zod_1.z.string().optional(),
    photos: zod_1.z.array(zod_1.z.string()).optional(),
    boxNumbers: zod_1.z.array(zod_1.z.number()).optional(),
    customAttributes: zod_1.z.record(zod_1.z.any()).optional(),
});
const updateItemSchema = createItemSchema.partial();
// Get all items for a shipment
router.get('/shipments/:shipmentId/items', async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const companyId = req.user.companyId;
        // Verify shipment belongs to company
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        const items = await prisma.shipmentItem.findMany({
            where: { shipmentId, companyId },
            orderBy: { createdAt: 'asc' },
        });
        // Parse JSON fields
        const parsedItems = items.map(item => ({
            ...item,
            photos: item.photos ? JSON.parse(item.photos) : [],
            boxNumbers: item.boxNumbers ? JSON.parse(item.boxNumbers) : [],
            customAttributes: item.customAttributes ? JSON.parse(item.customAttributes) : {},
        }));
        res.json({ items: parsedItems });
    }
    catch (error) {
        console.error('Error fetching shipment items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});
// Add item to shipment
router.post('/shipments/:shipmentId/items', async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const companyId = req.user.companyId;
        // Validate request body
        const validatedData = createItemSchema.parse(req.body);
        // Verify shipment belongs to company
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // Create item with JSON fields
        const item = await prisma.shipmentItem.create({
            data: {
                ...validatedData,
                shipmentId,
                companyId,
                photos: validatedData.photos ? JSON.stringify(validatedData.photos) : null,
                boxNumbers: validatedData.boxNumbers ? JSON.stringify(validatedData.boxNumbers) : null,
                customAttributes: validatedData.customAttributes
                    ? JSON.stringify(validatedData.customAttributes)
                    : null,
            },
        });
        // Parse JSON fields for response
        const parsedItem = {
            ...item,
            photos: item.photos ? JSON.parse(item.photos) : [],
            boxNumbers: item.boxNumbers ? JSON.parse(item.boxNumbers) : [],
            customAttributes: item.customAttributes ? JSON.parse(item.customAttributes) : {},
        };
        res.status(201).json({ item: parsedItem });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Error creating shipment item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});
// Update item
router.put('/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const companyId = req.user.companyId;
        // Validate request body
        const validatedData = updateItemSchema.parse(req.body);
        // Verify item belongs to company
        const existingItem = await prisma.shipmentItem.findFirst({
            where: { id: itemId, companyId },
        });
        if (!existingItem) {
            return res.status(404).json({ error: 'Item not found' });
        }
        // Update item
        const item = await prisma.shipmentItem.update({
            where: { id: itemId },
            data: {
                ...validatedData,
                photos: validatedData.photos ? JSON.stringify(validatedData.photos) : undefined,
                boxNumbers: validatedData.boxNumbers ? JSON.stringify(validatedData.boxNumbers) : undefined,
                customAttributes: validatedData.customAttributes
                    ? JSON.stringify(validatedData.customAttributes)
                    : undefined,
            },
        });
        // Parse JSON fields for response
        const parsedItem = {
            ...item,
            photos: item.photos ? JSON.parse(item.photos) : [],
            boxNumbers: item.boxNumbers ? JSON.parse(item.boxNumbers) : [],
            customAttributes: item.customAttributes ? JSON.parse(item.customAttributes) : {},
        };
        res.json({ item: parsedItem });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});
// Delete item
router.delete('/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const companyId = req.user.companyId;
        // Verify item belongs to company
        const item = await prisma.shipmentItem.findFirst({
            where: { id: itemId, companyId },
        });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        await prisma.shipmentItem.delete({
            where: { id: itemId },
        });
        res.json({ message: 'Item deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
// Get items summary by category for a shipment
router.get('/shipments/:shipmentId/items/summary', async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const companyId = req.user.companyId;
        // Verify shipment belongs to company
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        const items = await prisma.shipmentItem.findMany({
            where: { shipmentId, companyId },
        });
        // Group by category
        const summary = items.reduce((acc, item) => {
            const category = item.category;
            if (!acc[category]) {
                acc[category] = {
                    category,
                    totalQuantity: 0,
                    totalWeight: 0,
                    totalValue: 0,
                    itemCount: 0,
                };
            }
            acc[category].totalQuantity += item.quantity;
            acc[category].totalWeight += item.weight || 0;
            acc[category].totalValue += item.value || 0;
            acc[category].itemCount += 1;
            return acc;
        }, {});
        res.json({ summary: Object.values(summary) });
    }
    catch (error) {
        console.error('Error fetching items summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});
// Bulk add items
router.post('/shipments/:shipmentId/items/bulk', async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const companyId = req.user.companyId;
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required' });
        }
        // Verify shipment belongs to company
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        // Validate all items
        const validatedItems = items.map(item => createItemSchema.parse(item));
        // Create all items in a transaction
        const createdItems = await prisma.$transaction(validatedItems.map(item => prisma.shipmentItem.create({
            data: {
                ...item,
                shipmentId,
                companyId,
                photos: item.photos ? JSON.stringify(item.photos) : null,
                boxNumbers: item.boxNumbers ? JSON.stringify(item.boxNumbers) : null,
                customAttributes: item.customAttributes ? JSON.stringify(item.customAttributes) : null,
            },
        })));
        // Parse JSON fields
        const parsedItems = createdItems.map(item => ({
            ...item,
            photos: item.photos ? JSON.parse(item.photos) : [],
            boxNumbers: item.boxNumbers ? JSON.parse(item.boxNumbers) : [],
            customAttributes: item.customAttributes ? JSON.parse(item.customAttributes) : {},
        }));
        res.status(201).json({ items: parsedItems });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Error bulk creating items:', error);
        res.status(500).json({ error: 'Failed to create items' });
    }
});
exports.default = router;
