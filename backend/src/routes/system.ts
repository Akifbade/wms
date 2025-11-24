import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { PrismaClient } from '@prisma/client';
import { getActiveUsers, getUserStats } from '../services/userActivityTracker';

const router = Router();
const execAsync = util.promisify(exec);
const prisma = new PrismaClient();

// Apply authentication and admin only access
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // 1. CPU Usage & Load
    const cpus = os.cpus();
    const loadAvg = os.loadavg(); // [1, 5, 15] min load averages
    const coreCount = cpus.length;

    // Calculate ACTUAL CPU usage from /proc/stat (Linux) or top (fallback)
    let cpuUsagePercent = 0;
    try {
      if (os.platform() === 'linux') {
        // Get CPU usage from /proc/stat (more accurate)
        const { stdout: stat1 } = await execAsync("cat /proc/stat | grep '^cpu '");
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        const { stdout: stat2 } = await execAsync("cat /proc/stat | grep '^cpu '");

        const parseStat = (line: string) => {
          const values = line.split(/\s+/).slice(1, 8).map(Number);
          return {
            user: values[0],
            nice: values[1],
            system: values[2],
            idle: values[3],
            iowait: values[4],
            irq: values[5],
            softirq: values[6]
          };
        };

        const stat1Data = parseStat(stat1);
        const stat2Data = parseStat(stat2);

        const idle1 = stat1Data.idle + stat1Data.iowait;
        const idle2 = stat2Data.idle + stat2Data.iowait;

        const total1 = Object.values(stat1Data).reduce((a, b) => a + b, 0);
        const total2 = Object.values(stat2Data).reduce((a, b) => a + b, 0);

        const totalDiff = total2 - total1;
        const idleDiff = idle2 - idle1;

        cpuUsagePercent = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
        cpuUsagePercent = Math.min(100, Math.max(0, cpuUsagePercent));
      } else {
        // Fallback: use load average (less accurate but works on all platforms)
        cpuUsagePercent = Math.min(100, (loadAvg[0] / coreCount) * 100);
      }
    } catch (e) {
      console.error('CPU calculation error:', e);
      // Fallback if calculation fails
      cpuUsagePercent = Math.min(100, (loadAvg[0] / coreCount) * 100);
    }

    // 2. Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    // 3. Uptime
    const uptime = os.uptime();

    // 4. Disk Usage (Linux/Mac specific, fallback for Windows)
    let diskSpace = [];
    try {
      const { stdout } = await execAsync('df -h /');
      // Parse df output
      // Filesystem      Size  Used Avail Use% Mounted on
      // overlay          60G   30G   30G  50% /
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 5) {
          diskSpace.push({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mount: parts[5]
          });
        }
      }
    } catch (e) {
      console.error('Disk space check failed:', e);
    }

    // 5. Top Processes (Linux specific)
    let processes = [];
    try {
      // Get top 10 processes by CPU
      const { stdout } = await execAsync('ps -eo pid,user,pcpu,pmem,comm --sort=-%cpu | head -11');
      const lines = stdout.trim().split('\n');
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 5) {
          processes.push({
            pid: parts[0],
            user: parts[1],
            cpu: parseFloat(parts[2]),
            memory: parseFloat(parts[3]),
            command: parts.slice(4).join(' ')
          });
        }
      }
    } catch (e) {
      console.error('Process check failed:', e);
    }

    // 6. Active Users & User Statistics
    const activeUsersData = getActiveUsers();
    const userStats = await getUserStats();

    // 7. Database Connections
    let dbConnections = 0;
    try {
      const result = await prisma.$queryRaw<Array<{ connections: number }>>`
        SELECT COUNT(*) as connections FROM information_schema.PROCESSLIST WHERE db = DATABASE()
      `;
      dbConnections = Number(result[0]?.connections) || 0;
    } catch (e) {
      console.error('DB connection check failed:', e);
    }

    // 8. Resource Usage by Container (if in Docker)
    let containerStats = [];
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo ""');
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const [name, cpu, mem, net, block] = line.split('\t');
          if (name) {
            containerStats.push({
              name,
              cpu: cpu || '0%',
              memory: mem || '0B',
              network: net || '0B / 0B',
              diskIO: block || '0B / 0B'
            });
          }
        }
      }
    } catch (e) {
      // Docker not available or not in container
    }

    res.json({
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime,
        cpu: {
          cores: coreCount,
          model: cpus[0].model,
          loadAvg,
          usagePercent: parseFloat(cpuUsagePercent.toFixed(1))
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usagePercent: parseFloat(memUsagePercent.toFixed(1))
        },
        disk: diskSpace,
      },
      processes,
      database: {
        activeConnections: dbConnections
      },
      containers: containerStats,
      users: {
        active: activeUsersData,
        statistics: userStats
      }
    });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

export default router;
