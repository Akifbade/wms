/**
 * Complete System Backup Script
 * Creates a full backup including source code, database, uploads, and Docker configs
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const archiver = require('archiver');
const { createWriteStream } = require('fs');

const execAsync = promisify(exec);

async function createCompleteBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `WMS_FULL_SYSTEM_${timestamp}`;
    const backupDir = process.env.FULL_BACKUP_DIR || 'C:\\WMS_FULL_BACKUPS';
    const backupPath = path.join(backupDir, backupName);
    const projectRoot = path.join(__dirname, '..');

    console.log('🚀 Starting complete system backup...');
    console.log(`📁 Backup location: ${backupPath}`);

    // Create backup directories
    await fs.mkdir(path.join(backupPath, 'database'), { recursive: true });
    await fs.mkdir(path.join(backupPath, 'backend'), { recursive: true });
    await fs.mkdir(path.join(backupPath, 'frontend'), { recursive: true });

    // 1. Backup database
    console.log('[1/6] Backing up database...');
    const dbFile = path.join(backupPath, 'database', 'database.sql');
    const dbCmd = `docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction --routines --triggers warehouse_wms > "${dbFile}"`;
    await execAsync(dbCmd);
    console.log('  ✅ Database backed up');

    // 2. Backup backend source (exclude node_modules, dist, uploads)
    console.log('[2/6] Backing up backend source...');
    const backendSrc = path.join(projectRoot, 'backend');
    const backendDest = path.join(backupPath, 'backend');
    await copyDirExcluding(backendSrc, backendDest, ['node_modules', 'dist', 'uploads']);
    console.log('  ✅ Backend source backed up');

    // 3. Backup backend uploads
    console.log('[3/6] Backing up uploads...');
    const uploadsSrc = path.join(backendSrc, 'uploads');
    const uploadsDest = path.join(backendDest, 'uploads');
    try {
        await fs.access(uploadsSrc);
        await copyDir(uploadsSrc, uploadsDest);
        console.log('  ✅ Uploads backed up');
    } catch {
        console.log('  ⚠️  No uploads folder');
    }

    // 4. Backup frontend source (exclude node_modules, dist)
    console.log('[4/6] Backing up frontend source...');
    const frontendSrc = path.join(projectRoot, 'frontend');
    const frontendDest = path.join(backupPath, 'frontend');
    await copyDirExcluding(frontendSrc, frontendDest, ['node_modules', 'dist']);
    console.log('  ✅ Frontend source backed up');

    // 5. Backup Docker configs
    console.log('[5/6] Backing up Docker configs...');
    const configs = [
        'docker-compose.yml',
        'docker-compose.override.yml',
        '.env',
        '.env.example',
    ];
    for (const file of configs) {
        const src = path.join(projectRoot, file);
        const dest = path.join(backupPath, file);
        try {
            await fs.copyFile(src, dest);
        } catch {
            // File doesn't exist, skip
        }
    }
    console.log('  ✅ Docker configs backed up');

    // 6. Create README
    const readme = `WMS COMPLETE SYSTEM BACKUP
Backup Date: ${new Date().toLocaleString()}
Backup Name: ${backupName}

QUICK RESTORE:
1. Extract this ZIP to desired location (e.g., C:\\WMS)
2. Run: docker-compose up -d --build
3. Wait 30 seconds
4. Import database: Get-Content database\\database.sql | docker exec -i wms-database mysql -u wms_user -pwmspassword123 warehouse_wms
5. System is running at http://localhost

INCLUDES:
- Complete backend source code
- Complete frontend source code
- Full database with all data
- All uploads and user files
- Docker configurations
- Environment files
`;
    await fs.writeFile(path.join(backupPath, 'README.txt'), readme);

    // 7. Compress to ZIP
    console.log('[6/6] Compressing to ZIP...');
    const zipPath = `${backupPath}.zip`;
    await compressToZip(backupPath, zipPath);
    
    // Delete temp folder
    await fs.rm(backupPath, { recursive: true, force: true });
    
    const stats = await fs.stat(zipPath);
    console.log(`✅ Complete backup created: ${stats.size} bytes`);

    // 8. Cleanup old backups (keep 7)
    const files = await fs.readdir(backupDir);
    const backups = files
        .filter(f => f.startsWith('WMS_FULL_SYSTEM_') && f.endsWith('.zip'))
        .map(f => ({ name: f, path: path.join(backupDir, f) }));
    
    if (backups.length > 7) {
        const statsArr = await Promise.all(
            backups.map(async b => ({
                ...b,
                mtime: (await fs.stat(b.path)).mtime
            }))
        );
        statsArr.sort((a, b) => b.mtime - a.mtime);
        for (let i = 7; i < statsArr.length; i++) {
            await fs.unlink(statsArr[i].path);
            console.log(`🗑️  Deleted old backup: ${statsArr[i].name}`);
        }
    }

    return {
        success: true,
        name: path.basename(zipPath),
        path: zipPath,
        size: stats.size,
        createdAt: new Date().toISOString(),
    };
}

async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function copyDirExcluding(src, dest, exclude) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        if (exclude.includes(entry.name)) continue;
        
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirExcluding(srcPath, destPath, exclude);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

function compressToZip(sourceDir, zipPath) {
    return new Promise((resolve, reject) => {
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => resolve());
        archive.on('error', reject);
        
        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

module.exports = { createCompleteBackup };

// If run directly
if (require.main === module) {
    createCompleteBackup()
        .then(result => {
            console.log('✅ SUCCESS:', JSON.stringify(result));
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ ERROR:', error.message);
            process.exit(1);
        });
}
