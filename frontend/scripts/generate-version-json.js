const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim();
  } catch {
    return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatBuildDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatBuildTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// Try to read VERSION env var first (set via Docker build arg), then file
function readVersionFromEnv() {
  return process.env.APP_VERSION || null;
}

function readVersionFromFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf8').trim().replace(/^v/, '');
    }
  } catch {}
  return null;
}

const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const publicVersionJsonPath = path.join(frontendRoot, 'public', 'version.json');

// --- DETERMINE VERSION ---
let version = '1.0.0';

// 1) Try git tag
const gitTag = safeExec('git describe --tags --abbrev=0 2>/dev/null');
if (gitTag && /^v?\d+\.\d+\.\d+/.test(gitTag)) {
  version = gitTag.replace(/^v/, '');
} else {
  // 2) Try VERSION files (multiple locations)
  version = readVersionFromEnv()
    || readVersionFromFile(path.join(frontendRoot, 'VERSION'))
    || readVersionFromFile(path.join(repoRoot, 'VERSION'))
    || '1.0.0';
}

// Build number
const commitCount = process.env.COMMIT_COUNT || safeExec('git rev-list --count HEAD 2>/dev/null') || '0';

// Get git metadata (graceful fallback when .git not available)
const commitHash = process.env.VITE_APP_COMMIT_HASH
  || safeExec('git rev-parse --short HEAD')
  || safeExec('git log --oneline -1 2>/dev/null | awk \'{print $1}\'')
  || 'local-dev';

const commitMessage = process.env.VITE_APP_COMMIT_MESSAGE
  || safeExec('git log -1 --pretty=%s')
  || 'local-build';

const author = safeExec('git log -1 --pretty=%an') || 'local';
const branch = process.env.VITE_APP_BRANCH
  || safeExec('git rev-parse --abbrev-ref HEAD')
  || 'unknown';

const environment = process.env.VITE_APP_ENV || 
  (branch === 'staging' ? 'staging' : 
   branch === 'stable/prisma-mysql-production' ? 'production' : 'development');

const fullVersion = `v${version}+build.${commitCount}`;

const now = new Date();
const payload = {
  version: fullVersion,
  buildDate: formatBuildDate(now),
  buildTime: formatBuildTime(now),
  commit: commitHash,
  commitMessage,
  author,
  environment,
  branch,
  commitCount,
};

fs.writeFileSync(publicVersionJsonPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`[generate-version-json] Wrote ${publicVersionJsonPath} -> ${payload.version} (${payload.environment}, branch: ${payload.branch})`);
