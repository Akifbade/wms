# AI Handoff Playbook (WMS)

This file is the “single source of truth” for future AI/dev sessions.

## What was fixed in this session (local)

### 1) “Old version / nothing changes” proof
Problem: Nginx could serve a stale `version.json` even when the JS bundle was new, causing confusion.

Fix: `frontend/public/version.json` is generated on every frontend build.
- Build hook: `frontend/package.json` -> `build`: `node scripts/generate-version-json.js && vite build`
- Result: `GET /version.json` always shows the build’s current version metadata.

Verify:
- Local frontend: `http://localhost/version.json`
- Local backend: `http://localhost:5000/api/health`

### 2) Approvals UI: physical report images not showing
Root cause: approvals detail API returns `physicalReports: []` when DB field is NULL/empty.

Fix/validation steps:
- Upload a physical report for a return (multipart upload).
- Ensure DB stores `material_returns.physicalReportUrl` like `/uploads/physical-reports/<file>`.
- Then approvals detail API includes the file in `physicalReports`.

### 3) “wms-backend:5000” hostname leaking to browser/email
Root cause: backend was building absolute URLs using Docker-internal hostnames.

Fix:
- Backend returns relative upload URLs (e.g. `/uploads/...`) instead of `http://wms-backend:5000/...`.
- Frontend normalizes legacy/absolute `wms-backend` URLs to the current browser origin.

### 4) Email preview for physical report images
Constraint: email clients cannot reliably fetch `localhost` or private URLs.

Fix:
- Email sends inline image previews using CID attachments (`cid:...`) for image types.
- PDFs are attached/linked (not rendered as `<img>`).

## Key files touched (for quick future debugging)
- Backend approvals detail response: `backend/src/routes/materials.ts`
- Frontend approvals rendering/normalization: `frontend/src/components/moving-jobs/ApprovalManager.tsx`
- Email template + attachments: `backend/src/services/emailService.ts`, `backend/src/routes/moving-jobs.ts`
- Version proof build hook: `frontend/scripts/generate-version-json.js`, `frontend/package.json`

## Local workflow (fast + repeatable)

Recommended tasks in VS Code:
- `⚡ QUICK: Rebuild Localhost After Changes`
- `🧪 LOCALHOST TEST: Check All APIs`

Manual equivalent:
1) Build frontend: `cd frontend && npm run build`
2) Deploy dist into nginx container: `docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/`
3) Reload nginx: `docker exec wms-frontend nginx -s reload`
4) Restart backend if needed: `docker-compose restart wms-backend`

## VPS deployment notes (path with spaces is the #1 footgun)

Production VPS path is currently:
- `/root/NEW START`

This breaks many SCP/SSH flows unless quoting is done perfectly.

### Strong recommendation: create a no-space symlink once
Run on VPS:
- `ln -s "/root/NEW START" /root/wms`

Then use `/root/wms` in all scripts/commands.

### If you cannot create a symlink
Always quote the path on the VPS side:
- `cd "/root/NEW START"`

For file copy, prefer copying into a no-space temp path (e.g. `/tmp`) then moving inside the VPS with `mv`.

## VPS: quick health verification checklist

1) Containers:
- `docker ps` (frontend/backend should be healthy)

2) Backend health (VPS local loopback):
- `curl -s http://localhost:5000/api/health`

3) Frontend version proof:
- `curl -s http://localhost/version.json`
- From the internet: open `https://qgocargo.cloud/version.json`

## VPS: if `wms-frontend` is unhealthy
Typical causes:
- Wrong files copied to nginx html dir
- Bad nginx config / missing certs (if running https config)

First checks:
- `docker logs wms-frontend --tail 200`
- `docker exec wms-frontend nginx -t`
- `docker exec wms-frontend ls -la /usr/share/nginx/html/`

## Security note (do not hardcode secrets in docs)
- Avoid writing VPS passwords/API keys into markdown.
- Prefer SSH keys or environment variables for scripts.
