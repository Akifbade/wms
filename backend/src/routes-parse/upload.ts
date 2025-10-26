// Parse File Upload Routes
import express from 'express';
import Parse from '../config/parse';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for memory storage (Parse handles file storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/upload/single
 * Upload a single file to Parse
 */
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // Create Parse.File
    const parseFile = new Parse.File(
      req.file.originalname,
      { base64: req.file.buffer.toString('base64') },
      req.file.mimetype
    );

    // Save to Parse Server
    await parseFile.save({ useMasterKey: true });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: parseFile.name(),
        url: parseFile.url(),
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    });
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple files to Parse
 */
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // Create Parse.File
      const parseFile = new Parse.File(
        file.originalname,
        { base64: file.buffer.toString('base64') },
        file.mimetype
      );

      // Save to Parse Server
      await parseFile.save({ useMasterKey: true });

      uploadedFiles.push({
        filename: parseFile.name(),
        url: parseFile.url(),
        size: file.size,
        mimetype: file.mimetype,
      });
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: {
        files: uploadedFiles,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    });
  }
});

/**
 * POST /api/upload/job-file
 * Upload file and attach to job
 */
router.post('/job-file', upload.single('file'), async (req, res) => {
  try {
    const { jobId, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    if (!jobId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Job ID is required' 
      });
    }

    // Create Parse.File
    const parseFile = new Parse.File(
      req.file.originalname,
      { base64: req.file.buffer.toString('base64') },
      req.file.mimetype
    );

    // Save to Parse Server
    await parseFile.save({ useMasterKey: true });

    // Create JobFile record
    const JobFile = Parse.Object.extend('JobFile');
    const jobFile = new JobFile();
    jobFile.set('jobId', jobId);
    jobFile.set('filename', parseFile.name());
    jobFile.set('originalName', req.file.originalname);
    jobFile.set('url', parseFile.url());
    jobFile.set('size', req.file.size);
    jobFile.set('mimetype', req.file.mimetype);
    jobFile.set('description', description || '');
    jobFile.set('uploadedBy', req.body.userId || 'system');
    
    await jobFile.save(null, { useMasterKey: true });

    res.json({
      success: true,
      message: 'File uploaded and attached to job',
      data: {
        id: jobFile.id,
        filename: parseFile.name(),
        originalName: req.file.originalname,
        url: parseFile.url(),
        size: req.file.size,
        mimetype: req.file.mimetype,
        description: description || '',
      },
    });
  } catch (error: any) {
    console.error('Job file upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    });
  }
});

/**
 * GET /api/upload/job-files/:jobId
 * Get all files for a job
 */
router.get('/job-files/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const query = new Parse.Query('JobFile');
    query.equalTo('jobId', jobId);
    query.descending('createdAt');

    const results = await query.find({ useMasterKey: true });
    const files = results.map(file => file.toJSON());

    res.json({
      success: true,
      data: {
        files,
      },
    });
  } catch (error: any) {
    console.error('Get job files error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get files' 
    });
  }
});

/**
 * DELETE /api/upload/job-file/:fileId
 * Delete a job file
 */
router.delete('/job-file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const query = new Parse.Query('JobFile');
    const jobFile = await query.get(fileId, { useMasterKey: true });

    if (!jobFile) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }

    // Delete from Parse
    await jobFile.destroy({ useMasterKey: true });

    // Note: Parse.File itself persists in Parse Server storage
    // You may want to implement cleanup logic if needed

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete file' 
    });
  }
});

/**
 * POST /api/upload/avatar
 * Upload user avatar
 */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Validate file type (images only)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only image files are allowed' 
      });
    }

    // Create Parse.File
    const parseFile = new Parse.File(
      `avatar_${userId}_${Date.now()}${path.extname(req.file.originalname)}`,
      { base64: req.file.buffer.toString('base64') },
      req.file.mimetype
    );

    // Save to Parse Server
    await parseFile.save({ useMasterKey: true });

    // Update user avatar
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { useMasterKey: true });
    user.set('avatar', parseFile.url());
    await user.save(null, { useMasterKey: true });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: parseFile.url(),
      },
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    });
  }
});

/**
 * POST /api/upload/company-logo
 * Upload company logo
 */
router.post('/company-logo', upload.single('logo'), async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID is required' 
      });
    }

    // Validate file type (images only)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only image files are allowed' 
      });
    }

    // Create Parse.File
    const parseFile = new Parse.File(
      `logo_${companyId}_${Date.now()}${path.extname(req.file.originalname)}`,
      { base64: req.file.buffer.toString('base64') },
      req.file.mimetype
    );

    // Save to Parse Server
    await parseFile.save({ useMasterKey: true });

    // Update company logo
    const companyQuery = new Parse.Query('Company');
    const company = await companyQuery.get(companyId, { useMasterKey: true });
    company.set('logo', parseFile.url());
    await company.save(null, { useMasterKey: true });

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        url: parseFile.url(),
      },
    });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Upload failed' 
    });
  }
});

export default router;
