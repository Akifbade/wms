/**
 * Version Configuration - Auto-updated by GitHub Actions
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export const APP_VERSION = 'v2.1.0';

export const VERSION_INFO = {
  version: 'v2.1.0',
  environment: process.env.REACT_APP_ENV || 'development',
  buildDate: new Date().toISOString(),
  commitHash: process.env.REACT_APP_COMMIT_HASH || 'local-dev',
  stage: 'staging', // local, staging, or production
};

export const DEPLOYMENT_TIMELINE = {
  local: '2025-11-01',
  staging: '2025-11-01',
  production: '2025-10-31',
};

// Auto-update log
console.log(`%c🚀 WMS Version: ${APP_VERSION}`, 'color: green; font-weight: bold; font-size: 14px');
console.log(`%cEnvironment: ${VERSION_INFO.environment}`, 'color: blue');
console.log(`%cCommit: ${VERSION_INFO.commitHash}`, 'color: gray');
