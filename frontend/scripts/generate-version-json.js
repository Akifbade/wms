const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatBuildDate(d) {
  // e.g. "Dec 13, 2025"
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatBuildTime(d) {
  // e.g. "21:33:59"
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const frontendRoot = path.resolve(__dirname, '..');
const versionTsPath = path.join(frontendRoot, 'src', 'config', 'version.ts');
const publicVersionJsonPath = path.join(frontendRoot, 'public', 'version.json');

const versionTs = fs.readFileSync(versionTsPath, 'utf8');

// Supports both: export const APP_VERSION = '2.2.76'; and export const APP_VERSION = "2.2.76";
const match = versionTs.match(/export\s+const\s+APP_VERSION\s*=\s*['\"](\d+\.\d+\.\d+)['\"]/);
if (!match) {
  console.error(`[generate-version-json] Could not parse APP_VERSION in ${versionTsPath}`);
  process.exit(1);
}

const appVersion = match[1];
const now = new Date();

const commitHash = process.env.VITE_APP_COMMIT_HASH || safeExec('git rev-parse --short HEAD') || 'local-dev';
const commitMessage = safeExec('git log -1 --pretty=%s') || 'local-build';
const author = safeExec('git log -1 --pretty=%an') || 'local';

// Keep field names aligned with what the UI expects.
const payload = {
  version: `v${appVersion}`,
  buildDate: formatBuildDate(now),
  buildTime: formatBuildTime(now),
  commit: commitHash,
  commitMessage,
  author,
  environment: process.env.VITE_APP_ENV || 'local',
};

fs.writeFileSync(publicVersionJsonPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`[generate-version-json] Wrote ${publicVersionJsonPath} -> ${payload.version}`);
