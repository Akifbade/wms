import { PatchModule } from '../types';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'api-requests.log');

const requestLoggerPatch: PatchModule = {
    id: 'request-logger',
    description: 'Comprehensive API request logging with detailed metrics',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger }) => {
        logger.info('Initializing API request logging...');

        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }

        // Request logging middleware
        app.use((req: Request, res: Response, next: NextFunction) => {
            const startTime = Date.now();
            const originalSend = res.send.bind(res);

            res.send = function (body: any) {
                const duration = Date.now() - startTime;
                const timestamp = new Date().toISOString();

                if (!req.path.includes('/static/') && req.path !== '/api/health') {
                    const logEntry = {
                        timestamp,
                        method: req.method,
                        path: req.path,
                        query: req.query,
                        statusCode: res.statusCode,
                        duration: `${duration}ms`,
                        ip: req.ip || req.connection.remoteAddress,
                    };

                    const logLine = JSON.stringify(logEntry) + '\n';
                    fs.appendFile(LOG_FILE, logLine, (err) => {
                        if (err) logger.error(`Failed to write log: ${err.message}`);
                    });

                    if (res.statusCode >= 400) {
                        logger.warn(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
                    }
                }

                return originalSend(body);
            };

            next();
        });

        // API to view recent logs (public for monitoring)
        app.get('/plugins/request-logger/recent', (req, res) => {
            const limit = parseInt(req.query.limit as string) || 50;

            if (!fs.existsSync(LOG_FILE)) {
                return res.json({ logs: [] });
            }

            try {
                const content = fs.readFileSync(LOG_FILE, 'utf-8');
                const lines = content.trim().split('\n').filter(Boolean);
                const recentLogs = lines.slice(-limit).reverse().map((line) => JSON.parse(line));

                res.json({
                    count: recentLogs.length,
                    logs: recentLogs,
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        logger.info('API request logging active');
    },
};

export default requestLoggerPatch;
