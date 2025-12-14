"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Configure multer for physical report uploads
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path_1.default.join(__dirname, '../../uploads/physical-reports'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + crypto_1.default.randomBytes(6).toString('hex');
        cb(null, 'REPORT-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
        }
    }
});
/**
 * GET /api/mobile-upload/:returnId/status
 * Check material return status and details (requires authentication)
 */
router.get('/:returnId/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { returnId } = req.params;
        const { companyId, id: userId } = req.user;
        console.log(`[MobileUpload] ============================================`);
        console.log(`[MobileUpload] Status check for return: ${returnId}`);
        console.log(`[MobileUpload] User ID: ${userId}, Company: ${companyId}`);
        // First try to find with company filter
        let materialReturn = await prisma_1.prisma.materialReturn.findFirst({
            where: {
                id: returnId,
                companyId
            },
            select: {
                id: true,
                jobId: true,
                materialId: true,
                quantityGood: true,
                quantityDamaged: true,
                notes: true,
                physicalReportUrl: true,
                recordedAt: true,
                companyId: true,
                material: {
                    select: {
                        name: true,
                        sku: true
                    }
                },
                job: {
                    select: {
                        jobCode: true,
                        clientName: true
                    }
                }
            }
        });
        // If not found, try without company filter (for cross-device QR access)
        if (!materialReturn) {
            console.log(`[MobileUpload] Not found with company filter, trying without...`);
            materialReturn = await prisma_1.prisma.materialReturn.findFirst({
                where: { id: returnId },
                select: {
                    id: true,
                    jobId: true,
                    materialId: true,
                    quantityGood: true,
                    quantityDamaged: true,
                    notes: true,
                    physicalReportUrl: true,
                    recordedAt: true,
                    companyId: true,
                    material: {
                        select: {
                            name: true,
                            sku: true
                        }
                    },
                    job: {
                        select: {
                            jobCode: true,
                            clientName: true
                        }
                    }
                }
            });
            if (materialReturn) {
                console.log(`[MobileUpload] Found return in different company: ${materialReturn.companyId}`);
            }
        }
        if (!materialReturn) {
            console.log(`[MobileUpload] ❌ Return not found at all for ID: ${returnId}`);
            return res.status(404).json({ error: 'Material return not found', returnId });
        }
        console.log(`[MobileUpload] ✅ Found return, uploaded: ${!!materialReturn.physicalReportUrl}`);
        res.json({
            returnId: materialReturn.id,
            jobId: materialReturn.jobId,
            jobNumber: materialReturn.job?.jobCode || 'Unknown',
            customerName: materialReturn.job?.clientName || 'Unknown',
            materialName: materialReturn.material?.name || 'Unknown',
            materialSku: materialReturn.material?.sku || '',
            quantityGood: materialReturn.quantityGood,
            quantityDamaged: materialReturn.quantityDamaged,
            notes: materialReturn.notes,
            uploaded: !!materialReturn.physicalReportUrl,
            fileUrl: materialReturn.physicalReportUrl,
            createdAt: materialReturn.recordedAt
        });
    }
    catch (error) {
        console.error('❌ Upload status check error:', error);
        res.status(500).json({ error: 'Failed to check upload status' });
    }
});
/**
 * POST /api/mobile-upload/:returnId
 * Upload physical report from mobile device (requires authentication)
 */
router.post('/:returnId', auth_1.authenticateToken, upload.single('physicalReport'), async (req, res) => {
    try {
        const { returnId } = req.params;
        const { companyId } = req.user;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Verify return exists and belongs to user's company
        const materialReturn = await prisma_1.prisma.materialReturn.findFirst({
            where: {
                id: returnId,
                companyId
            },
            include: {
                job: true
            }
        });
        if (!materialReturn) {
            return res.status(404).json({ error: 'Material return not found' });
        }
        // Update material return with uploaded file path
        const fileUrl = `/uploads/physical-reports/${file.filename}`;
        await prisma_1.prisma.materialReturn.update({
            where: { id: materialReturn.id },
            data: {
                physicalReportUrl: fileUrl
            }
        });
        console.log(`📱 Mobile upload successful for return ${returnId}, job ${materialReturn.jobId}: ${fileUrl}`);
        res.json({
            success: true,
            message: 'Physical report uploaded successfully',
            fileUrl,
            jobId: materialReturn.jobId,
            fileName: file.filename
        });
    }
    catch (error) {
        console.error('❌ Mobile upload error:', error);
        res.status(500).json({ error: 'Failed to upload physical report' });
    }
});
exports.default = router;
