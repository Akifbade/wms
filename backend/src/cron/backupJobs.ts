/**
 * AUTO BACKUP CRON JOB
 * Handles scheduled automatic backups with:
 * - Configurable time and frequency
 * - Retention policy enforcement
 * - Email notifications
 * - Git backup sync (optional)
 * - Overflow protection (max backups limit)
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import { sendNotification } from '../services/emailService';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Backup directories
const BACKUP_DIR = 'C:\\WMS_BACKUPS';
const AUTO_BACKUP_DIR = 'C:\\WMS_BACKUPS\\auto';
const FULL_SYSTEM_DIR = 'C:\\WMS_FULL_BACKUPS';
const GIT_BACKUP_DIR = 'C:\\WMS_GIT_BACKUPS';

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.mkdir(AUTO_BACKUP_DIR, { recursive: true });
    await fs.mkdir(FULL_SYSTEM_DIR, { recursive: true });
    await fs.mkdir(GIT_BACKUP_DIR, { recursive: true });
    console.log('✅ Backup directories ensured');
  } catch (error) {
    console.error('❌ Error creating backup directories:', error);
  }
}

// Get all companies with backup settings enabled
async function getEnabledBackupCompanies() {
  try {
    const companies = await prisma.company.findMany({
      where: {
        backupSettings: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        backupSettings: true
      }
    });

    return companies.filter(company => {
      if (!company.backupSettings) return false;
      try {
        const settings = JSON.parse(company.backupSettings);
        return settings.autoBackupEnabled === true;
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.error('❌ Error fetching companies with auto-backup:', error);
    return [];
  }
}

// Create database backup
async function createDatabaseBackup(companyId: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `DB_AUTO_${companyId}_${timestamp}_${Date.now()}.sql`;
  const filepath = path.join(AUTO_BACKUP_DIR, filename);

  try {
    const { stdout, stderr } = await execAsync(
      `docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction --routines --triggers warehouse_wms`
    );

    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }

    await fs.writeFile(filepath, stdout, 'utf-8');
    console.log(`✅ Database backup created: ${filename}`);
    return filepath;
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    throw error;
  }
}

// Create full system backup with all data
async function createFullSystemBackup(companyId: string, companyName: string): Promise<{ path: string; size: number }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `FULL_SYSTEM_AUTO_${companyName.replace(/\s+/g, '_')}_${timestamp}_${Date.now()}.zip`;
  const zipPath = path.join(FULL_SYSTEM_DIR, filename);

  return new Promise(async (resolve, reject) => {
    try {
      // Create database backup first
      const dbBackupPath = await createDatabaseBackup(companyId);

      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      let totalSize = 0;

      output.on('close', () => {
        totalSize = archive.pointer();
        console.log(`✅ Full system backup created: ${filename} (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
        
        // Delete temporary DB file
        fs.unlink(dbBackupPath).catch(console.error);
        
        resolve({ path: zipPath, size: totalSize });
      });

      archive.on('error', (err) => {
        console.error('❌ Archive error:', err);
        reject(err);
      });

      archive.pipe(output);

      // Add database backup
      archive.file(dbBackupPath, { name: 'database.sql' });

      // Add uploads if they exist
      const uploadsPath = path.join(process.cwd(), 'backend', 'uploads');
      try {
        await fs.access(uploadsPath);
        archive.directory(uploadsPath, 'uploads');
      } catch {
        console.log('⚠️ No uploads directory found');
      }

      // Add backend source code
      const backendPath = path.join(process.cwd(), 'backend');
      archive.directory(backendPath, 'backend', (entry) => {
        // Exclude node_modules and dist
        if (entry.name.includes('node_modules') || entry.name.includes('dist')) {
          return false;
        }
        return entry;
      });

      // Add frontend source code
      const frontendPath = path.join(process.cwd(), 'frontend');
      archive.directory(frontendPath, 'frontend', (entry) => {
        // Exclude node_modules and dist
        if (entry.name.includes('node_modules') || entry.name.includes('dist')) {
          return false;
        }
        return entry;
      });

      // Add docker configs
      const dockerCompose = path.join(process.cwd(), 'docker-compose.yml');
      try {
        await fs.access(dockerCompose);
        archive.file(dockerCompose, { name: 'docker-compose.yml' });
      } catch {
        console.log('⚠️ No docker-compose.yml found');
      }

      await archive.finalize();
    } catch (error) {
      console.error('❌ Full system backup failed:', error);
      reject(error);
    }
  });
}

// Enforce retention policy - delete old backups
async function enforceRetentionPolicy(directory: string, maxBackups: number, retentionDays: number, companyId: string) {
  try {
    const files = await fs.readdir(directory);
    
    // Filter only backup files for this company
    const backupFiles = files.filter(f => 
      f.endsWith('.zip') || f.endsWith('.sql')
    );

    if (backupFiles.length === 0) return { deleted: 0, reason: 'no-backups' };

    // Get file stats
    const filesWithStats = await Promise.all(
      backupFiles.map(async (file) => {
        const filepath = path.join(directory, file);
        const stats = await fs.stat(filepath);
        return {
          name: file,
          path: filepath,
          mtime: stats.mtime,
          size: stats.size
        };
      })
    );

    // Sort by modification time (oldest first)
    filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

    const deletedFiles: string[] = [];
    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

    // Delete based on retention days
    for (const file of filesWithStats) {
      const age = now - file.mtime.getTime();
      if (age > retentionMs) {
        await fs.unlink(file.path);
        deletedFiles.push(file.name);
        console.log(`🗑️ Deleted old backup: ${file.name} (${(age / 1000 / 60 / 60 / 24).toFixed(1)} days old)`);
      }
    }

    // Delete based on max count (keep only latest N)
    const remaining = filesWithStats.filter(f => !deletedFiles.includes(f.name));
    if (remaining.length > maxBackups) {
      const toDelete = remaining.slice(0, remaining.length - maxBackups);
      for (const file of toDelete) {
        await fs.unlink(file.path);
        deletedFiles.push(file.name);
        console.log(`🗑️ Deleted excess backup: ${file.name} (overflow protection)`);
      }
    }

    if (deletedFiles.length > 0) {
      // Send notification
      try {
        await sendNotification(companyId, 'BACKUP_RETENTION_CLEANUP', {
          deletedCount: deletedFiles.length,
          deletedFiles: deletedFiles.slice(0, 5), // Show first 5
          retentionDays,
          maxBackups,
          cleanedAt: new Date().toLocaleString(),
          directory: directory.split('\\').pop() || 'unknown'
        });
      } catch (emailErr) {
        console.error('❌ Failed to send cleanup notification:', emailErr);
      }
    }

    return { deleted: deletedFiles.length, files: deletedFiles };
  } catch (error) {
    console.error('❌ Error enforcing retention policy:', error);
    return { deleted: 0, error: error.message };
  }
}

// Backup to Git repository (optional feature)
async function backupToGit(backupPath: string, companyId: string, companyName: string) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const gitBackupPath = path.join(GIT_BACKUP_DIR, companyName.replace(/\s+/g, '_'));

    // Ensure git backup directory exists
    await fs.mkdir(gitBackupPath, { recursive: true });

    // Copy backup to git directory
    const destPath = path.join(gitBackupPath, path.basename(backupPath));
    await fs.copyFile(backupPath, destPath);

    // Check if git repo exists
    try {
      await execAsync('git status', { cwd: gitBackupPath });
    } catch {
      // Initialize git repo
      await execAsync('git init', { cwd: gitBackupPath });
      await execAsync('git config user.email "backup@wms.local"', { cwd: gitBackupPath });
      await execAsync('git config user.name "WMS Backup System"', { cwd: gitBackupPath });
    }

    // Commit backup
    await execAsync(`git add "${path.basename(backupPath)}"`, { cwd: gitBackupPath });
    await execAsync(`git commit -m "Auto backup: ${timestamp}"`, { cwd: gitBackupPath });

    console.log(`✅ Git backup committed: ${path.basename(backupPath)}`);

    // Send notification
    await sendNotification(companyId, 'BACKUP_GIT_SYNC', {
      backupFile: path.basename(backupPath),
      syncedAt: new Date().toLocaleString(),
      repository: gitBackupPath,
      companyName
    });

    return { success: true, path: destPath };
  } catch (error) {
    console.error('❌ Git backup failed:', error);
    return { success: false, error: error.message };
  }
}

// Run auto backup for a company
async function runAutoBackup(companyId: string, companyName: string, settings: any) {
  console.log(`\n🔄 [AUTO-BACKUP] Starting for ${companyName} (${companyId})`);

  try {
    let backupPath: string;
    let backupSize: number;
    let backupType: string;

    // Determine what to include based on settings
    if (settings.includeDatabase && settings.includeUploads && settings.includeCode) {
      // Full system backup
      const result = await createFullSystemBackup(companyId, companyName);
      backupPath = result.path;
      backupSize = result.size;
      backupType = 'FULL_SYSTEM';
    } else {
      // Quick database backup
      backupPath = await createDatabaseBackup(companyId);
      const stats = await fs.stat(backupPath);
      backupSize = stats.size;
      backupType = 'DATABASE';
    }

    // Enforce retention policy
    const maxBackups = settings.maxBackupCount || 10;
    const retentionDays = settings.retentionDays || 30;
    
    const cleanupResult = await enforceRetentionPolicy(
      backupType === 'FULL_SYSTEM' ? FULL_SYSTEM_DIR : AUTO_BACKUP_DIR,
      maxBackups,
      retentionDays,
      companyId
    );

    console.log(`🗑️ [AUTO-BACKUP] Cleanup: Deleted ${cleanupResult.deleted} old backups`);

    // Backup to Git if enabled
    if (settings.gitBackupEnabled) {
      await backupToGit(backupPath, companyId, companyName);
    }

    // Send success notification
    if (settings.emailNotifications) {
      await sendNotification(companyId, 'BACKUP_AUTO_COMPLETED', {
        backupType: backupType === 'FULL_SYSTEM' ? 'Full System' : 'Database Only',
        backupSize: (backupSize / 1024 / 1024).toFixed(2) + ' MB',
        backupFile: path.basename(backupPath),
        createdAt: new Date().toLocaleString(),
        companyName,
        retentionDays,
        maxBackups,
        cleanedUp: cleanupResult.deleted,
        nextBackup: getNextBackupTime(settings)
      });
    }

    console.log(`✅ [AUTO-BACKUP] Completed for ${companyName}`);
    return { success: true, backupPath, backupSize };
  } catch (error) {
    console.error(`❌ [AUTO-BACKUP] Failed for ${companyName}:`, error);

    // Send failure notification
    try {
      await sendNotification(companyId, 'BACKUP_FAILED', {
        companyName,
        failedAt: new Date().toLocaleString(),
        error: error.message || 'Unknown error',
        nextAttempt: getNextBackupTime(settings)
      });
    } catch (emailErr) {
      console.error('❌ Failed to send failure notification:', emailErr);
    }

    return { success: false, error: error.message };
  }
}

// Calculate next backup time
function getNextBackupTime(settings: any): string {
  const frequency = settings.autoBackupFrequency || 'daily';
  const time = settings.autoBackupTime || '03:00';
  
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= now) {
    // If time has passed today, schedule for tomorrow/next period
    if (frequency === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next.toLocaleString();
}

// Main cron job function
async function runBackupCron() {
  console.log('\n========================================');
  console.log('🔄 AUTO BACKUP CRON JOB STARTED');
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log('========================================\n');

  try {
    await ensureDirectories();

    const companies = await getEnabledBackupCompanies();
    
    if (companies.length === 0) {
      console.log('ℹ️ No companies with auto-backup enabled');
      return;
    }

    console.log(`📋 Found ${companies.length} companies with auto-backup enabled`);

    for (const company of companies) {
      try {
        const settings = JSON.parse(company.backupSettings!);
        
        // Check if it's time to backup based on frequency
        const shouldBackup = checkBackupSchedule(settings);
        
        if (shouldBackup) {
          await runAutoBackup(company.id, company.name, settings);
        } else {
          console.log(`⏭️ Skipping ${company.name} - not scheduled for now`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${company.name}:`, error);
      }
    }

    console.log('\n✅ AUTO BACKUP CRON JOB COMPLETED\n');
  } catch (error) {
    console.error('❌ CRON JOB FAILED:', error);
  }
}

// Check if backup should run based on schedule
function checkBackupSchedule(settings: any): boolean {
  const frequency = settings.autoBackupFrequency || 'daily';
  const time = settings.autoBackupTime || '03:00';
  
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  // Check if current time matches scheduled time (within 5 minutes window)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const timeMatches = currentHour === hours && Math.abs(currentMinute - minutes) <= 5;
  
  if (!timeMatches) return false;
  
  // Check frequency-specific conditions
  if (frequency === 'weekly') {
    // Run on Sundays (or configured day)
    const dayOfWeek = settings.autoBackupDayOfWeek || 0; // 0 = Sunday
    return now.getDay() === dayOfWeek;
  }
  
  if (frequency === 'monthly') {
    // Run on 1st of month (or configured day)
    const dayOfMonth = settings.autoBackupDayOfMonth || 1;
    return now.getDate() === dayOfMonth;
  }
  
  // Daily - always run if time matches
  return true;
}

// Schedule cron jobs
export function initializeBackupCron() {
  console.log('🚀 Initializing Auto Backup Cron Jobs...');

  // Run every hour to check for scheduled backups
  cron.schedule('0 * * * *', () => {
    console.log('⏰ Backup cron check triggered');
    runBackupCron();
  });

  // Run at 3 AM daily (main backup window)
  cron.schedule('0 3 * * *', () => {
    console.log('⏰ Daily 3 AM backup window');
    runBackupCron();
  });

  console.log('✅ Auto Backup Cron Jobs Initialized');
  console.log('   - Hourly check: 0 * * * *');
  console.log('   - Daily main: 0 3 * * *');
}

// Manual trigger for testing
export async function triggerManualBackupCron(companyId?: string) {
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, backupSettings: true }
    });
    
    if (company && company.backupSettings) {
      const settings = JSON.parse(company.backupSettings);
      return await runAutoBackup(company.id, company.name, settings);
    }
  } else {
    return await runBackupCron();
  }
}

export default {
  initializeBackupCron,
  triggerManualBackupCron,
  runAutoBackup,
  enforceRetentionPolicy
};
