import { PatchModule } from '../types';

const dashboardSafeAnalyticsPatch: PatchModule = {
    id: 'dashboard-safe-analytics',
    description: 'Provides telemetry hooks for dashboard analytics widgets.',
    version: '1.0.0',
    appliesTo: ['backend', 'frontend'],
    apply: ({ logger }) => {
        logger.info('Dashboard analytics safety patch registered (no backend mutations).');
    },
};

export default dashboardSafeAnalyticsPatch;
