"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Use temp folder first, will organize by job/folder after upload
        const uploadPath = path_1.default.join(__dirname, '../../uploads/temp');
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images, PDFs, documents, and spreadsheets are allowed.'));
        }
    }
});
/**
 * POST /api/job-files/upload
 * Upload files for a moving job
 */
router.post('/upload', auth_1.authenticateToken, upload.array('files', 10), async (req, res) => {
    try {
        const { jobId, folder } = req.body;
        const { id: userId } = req.user;
        const files = req.files;
        if (!jobId || !files || files.length === 0) {
            return res.status(400).json({ error: 'Job ID and files are required' });
        }
        // Verify job exists
        const job = await prisma.movingJob.findFirst({
            where: { id: jobId }
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Move files from temp to proper location and create records
        const fileRecords = await Promise.all(files.map(async (file) => {
            // Create destination directory
            const destFolder = path_1.default.join(__dirname, '../../uploads/job-files', jobId, folder || '');
            if (!fs_1.default.existsSync(destFolder)) {
                fs_1.default.mkdirSync(destFolder, { recursive: true });
            }
            // Move file from temp to destination
            const tempPath = file.path;
            const destPath = path_1.default.join(destFolder, file.filename);
            fs_1.default.renameSync(tempPath, destPath);
            // Create database record
            return prisma.jobFile.create({
                data: {
                    jobId,
                    fileName: file.filename,
                    originalName: file.originalname,
                    filePath: `/uploads/job-files/${jobId}/${folder || ''}/${file.filename}`,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    folderName: folder || null,
                    uploadedBy: userId
                }
            });
        }));
        res.status(201).json({
            success: true,
            files: fileRecords
        });
    }
    catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});
/**
 * GET /api/job-files/:jobId
 * Get all files for a job
 */
router.get('/:jobId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { companyId } = req.user;
        // Verify job belongs to company
        const job = await prisma.movingJob.findFirst({
            where: { id: jobId, companyId }
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const files = await prisma.jobFile.findMany({
            where: { jobId },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json({ files });
    }
    catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});
/**
 * DELETE /api/job-files/:fileId
 * Delete a file
 */
router.delete('/:fileId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await prisma.jobFile.findFirst({
            where: { id: parseInt(fileId) }
        });
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Delete physical file
        const filePath = path_1.default.join(__dirname, '../..', file.filePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Delete database record
        await prisma.jobFile.delete({
            where: { id: parseInt(fileId) }
        });
        res.json({ success: true, message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
/**
 * POST /api/job-files/folder
 * Create a new folder for organization
 */
router.post('/folder', auth_1.authenticateToken, async (req, res) => {
    try {
        const { jobId, folderName } = req.body;
        const { companyId } = req.user;
        if (!jobId || !folderName) {
            return res.status(400).json({ error: 'Job ID and folder name are required' });
        }
        // Verify job belongs to company
        const job = await prisma.movingJob.findFirst({
            where: { id: jobId, companyId }
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Create physical folder
        const folderPath = path_1.default.join(__dirname, '../../uploads/job-files', jobId, folderName);
        fs_1.default.mkdirSync(folderPath, { recursive: true });
        res.json({
            success: true,
            folder: folderName,
            path: `/uploads/job-files/${jobId}/${folderName}`
        });
    }
    catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});
/**
 * GET /api/job-files/:jobId/folders
 * Get all folders for a job
 */
router.get('/:jobId/folders', auth_1.authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        // Verify job exists
        const job = await prisma.movingJob.findFirst({
            where: { id: jobId }
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Get unique folders from files
        const files = await prisma.jobFile.findMany({
            where: { jobId },
            select: { folderName: true },
            distinct: ['folderName']
        });
        const folders = files
            .map((f) => f.folderName)
            .filter((f) => f !== null)
            .sort();
        res.json({ folders });
    }
    catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});
exports.default = router;
