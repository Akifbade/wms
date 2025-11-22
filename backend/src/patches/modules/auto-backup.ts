import { PatchModule } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const autoBackupPatch: PatchModule = {
    id: 'auto-backup',
    description: 'Automatic database backup every 6 hours with 7-day retention',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger, prisma }) => {
        logger.info('Initializing automated backup system...');

        const backupDir = path.join(process.cwd(), 'backups', 'auto');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Run backup every 6 hours
        const backupInterval = setInterval(async () => {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `auto-backup-${timestamp}.sql`;
                const filepath = path.join(backupDir, filename);

                logger.info(`Creating backup: ${filename}`);

                const dbHost = process.env.DB_HOST || 'database';
                const dbPort = process.env.DB_PORT || '3306';
                const dbName = process.env.DB_NAME || 'warehouse_wms';
                const dbUser = process.env.DB_USER || 'root';
                const dbPass = process.env.DB_PASSWORD || 'password';

                const dumpCmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPass} ${dbName} > "${filepath}"`;
                await execAsync(dumpCmd);

                // Delete backups older than 7 days
                const files = fs.readdirSync(backupDir);
                const now = Date.now();
                const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

                files.forEach((file) => {
                    const filePath = path.join(backupDir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.mtimeMs < sevenDaysAgo) {
                        fs.unlinkSync(filePath);
                        logger.info(`Deleted old backup: ${file}`);
                    }
                });

                logger.info(`Backup created successfully: ${filename}`);
            } catch (error: any) {
                logger.error(`Backup failed: ${error.message}`);
            }
        }, 6 * 60 * 60 * 1000); // 6 hours

        logger.info('Auto-backup system active (every 6 hours)');
    },
};

export default autoBackupPatch;
