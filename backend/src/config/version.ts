/**
 * Version Configuration for Backend
 * Auto-updated by GitHub Actions or manually for local testing
 */

/**
 * Auto-incremented version (updated by pre-commit hook)
 */
export const APP_VERSION = 'v2.2.87';

export const COMMIT_MESSAGE = 'Fix: Job click in Material Report, Individual Rack CBM, Old returns restocked';

export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
    stage: process.env.DEPLOYMENT_STAGE || 'local', // local, staging, production
    buildDate: new Date().toISOString(),
    commitHash: process.env.COMMIT_HASH || 'local-dev',
    commitMessage: COMMIT_MESSAGE,
    timestamp: Date.now(),
  };
};

export const logVersionInfo = () => {
  const info = getVersionInfo();
  console.log(`
╔════════════════════════════════════════╗
║  🚀 WMS Backend Version: ${info.version}        ║
║  Stage: ${info.stage.toUpperCase()}                     ║
║  Environment: ${(info.environment || '?').toUpperCase()}             ║
║  Build Date: ${new Date(info.buildDate).toLocaleDateString()}      ║
╚════════════════════════════════════════╝
  `);
};
