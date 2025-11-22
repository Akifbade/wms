import { PatchModule } from '../types';

const sampleSafeHeadersPatch: PatchModule = {
    id: 'safe-headers',
    description: 'Adds safety headers and request logging as a demo patch.',
    version: '1.0.0',
    appliesTo: ['backend'],
    apply: ({ app, logger }) => {
        logger.info('Attaching safe headers middleware');

        app.use((req, res, next) => {
            res.setHeader('X-WMS-Patch', 'safe-headers');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            next();
        });

        logger.info('Safe headers middleware active');
    },
};

export default sampleSafeHeadersPatch;
