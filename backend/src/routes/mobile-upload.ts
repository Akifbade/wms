import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Configure multer for physical report uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/physical-reports'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, 'REPORT-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

/**
 * POST /api/mobile-upload/generate-token
 * Generate upload token for mobile scanner
 */
router.post('/generate-token', async (req: Request, res: Response) => {
  try {
    const { jobId, companyId, userId } = req.body;

    if (!jobId || !companyId) {
      return res.status(400).json({ error: 'jobId and companyId required' });
    }

    // Generate secure token
    const uploadToken = crypto.randomBytes(32).toString('hex');
    const uploadTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token in a temporary upload session (or in MaterialReturn if already created)
    // For now, we'll return token and store it when material return is created
    
    res.json({
      uploadToken,
      uploadTokenExpiry,
      uploadUrl: `/mobile-upload/${uploadToken}`,
      qrCodeData: JSON.stringify({
        token: uploadToken,
        jobId,
        companyId,
        userId,
        expiry: uploadTokenExpiry.toISOString()
      })
    });
  } catch (error) {
    console.error('❌ Generate token error:', error);
    res.status(500).json({ error: 'Failed to generate upload token' });
  }
});

/**
 * POST /api/mobile-upload/:token
 * Upload physical report from mobile device
 */
router.post('/:token', upload.single('physicalReport'), async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Invalid upload token' });
    }

    // Verify token and get associated material return
    const materialReturn = await prisma.materialReturn.findFirst({
      where: {
        uploadToken: token,
        uploadTokenExpiry: {
          gte: new Date() // Token not expired
        }
      },
      include: {
        job: true
      }
    });

    if (!materialReturn) {
      return res.status(404).json({ error: 'Invalid or expired upload token' });
    }

    // Update material return with uploaded file path
    const fileUrl = `/uploads/physical-reports/${file.filename}`;
    
    await prisma.materialReturn.update({
      where: { id: materialReturn.id },
      data: {
        physicalReportUrl: fileUrl,
        uploadToken: null, // Clear token after successful upload
        uploadTokenExpiry: null
      }
    });

    console.log(`📱 Mobile upload successful for job ${materialReturn.jobId}: ${fileUrl}`);

    res.json({
      success: true,
      message: 'Physical report uploaded successfully',
      fileUrl,
      jobId: materialReturn.jobId,
      fileName: file.filename
    });
  } catch (error) {
    console.error('❌ Mobile upload error:', error);
    res.status(500).json({ error: 'Failed to upload physical report' });
  }
});

/**
 * GET /api/mobile-upload/:token/status
 * Check upload status for real-time updates
 */
router.get('/:token/status', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const materialReturn = await prisma.materialReturn.findFirst({
      where: {
        uploadToken: token
      },
      select: {
        id: true,
        jobId: true,
        physicalReportUrl: true,
        uploadTokenExpiry: true
      }
    });

    if (!materialReturn) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const isExpired = materialReturn.uploadTokenExpiry && materialReturn.uploadTokenExpiry < new Date();

    res.json({
      uploaded: !!materialReturn.physicalReportUrl,
      fileUrl: materialReturn.physicalReportUrl,
      expired: isExpired,
      jobId: materialReturn.jobId
    });
  } catch (error) {
    console.error('❌ Upload status check error:', error);
    res.status(500).json({ error: 'Failed to check upload status' });
  }
});

export default router;
