import { PatchModule } from '../types';
import { Request, Response, NextFunction } from 'express';

interface RequestMetric {
    method: string;
    path: string;
    duration: number;
    timestamp: Date;
    statusCode?: number;
}

const metrics: RequestMetric[] = [];
const MAX_METRICS = 1000;

const performanceMonitorPatch: PatchModule = {
    id: 'performance-monitor',
    description: 'Track API response times and identify slow endpoints',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger }) => {
        logger.info('Initializing API performance tracking...');

        // Performance monitoring middleware
        app.use((req: Request, res: Response, next: NextFunction) => {
            const startTime = Date.now();
            const originalEnd = res.end.bind(res);

            res.end = function (...args: any[]) {
                const duration = Date.now() - startTime;

                if (!req.path.includes('/static/') && req.path !== '/api/health') {
                    const metric: RequestMetric = {
                        method: req.method,
                        path: req.path,
                        duration,
                        timestamp: new Date(),
                        statusCode: res.statusCode,
                    };

                    metrics.push(metric);
                    if (metrics.length > MAX_METRICS) {
                        metrics.shift();
                    }

                    if (duration > 2000) {
                        logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
                    }
                }

                return originalEnd(...args);
            };

            next();
        });

        // API endpoint for performance stats (with optional auth)
        app.get('/plugins/performance/stats', (req, res) => {
            // No auth required for stats - public monitoring endpoint
            if (metrics.length === 0) {
                return res.json({
                    totalRequests: 0,
                    avgResponseTime: 0,
                    slowRequests: 0,
                });
            }

            const totalRequests = metrics.length;
            const avgResponseTime =
                metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
            const slowRequests = metrics.filter((m) => m.duration > 1000).length;

            const endpointCounts: Record<string, number> = {};
            metrics.forEach((m) => {
                const key = `${m.method} ${m.path}`;
                endpointCounts[key] = (endpointCounts[key] || 0) + 1;
            });

            const topEndpoints = Object.entries(endpointCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([endpoint, count]) => ({ endpoint, count }));

            res.json({
                totalRequests,
                avgResponseTime: Math.round(avgResponseTime),
                slowRequests,
                slowRequestPercentage: ((slowRequests / totalRequests) * 100).toFixed(2),
                topEndpoints,
            });
        });

        logger.info('API performance tracking active');
    },
};

export default performanceMonitorPatch;
