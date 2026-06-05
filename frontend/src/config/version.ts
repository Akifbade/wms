/**
 * Version Configuration
 * Primary source: /version.json (generated during build from git/VERSION)
 * This fallback is only used during development
 */

// Will be overwritten by generate-version-json.js during build
export const APP_VERSION = 'v2.4.0';

export const VERSION_INFO = {
  version: APP_VERSION,
  environment: import.meta.env.VITE_APP_ENV || 'development',
  buildDate: new Date().toISOString(),
  commitHash: import.meta.env.VITE_APP_COMMIT_HASH || 'local-dev',
  commitMessage: 'Development build',
  stage: import.meta.env.VITE_APP_ENV || 'local',
};
