import express from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';

const router = express.Router();
const prisma = new PrismaClient();
const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || 'C:\\WMS_BACKUPS';
const MAX_BACKUPS = 7;

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create backup directory:', error);
  }
}

/**
 * GET /api/backups
 * List all available backups
 */
router.get('/', async (req, res) => {
  try {
    await ensureBackupDir();
    
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.zip') && file.startsWith('WMS_BACKUP_')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        });
      }
    }
    
    // Sort by creation time, newest first
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    res.json({
      success: true,
      backups,
      backupDir: BACKUP_DIR,
      maxBackups: MAX_BACKUPS,
    });
  } catch (error: any) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/backups/create
 * Create a new backup
 */
router.post('/create', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `WMS_BACKUP_${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    await ensureBackupDir();
    await fs.mkdir(backupPath, { recursive: true });
    
    // 1. Backup database
    console.log('📊 Backing up database...');
    const dbBackupFile = path.join(backupPath, 'database_warehouse_wms.sql');
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3307',
      user: process.env.DB_USER || 'wms_user',
      password: process.env.DB_PASSWORD || 'wms_secure_password_2024',
      database: process.env.DB_NAME || 'warehouse_wms',
    };
    
    // Use Docker exec for more reliable backup
    const mysqldumpCmd = `docker exec wms-database mysqldump -u ${dbConfig.user} -p${dbConfig.password} --single-transaction --routines --triggers --events --databases ${dbConfig.database} > "${dbBackupFile}"`;
    
    try {
      await execAsync(mysqldumpCmd);
      console.log('✅ Database backed up');
    } catch (dbError: any) {
      console.error('Database backup failed:', dbError);
      throw new Error('Database backup failed: ' + dbError.message);
    }
    
    // 2. Backup uploads folder
    console.log('📁 Backing up uploads...');
    const uploadsSource = path.join(process.cwd(), 'uploads');
    const uploadsBackup = path.join(backupPath, 'uploads');
    
    try {
      await fs.cp(uploadsSource, uploadsBackup, { recursive: true });
      console.log('✅ Uploads backed up');
    } catch (uploadError: any) {
      console.log('⚠️  No uploads folder or backup failed:', uploadError.message);
    }
    
    // 3. Create metadata
    console.log('📋 Creating metadata...');
    const metadata = {
      backupDate: new Date().toISOString(),
      backupName,
      databaseName: dbConfig.database,
      appVersion: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    };
    
    await fs.writeFile(
      path.join(backupPath, 'BACKUP_INFO.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // 4. Compress backup
    console.log('🗜️  Compressing backup...');
    const zipPath = `${backupPath}.zip`;
    
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => resolve());
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(backupPath, false);
      archive.finalize();
    });
    
    // 5. Remove uncompressed folder
    await fs.rm(backupPath, { recursive: true, force: true });
    
    // 6. Cleanup old backups
    console.log('🧹 Cleaning up old backups...');
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.endsWith('.zip') && f.startsWith('WMS_BACKUP_'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
      }));
    
    if (backupFiles.length > MAX_BACKUPS) {
      const stats = await Promise.all(
        backupFiles.map(async (f) => ({
          ...f,
          mtime: (await fs.stat(f.path)).mtime,
        }))
      );
      
      stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      const toDelete = stats.slice(MAX_BACKUPS);
      
      for (const file of toDelete) {
        await fs.unlink(file.path);
        console.log('🗑️  Deleted old backup:', file.name);
      }
    }
    
    const finalStats = await fs.stat(zipPath);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        name: `${backupName}.zip`,
        path: zipPath,
        size: finalStats.size,
        createdAt: finalStats.birthtime,
      },
    });
  } catch (error: any) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/download/:filename
 * Download a backup file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
    }
    
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found',
      });
    }
    
    // Send file
    res.download(filePath, filename);
  } catch (error: any) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/backups/:filename
 * Delete a backup file
 */
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
    }
    
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found',
      });
    }
    
    // Delete file
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
