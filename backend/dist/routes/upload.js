"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Ensure upload directories exist
const ensureUploadDir = (dir) => {
    const fullPath = path_1.default.join(process.cwd(), dir);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
    }
};
// Configure multer storage for logos
const logoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDir('uploads/company-logos');
        cb(null, 'uploads/company-logos');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `company-${uniqueSuffix}${ext}`);
    }
});
// Configure storage for release photos
const releasePhotoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDir('uploads/release-photos');
        cb(null, 'uploads/release-photos');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `release-${uniqueSuffix}${ext}`);
    }
});
// Configure storage for shipment photos
const shipmentPhotoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDir('uploads/shipment-photos');
        cb(null, 'uploads/shipment-photos');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `shipment-${uniqueSuffix}${ext}`);
    }
});
// General photo storage (based on type param)
const generalPhotoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const type = req.body?.type || 'general';
        let dir = 'uploads/general';
        if (type === 'release') {
            dir = 'uploads/release-photos';
        }
        else if (type === 'shipment') {
            dir = 'uploads/shipment-photos';
        }
        else if (type === 'intake') {
            dir = 'uploads/intake-photos';
        }
        ensureUploadDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const type = req.body?.type || 'general';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${type}-${uniqueSuffix}${ext}`);
    }
});
// Legacy storage for logo endpoint
const storage = logoStorage;
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF, SVG, WebP)'));
        }
    }
});
// General photo upload multer instance
const generalUpload = (0, multer_1.default)({
    storage: generalPhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
        }
    }
});
// General photo upload endpoint (for release, intake, shipment photos)
router.post('/', auth_1.authenticateToken, generalUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        // Get the relative path
        const relativePath = req.file.path.replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/') + '/', '');
        const url = `/${relativePath}`;
        console.log('Photo uploaded successfully:', {
            type: req.body?.type || 'general',
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: url
        });
        res.json({
            success: true,
            url,
            filename: req.file.filename,
            fullUrl: `${req.protocol}://${req.get('host')}${url}`,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    }
    catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload photo',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Logo upload endpoint
router.post('/logo', auth_1.authenticateToken, upload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        const logoUrl = `/uploads/company-logos/${req.file.filename}`;
        console.log('Logo uploaded successfully:', {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: logoUrl
        });
        res.json({
            success: true,
            logoUrl,
            filename: req.file.filename,
            fullUrl: `http://localhost:5000${logoUrl}`
        });
    }
    catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload logo',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
    next();
});
exports.default = router;
