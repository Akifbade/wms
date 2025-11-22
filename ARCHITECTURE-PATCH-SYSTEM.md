# PatchSafe Architecture Plan

## Goals
- Allow experimental features ("patches") to be deployed without risking total system failure.
- Ensure every patch can be activated/deactivated at runtime without redeploying core services.
- Provide observability (status + audit logs) so operators can see which patches are active and whether they failed to load.
- Make runtime isolation best-effort: a bad patch should fail gracefully while the core WMS keeps running.

## Building Blocks
1. **Backend Patch Engine**
   - `backend/src/patches/engine.ts` will load patch descriptors from `patches.config.json`.
   - Each patch exports `{ id, description, appliesTo: ['backend','frontend'], apply(app, deps) }`.
   - Loader wraps every patch in `try/catch`, records status (`LOADED`, `FAILED`), and never throws upstream.
   - Status is cached and exposed via `/api/system-patches/status`.
   - Engine also emits structured logs so we can trace failures.

2. **Database Alignment**
   - Use existing `systemPlugin` + `systemPluginLog` tables for persistence when a patch needs company-specific activation.
   - Engine first reads static config, then reconciles with DB flags (company can disable a patch via admin UI).

3. **Frontend Patch Awareness**
   - `frontend/src/context/PatchProvider.tsx` fetches `/api/system-patches/status` post-auth and exposes `usePatchEnabled(id)`.
   - Components wrap risky/experimental blocks with `if (!isPatchEnabled('foo')) return null;`.
   - For hard failures, `GlobalErrorBoundary` (new component) wraps every route; it reports errors + renders a friendly fallback so one crashing page does not break the whole SPA.

4. **Operational Workflow**
   - Add `docs/patches/README.md` describing how to create a new patch, register it in config, and optionally wire a frontend companion.
   - Provide `npm run patch:check` script (future) to validate manifests before deployment.

5. **Safety Nets**
   - Backend exposes health info for patches, including last error stack.
   - Frontend logs patch failures to `/api/system-patches/report` (optional) to correlate user impact with a patch.

## Rollout Steps
1. Implement backend engine + REST endpoints.
2. Seed with a sample patch (e.g., `safe-company-analytics`) to prove the hook works.
3. Add frontend provider + hook + route-level ErrorBoundary.
4. Update docs + admin UI (later) to toggle patches visually.
5. Expand to CLI validation + telemetry if needed.
6. Document how round-trip toggles work and how to confirm builds/tests.

## Usage & Verification

1. **Enable/disable patches**
   - Edit `backend/patches.config.json` and toggle the `enabled` flag for any entry. For company-specific overrides you can later merge with the `systemPlugin` table so the admin UI decides which patch is active per company.
   - Patches load at boot: the backend logs `🔧 [Patch:<id>]` messages and exposes current statuses via `/api/system-patches/status`. Call the route with a bearer token (obtainable from `/api/auth/login`) to inspect `status`, `enabled`, and any `lastError` details.

2. **Frontend awareness**
   - `PatchProvider` from `frontend/src/contexts/PatchContext.tsx` fetches `/api/system-patches/status`, keeps statuses in memory, and exposes `usePatchEnabled(id)` for other components.
   - Components guard risky UI (Dashboard revenue widgets now only render when `dashboard-safe-analytics` is `ACTIVE`). The `GlobalErrorBoundary` wraps the router so a crashing patch can be isolated without blanking the entire SPA.

3. **Testing & verification**
   - Frontend build: ran `npm run build` at the workspace root; it succeeded, proving the new context, error boundary, and patch-aware Dashboard compile cleanly.
   - Backend build: `npm run build` still fails because legacy Sequelize models (e.g., `src/db/index.ts`, `src/models/*.ts`, and routes importing `Model.init`) reference `sequelize` types that aren’t installed in this branch. This is a known pre-existing issue; once the Sequelize traces are removed, the patch code will compile.

4. **Next steps**
   - After resolving the Sequelize issues, rerun `npm run build` for the backend and verify `/api/system-patches/status` responds with the expected patch list plus statuses.
   - Consider adding a lightweight UI in Settings that shows patch statuses/logs so admins can flip them without editing JSON.
