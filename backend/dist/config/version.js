"use strict";
/**
 * Version Configuration for Backend
 * Auto-updated by GitHub Actions or manually for local testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logVersionInfo = exports.getVersionInfo = exports.APP_VERSION = void 0;
/**
 * Auto-incremented version (updated by pre-commit hook)
 */
exports.APP_VERSION = 'v2.2.53';
const getVersionInfo = () => {
    return {
        version: exports.APP_VERSION,
        environment: process.env.NODE_ENV || 'development',
        stage: process.env.DEPLOYMENT_STAGE || 'local', // local, staging, production
        buildDate: new Date().toISOString(),
        commitHash: process.env.COMMIT_HASH || 'local-dev',
        timestamp: Date.now(),
    };
};
exports.getVersionInfo = getVersionInfo;
const logVersionInfo = () => {
    const info = (0, exports.getVersionInfo)();
    console.log(`
╔════════════════════════════════════════╗
║  🚀 WMS Backend Version: ${info.version}        ║
║  Stage: ${info.stage.toUpperCase()}                     ║
║  Environment: ${(info.environment || '?').toUpperCase()}             ║
║  Build Date: ${new Date(info.buildDate).toLocaleDateString()}      ║
╚════════════════════════════════════════╝
  `);
};
exports.logVersionInfo = logVersionInfo;
