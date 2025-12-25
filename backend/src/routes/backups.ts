import express from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const router = express.Router();
const prisma = new PrismaClient();
const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || 'C:\\WMS_BACKUPS';
const FULL_BACKUP_DIR = process.env.FULL_BACKUP_DIR || 'C:\\WMS_FULL_BACKUPS';
const MAX_BACKUPS = 10;
const SECRET_PASSWORD = '24865'; // Secret backup access password

// Ensure backup directories exist
async function ensureBackupDirs() {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        await fs.mkdir(FULL_BACKUP_DIR, { recursive: true });
        await fs.mkdir(path.join(BACKUP_DIR, 'auto'), { recursive: true });
        console.log('✅ Backup directories created');
    } catch (error) {
        console.error('Failed to create backup directories:', error);
    }
}

/**
 * POST /api/backups/verify-password
 * Verify backup access password (24865)
 */
router.post('/verify-password', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const { password } = req.body;

        if (password === SECRET_PASSWORD) {
            res.json({ 
                success: true, 
                message: 'Access granted to backup system',
                passwordValid: true
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: 'Invalid backup access password',
                passwordValid: false
            });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/backups/settings
 * Get backup settings (stored in user preferences or company settings)
 */
router.get('/settings', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const { companyId } = req.user!;

        // Get company settings for backups (using company table as storage)
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { 
                id: true, 
                name: true,
                backupSettings: true // JSON field for backup config
            }
        });

        const defaultSettings = {
            autoBackupEnabled: false,
            autoBackupTime: '03:00',
            autoBackupFrequency: 'daily', // daily, weekly, monthly
            includeDatabase: true,
            includeUploads: true,
            includeCode: false,
            maxBackupCount: MAX_BACKUPS,
            emailNotifications: true,
            retentionDays: 30,
            backupLocation: BACKUP_DIR
        };

        const settings = company?.backupSettings || defaultSettings;

        res.json({
            success: true,
            settings: typeof settings === 'string' ? JSON.parse(settings) : settings
        });
    } catch (error: any) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/backups/settings
 * Update backup settings
 */
router.put('/settings', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const { companyId } = req.user!;
        const settings = req.body;

        await prisma.company.update({
            where: { id: companyId },
            data: {
                backupSettings: JSON.stringify(settings)
            }
        });

        res.json({ success: true, settings });
    } catch (error: any) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/backups
 * List all available backups with detailed information
 */
router.get('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        await ensureBackupDirs();

        const backups = [];

        // Get quick backups
        try {
            const files = await fs.readdir(BACKUP_DIR);

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
                        type: 'quick',
                        directory: BACKUP_DIR,
                        autoCreated: false
                    });
                }
            }
        } catch (err) {
            console.log('No quick backups found');
        }

        // Get auto backups
        try {
            const autoFiles = await fs.readdir(path.join(BACKUP_DIR, 'auto'));

            for (const file of autoFiles) {
                if (file.endsWith('.zip')) {
                    const filePath = path.join(BACKUP_DIR, 'auto', file);
                    const stats = await fs.stat(filePath);

                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        type: 'auto',
                        directory: path.join(BACKUP_DIR, 'auto'),
                        autoCreated: true
                    });
                }
            }
        } catch (err) {
            console.log('No auto backups found');
        }

        // Get full system backups
        try {
            const fullFiles = await fs.readdir(FULL_BACKUP_DIR);

            for (const file of fullFiles) {
                if (file.endsWith('.zip') && file.startsWith('WMS_FULL_SYSTEM_')) {
                    const filePath = path.join(FULL_BACKUP_DIR, file);
                    const stats = await fs.stat(filePath);

                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        type: 'full-system',
                        directory: FULL_BACKUP_DIR,
                        autoCreated: false
                    });
                }
            }
        } catch (err) {
            console.log('No full system backups found');
        }

        // Sort by creation time, newest first
        backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        res.json({
            success: true,
            backups,
            backupDir: BACKUP_DIR,
            fullBackupDir: FULL_BACKUP_DIR,
            maxBackups: MAX_BACKUPS,
            stats: {
                totalBackups: backups.length,
                totalSize: backups.reduce((sum, b) => sum + b.size, 0),
                quickBackups: backups.filter(b => b.type === 'quick').length,
                autoBackups: backups.filter(b => b.type === 'auto').length,
                fullSystemBackups: backups.filter(b => b.type === 'full-system').length
            }
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
 * Create a new manual backup with custom options
 */
router.post('/create', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const { 
            includeDatabase = true, 
            includeUploads = true, 
            includeCode = false,
            backupName 
        } = req.body;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const name = backupName || `WMS_BACKUP_${timestamp}`;
        const backupPath = path.join(BACKUP_DIR, name);

        await ensureBackupDirs();
        await fs.mkdir(backupPath, { recursive: true });

        const backupContents: string[] = [];

        // 1. Backup database
        if (includeDatabase) {
            console.log('📊 Backing up database...');
            const dbBackupFile = path.join(backupPath, 'database_warehouse_wms.sql');

            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: '3306',
                user: process.env.DB_USER || 'wms_user',
                password: process.env.DB_PASSWORD || 'wmspassword123',
                database: process.env.DB_NAME || 'warehouse_wms',
            };

            const mysqldumpCmd = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} --single-transaction --routines --triggers --events ${dbConfig.database} > "${dbBackupFile}"`;

            try {
                await execAsync(mysqldumpCmd);
                backupContents.push('Database');
                console.log('✅ Database backed up');
            } catch (dbError: any) {
                console.error('Database backup failed:', dbError);
            }
        }

        // 2. Backup uploads folder
        if (includeUploads) {
            console.log('📁 Backing up uploads...');
            const uploadsSource = path.join(process.cwd(), 'uploads');
            const uploadsBackup = path.join(backupPath, 'uploads');

            try {
                await fs.cp(uploadsSource, uploadsBackup, { recursive: true });
                backupContents.push('Uploads');
                console.log('✅ Uploads backed up');
            } catch (uploadError: any) {
                console.log('⚠️  No uploads folder or backup failed');
            }
        }

        // 3. Backup source code (optional)
        if (includeCode) {
            console.log('💻 Backing up source code...');
            const backendSource = path.join(process.cwd(), 'src');

            try {
                await fs.cp(backendSource, path.join(backupPath, 'backend-src'), { recursive: true });
                backupContents.push('Source Code');
                console.log('✅ Source code backed up');
            } catch (codeError: any) {
                console.log('⚠️  Code backup failed');
            }
        }

        // 4. Create metadata
        console.log('📋 Creating metadata...');
        const metadata = {
            backupDate: new Date().toISOString(),
            backupName: name,
            contents: backupContents,
            databaseName: includeDatabase ? process.env.DB_NAME : null,
            appVersion: process.env.npm_package_version || 'v2.3.1',
            environment: process.env.NODE_ENV || 'production',
            createdBy: req.user!.name || req.user!.email,
            encrypted: false,
            password: SECRET_PASSWORD
        };

        await fs.writeFile(
            path.join(backupPath, 'BACKUP_INFO.json'),
            JSON.stringify(metadata, null, 2)
        );

        // 5. Compress backup
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

        // 6. Remove uncompressed folder
        await fs.rm(backupPath, { recursive: true, force: true });

        // 7. Get backup file stats
        const stats = await fs.stat(zipPath);

        // 8. Cleanup old backups
        await cleanupOldBackups();

        res.json({
            success: true,
            message: 'Backup created successfully',
            backup: {
                name: `${name}.zip`,
                path: zipPath,
                size: stats.size,
                createdAt: stats.birthtime,
                contents: backupContents
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
 * POST /api/backups/create-full-system
 * Create complete system backup (database + code + uploads + configs)
 */
router.post('/create-full-system', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `WMS_FULL_SYSTEM_${timestamp}`;
        const backupPath = path.join(FULL_BACKUP_DIR, backupName);

        await fs.mkdir(backupPath, { recursive: true });
        await fs.mkdir(path.join(backupPath, 'database'), { recursive: true });
        await fs.mkdir(path.join(backupPath, 'backend'), { recursive: true });

        // 1. Database backup
        console.log('📊 Full system: Backing up database...');
        const dbBackupFile = path.join(backupPath, 'database', 'database.sql');
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'wms_user',
            password: process.env.DB_PASSWORD || 'wmspassword123',
            database: process.env.DB_NAME || 'warehouse_wms',
        };

        const mysqldumpCmd = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} --single-transaction ${dbConfig.database} > "${dbBackupFile}"`;
        await execAsync(mysqldumpCmd);

        // 2. Backend files
        console.log('💻 Full system: Backing up backend...');
        const backendDir = path.join(process.cwd());
        await fs.cp(backendDir, path.join(backupPath, 'backend'), { 
            recursive: true,
            filter: (src: string) => !src.includes('node_modules') && !src.includes('dist')
        });

        // 3. Uploads
        try {
            const uploadsDir = path.join(process.cwd(), 'uploads');
            await fs.cp(uploadsDir, path.join(backupPath, 'backend', 'uploads'), { recursive: true });
        } catch {}

        // 4. Create README
        const readme = `WMS FULL SYSTEM BACKUP
Created: ${new Date().toLocaleString()}

This backup contains:
- Complete database with all data
- Backend source code (without node_modules)
- All uploads and user files
- Configuration files

To restore:
1. Extract this ZIP file
2. Run: docker-compose up -d --build
3. Database will be automatically restored

Backup Access Password: ${SECRET_PASSWORD}
`;

        await fs.writeFile(path.join(backupPath, 'README.txt'), readme);

        // 5. Compress
        console.log('🗜️  Full system: Compressing...');
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

        // 6. Cleanup
        await fs.rm(backupPath, { recursive: true, force: true });

        const stats = await fs.stat(zipPath);

        res.json({
            success: true,
            message: 'Full system backup created successfully',
            backup: {
                name: `${backupName}.zip`,
                path: zipPath,
                size: stats.size,
                createdAt: stats.birthtime
            }
        });
    } catch (error: any) {
        console.error('Full system backup error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/backups/:backupName
 * Delete a backup
 */
router.delete('/:backupName', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const { backupName } = req.params;

        // Find backup in all directories
        let backupPath: string | null = null;

        const possiblePaths = [
            path.join(BACKUP_DIR, backupName),
            path.join(BACKUP_DIR, 'auto', backupName),
            path.join(FULL_BACKUP_DIR, backupName)
        ];

        for (const p of possiblePaths) {
            try {
                await fs.access(p);
                backupPath = p;
                break;
            } catch {}
        }

        if (!backupPath) {
            return res.status(404).json({ success: false, error: 'Backup not found' });
        }

        await fs.unlink(backupPath);

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

/**
 * GET /api/backups/download/:backupName
 * Download a backup file
 */
router.get('/download/:backupName', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const { backupName } = req.params;

        // Find backup
        let backupPath: string | null = null;
        const possiblePaths = [
            path.join(BACKUP_DIR, backupName),
            path.join(BACKUP_DIR, 'auto', backupName),
            path.join(FULL_BACKUP_DIR, backupName)
        ];

        for (const p of possiblePaths) {
            try {
                await fs.access(p);
                backupPath = p;
                break;
            } catch {}
        }

        if (!backupPath) {
            return res.status(404).json({ error: 'Backup not found' });
        }

        res.download(backupPath);
    } catch (error: any) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function
async function cleanupOldBackups() {
    try {
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
                    stats: await fs.stat(f.path),
                }))
            );

            stats.sort((a, b) => b.stats.birthtime.getTime() - a.stats.birthtime.getTime());

            const toDelete = stats.slice(MAX_BACKUPS);

            for (const backup of toDelete) {
                await fs.unlink(backup.path);
                console.log(`🗑️  Deleted old backup: ${backup.name}`);
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Initialize backup directories on startup
ensureBackupDirs();

export default router;
