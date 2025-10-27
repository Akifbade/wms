import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    companyId: string;
    role: string;
  };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const { jobId } = req.body;
    const folder = req.body.folder || '';
    const uploadPath = path.join(__dirname, '../../uploads/job-files', jobId, folder);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, documents, and spreadsheets are allowed.'));
    }
  }
});

/**
 * POST /api/job-files/upload
 * Upload files for a moving job
 */
router.post('/upload', authenticateToken as any, upload.array('files', 10), async (req: any, res) => {
  try {
    const { jobId, folder } = req.body;
    const { id: userId } = req.user;
    const files = req.files as Express.Multer.File[];

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

    // Create file records
    const fileRecords = await Promise.all(
      files.map(file => 
        prisma.jobFile.create({
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
        })
      )
    );

    res.status(201).json({
      success: true,
      files: fileRecords
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * GET /api/job-files/:jobId
 * Get all files for a job
 */
router.get('/:jobId', authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;

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

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * DELETE /api/job-files/:fileId
 * Delete a file
 */
router.delete('/:fileId', authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;

    const file = await prisma.jobFile.findFirst({
      where: { id: parseInt(fileId) }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '../..', file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.jobFile.delete({
      where: { id: parseInt(fileId) }
    });

    res.json({ success: true, message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /api/job-files/folder
 * Create a new folder for organization
 */
router.post('/folder', authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId, folderName } = req.body;
    const { companyId } = req.user!;

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
    const folderPath = path.join(__dirname, '../../uploads/job-files', jobId, folderName);
    fs.mkdirSync(folderPath, { recursive: true });

    res.json({ 
      success: true, 
      folder: folderName,
      path: `/uploads/job-files/${jobId}/${folderName}`
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * GET /api/job-files/:jobId/folders
 * Get all folders for a job
 */
router.get('/:jobId/folders', authenticateToken as any, async (req: AuthRequest, res) => {
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
      .map((f: any) => f.folderName)
      .filter((f: any) => f !== null)
      .sort();

    res.json({ folders });

  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

export default router;
