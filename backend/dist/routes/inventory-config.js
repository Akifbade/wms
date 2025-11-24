"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
const configSchema = zod_1.z.object({
    itemTypes: zod_1.z.array(zod_1.z.string()),
    units: zod_1.z.array(zod_1.z.string()),
    lowStockThreshold: zod_1.z.number().optional(),
});
// GET config
router.get('/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const result = await prisma.$queryRaw `
      SELECT * FROM inventory_configurations WHERE companyId = ${companyId}
    `;
        const config = result[0];
        if (!config) {
            return res.status(404).json({ success: false, error: 'Config not found' });
        }
        res.json({
            success: true,
            data: {
                ...config,
                itemTypes: JSON.parse(config.itemTypes || '[]'),
                units: JSON.parse(config.units || '[]'),
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST create config
router.post('/', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const data = configSchema.parse(req.body);
        const companyId = req.user.companyId;
        const id = 'config_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        await prisma.$executeRaw `
      INSERT INTO inventory_configurations 
      (id, companyId, itemTypes, units, lowStockThreshold, createdAt, updatedAt)
      VALUES (${id}, ${companyId}, ${JSON.stringify(data.itemTypes)}, ${JSON.stringify(data.units)}, ${data.lowStockThreshold || 10}, NOW(), NOW())
    `;
        res.status(201).json({ success: true, message: 'Config created', id });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// PUT update config
router.put('/:companyId', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const data = configSchema.parse(req.body);
        await prisma.$executeRaw `
      UPDATE inventory_configurations 
      SET itemTypes = ${JSON.stringify(data.itemTypes)}, 
          units = ${JSON.stringify(data.units)}, 
          lowStockThreshold = ${data.lowStockThreshold || 10}, 
          updatedAt = NOW() 
      WHERE companyId = ${companyId}
    `;
        res.json({ success: true, message: 'Config updated' });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
