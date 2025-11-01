/**
 * Version Configuration for Backend
 * Auto-updated by GitHub Actions
 */

export const APP_VERSION = 'v2.1.0';

export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
    stage: process.env.DEPLOYMENT_STAGE || 'local', // local, staging, production
    buildDate: new Date().toISOString(),
    commitHash: process.env.COMMIT_HASH || 'local-dev',
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
