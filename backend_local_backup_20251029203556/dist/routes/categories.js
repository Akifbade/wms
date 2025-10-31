"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const upload = (0, multer_1.default)({ dest: 'uploads/categories' });
// Apply auth middleware
router.use(auth_1.authenticateToken);
// Get all categories for a company
router.get('/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const categories = await prisma.category.findMany({
            where: { companyId },
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                color: true,
                icon: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// Get single category
router.get('/detail/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: { company: true },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        console.error('Get category detail error:', error);
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});
// Create category
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        const { companyId, name, description, color, icon } = req.body;
        // Validate required fields
        if (!companyId || !name) {
            return res.status(400).json({ error: 'Company ID and name are required' });
        }
        // Check if category already exists
        const existing = await prisma.category.findUnique({
            where: { name_companyId: { name, companyId } },
        });
        if (existing) {
            return res.status(409).json({ error: 'Category with this name already exists for this company' });
        }
        // Handle file upload
        let logoPath = null;
        if (req.file) {
            logoPath = `/uploads/categories/${req.file.filename}`;
        }
        const category = await prisma.category.create({
            data: {
                name,
                description,
                logo: logoPath,
                color: color || '#000000',
                icon: icon || '📦',
                companyId,
                isActive: true,
            },
        });
        res.status(201).json(category);
    }
    catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});
// Update category
router.put('/:categoryId', upload.single('logo'), async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description, color, icon, isActive } = req.body;
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        // Handle file upload
        let logoPath = category.logo;
        if (req.file) {
            logoPath = `/uploads/categories/${req.file.filename}`;
        }
        const updated = await prisma.category.update({
            where: { id: categoryId },
            data: {
                name: name || category.name,
                description: description !== undefined ? description : category.description,
                logo: logoPath,
                color: color || category.color,
                icon: icon || category.icon,
                isActive: isActive !== undefined ? isActive : category.isActive,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});
// Delete category
router.delete('/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        // Check if category is used by any racks
        const racksCount = await prisma.rack.count({
            where: { categoryId },
        });
        if (racksCount > 0) {
            return res.status(409).json({ error: `Cannot delete category. ${racksCount} rack(s) using this category.` });
        }
        await prisma.category.delete({
            where: { id: categoryId },
        });
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});
exports.default = router;
