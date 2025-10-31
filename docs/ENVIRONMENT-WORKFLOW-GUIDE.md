# WMS Environment Workflow Guide

This short guide shows how to keep the three Docker stacks isolated so you can develop locally, validate on staging, and promote to production without port collisions.

## Port Map

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local Dev   | http://localhost:3000 | http://localhost:5002 | localhost:3309 |
| Staging     | http://localhost:8080 | http://localhost:5001 | localhost:3308 |
| Production* | http://localhost | http://localhost:5000 | localhost:3307 |

\*The production compose file mirrors the live stack. Keep it stopped unless you explicitly need it locally.

## 1. Local Development Stack

```
cd "C:\Users\USER\Videos\NEW START"
docker compose -f docker-compose.dev.yml up -d
```

- Frontend dev server: `http://localhost:3000`
- API (outside Docker): `http://localhost:5002`
- MySQL: `mysql -h 127.0.0.1 -P 3309 -u wms_user -p`
- Hot reload is enabled because the source folders are bind-mounted.
- Stop when finished: `docker compose -f docker-compose.dev.yml down`

## 2. Staging Verification Stack

```
cd "C:\Users\USER\Videos\NEW START"
docker compose -f docker-compose.staging.yml up -d
```

- Serve the production build you just generated in `frontend/dist`.
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5001`
- Database: `localhost:3308`
- If UI assets look stale, rebuild them before restarting:
  - `cd frontend`
  - `npm run build`
  - `docker compose -f "C:\Users\USER\Videos\NEW START\docker-compose.staging.yml" restart staging-frontend`
- Tear down: `docker compose -f docker-compose.staging.yml down`

## 3. Production Mirror Stack (Optional)

```
cd "C:\Users\USER\Videos\NEW START"
docker compose up -d
```

- Mirrors the live configuration with nginx listening on port 80 (redirects to `qgocargo.cloud`).
- Only run when you need to rehearse a production deployment locally; otherwise run `docker compose down` so it does not capture port 80.

## 4. Recommended Deployment Flow

1. **Develop locally** inside the dev stack (port 3000 / 5002).
2. **Commit your changes** and push to source control.
3. **Build frontend assets for staging**: `cd frontend && npm run build`.
4. **Bring up staging stack**: `docker compose -f docker-compose.staging.yml up -d`.
5. **Smoke test on staging** at `http://localhost:8080`.
6. **Deploy to remote staging** (existing process) when local checks pass.
7. **Promote to production** once staging verifies.

## 5. Useful Commands

- List running containers: `docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"`
- View backend logs (staging example):
  `docker compose -f docker-compose.staging.yml logs -f staging-backend`
- Refresh Prisma client (dev backend):
  `docker compose -f docker-compose.dev.yml exec backend npx prisma generate`
- Run database migrations manually (staging):
  `docker compose -f docker-compose.staging.yml exec staging-backend npx prisma migrate deploy`

Keep this file handy so the environment boundaries stay clear while you iterate locally, verify on staging, and ship to production.
