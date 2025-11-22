import { PatchModule } from '../types';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const AUDIT_LOG_FILE = path.join(process.cwd(), 'logs', 'audit.log');
const AUDIT_DIR = path.join(process.cwd(), 'logs');

// Track changes to important tables
const TRACKED_TABLES = ['shipment', 'rack', 'material', 'user', 'invoice', 'expense'];

const auditLoggerPatch: PatchModule = {
    id: 'audit-logger',
    description: 'Track all ADMIN/MANAGER actions - who changed what & when',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger, prisma }) => {
        logger.info('Initializing audit logging system...');

        // Ensure log directory exists
        if (!fs.existsSync(AUDIT_DIR)) {
            fs.mkdirSync(AUDIT_DIR, { recursive: true });
        }

        // Audit middleware - tracks all POST/PUT/DELETE requests
        const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
            // Only track modification requests
            if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                return next();
            }

            // Skip auth routes and non-important endpoints
            if (req.path.includes('/auth/') || req.path.includes('/plugins/')) {
                return next();
            }

            const originalSend = res.json.bind(res);
            const startTime = Date.now();

            res.json = function (body: any) {
                const duration = Date.now() - startTime;

                // Only log successful operations
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    const user = (req as any).user;

                    const auditEntry = {
                        timestamp: new Date().toISOString(),
                        user: user ? {
                            id: user.userId || user.id,
                            email: user.email || 'unknown',
                            role: user.role || 'unknown',
                        } : { email: 'anonymous' },
                        action: req.method,
                        endpoint: req.path,
                        ip: req.ip || req.connection.remoteAddress,
                        statusCode: res.statusCode,
                        duration: `${duration}ms`,
                        changes: body?.id ? { resourceId: body.id } : {},
                    };

                    const logLine = JSON.stringify(auditEntry) + '\n';

                    // Write to audit log (async)
                    fs.appendFile(AUDIT_LOG_FILE, logLine, (err) => {
                        if (err) {
                            logger.error(`Failed to write audit log: ${err.message}`);
                        }
                    });

                    // Log critical actions to console
                    if (user?.role === 'ADMIN' || req.method === 'DELETE') {
                        logger.warn(
                            `AUDIT: ${user?.email || 'anonymous'} ${req.method} ${req.path} → ${res.statusCode}`
                        );
                    }
                }

                return originalSend(body);
            };

            next();
        };

        app.use(auditMiddleware);

        // API: Get recent audit logs WITH FULL DETAILS
        app.get('/plugins/audit-logger/recent', async (req, res) => {
            const limit = parseInt(req.query.limit as string) || 20;

            if (!fs.existsSync(AUDIT_LOG_FILE)) {
                return res.json({ logs: [], count: 0 });
            }

            try {
                const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
                const lines = content.trim().split('\n').filter(Boolean);
                const recentLogs = lines
                    .slice(-limit)
                    .reverse()
                    .map(line => {
                        try {
                            const log = JSON.parse(line);
                            return {
                                timestamp: log.timestamp,
                                user: log.user?.email || 'Unknown User',
                                role: log.user?.role || 'N/A',
                                action: `${log.method} ${log.path}`,
                                status: log.statusCode,
                                duration: `${log.duration}ms`,
                                fullDetails: log
                            };
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean);

                res.json({
                    logs: recentLogs,
                    count: recentLogs.length,
                    totalInFile: lines.length
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Get audit by user
        app.get('/plugins/audit-logger/by-user/:userId', async (req, res) => {
            const { userId } = req.params;

            if (!fs.existsSync(AUDIT_LOG_FILE)) {
                return res.json({ logs: [], count: 0 });
            }

            try {
                const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
                const lines = content.trim().split('\n').filter(Boolean);
                const userLogs = lines
                    .map((line) => JSON.parse(line))
                    .filter((log) => log.user?.id === userId)
                    .slice(-100);

                res.json({
                    count: userLogs.length,
                    logs: userLogs,
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Get stats
        app.get('/plugins/audit-logger/stats', async (req, res) => {
            if (!fs.existsSync(AUDIT_LOG_FILE)) {
                return res.json({
                    totalActions: 0,
                    todayActions: 0,
                    byRole: {},
                    byAction: {},
                });
            }

            try {
                const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
                const lines = content.trim().split('\n').filter(Boolean);
                const logs = lines.map((line) => JSON.parse(line));

                const today = new Date().toISOString().split('T')[0];
                const todayLogs = logs.filter((log) =>
                    log.timestamp.startsWith(today)
                );

                const byRole: Record<string, number> = {};
                const byAction: Record<string, number> = {};

                logs.forEach((log) => {
                    const role = log.user?.role || 'unknown';
                    const action = log.action;

                    byRole[role] = (byRole[role] || 0) + 1;
                    byAction[action] = (byAction[action] || 0) + 1;
                });

                res.json({
                    totalActions: logs.length,
                    todayActions: todayLogs.length,
                    byRole,
                    byAction,
                    recentActions: logs.slice(-10).reverse(),
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Clear audit logs (ADMIN only - but no auth check for now)
        app.delete('/plugins/audit-logger/clear', async (req, res) => {
            try {
                fs.writeFileSync(AUDIT_LOG_FILE, '', 'utf-8');
                logger.warn('AUDIT: Audit logs cleared');
                res.json({ message: 'Audit logs cleared successfully' });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        logger.info('Audit logging system active - tracking all modifications');
    },
};

export default auditLoggerPatch;
