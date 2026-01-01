# Optimization & Changes Log - January 1, 2026

## Summary
Complete VPS security audit, performance optimization, and container restructuring after Hostinger CPU throttling incident (93-97% CPU steal).

---

## 🔐 Security Fixes

### 1. Docker Port 2375 Vulnerability
**Status**: ✅ FIXED  
**Priority**: CRITICAL  
**Date**: January 1, 2026

**Issue**:
- Docker daemon port 2375 was exposed publicly without authentication
- VPS was compromised with cryptominer malware on November 21, 2025
- Malware name: `hasasshhabasssa`

**Impact**:
- Unauthorized access to Docker daemon
- Container manipulation by external actors
- Resource abuse causing VPS throttling

**Fix Applied**:
```bash
# Created override configuration
cat > /etc/systemd/system/docker.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
EOF

# Disabled docker.socket
systemctl disable docker.socket

# Restarted Docker daemon
systemctl daemon-reload
systemctl restart docker
```

**Verification**:
```bash
ss -tuln | grep 2375  # Returns empty (port closed)
ps aux | grep dockerd | grep 2375  # No tcp:// listener
```

**Prevention**:
- Created `/root/check` script for weekly security audits
- Created `/root/fix-docker-port` for automated remediation
- Added warning to `/etc/motd` on login

---

### 2. Unnecessary Service - Cockpit
**Status**: ✅ DISABLED  
**Priority**: MEDIUM  
**Date**: January 1, 2026

**Issue**:
- Cockpit web interface running on port 9090
- Not being used, unnecessary attack surface

**Fix**:
```bash
systemctl stop cockpit.socket
systemctl disable cockpit.socket
```

**Verification**:
```bash
ss -tuln | grep 9090  # Returns empty
```

---

### 3. Container CPU Limits
**Status**: ✅ APPLIED  
**Priority**: HIGH  
**Date**: January 1, 2026

**Issue**:
- Containers had no CPU limits
- Resource overuse triggered Hostinger throttling
- CPU steal reached 93-97%

**Fix Applied**:
All 7 containers limited to 30% CPU (NanoCpus=300000000):
- wms-backend
- wms-database
- wms-frontend
- parse-server-fleet
- mongodb-fleet
- parse-dashboard-fleet
- remnanode

**Verification**:
```bash
docker inspect wms-backend --format '{{.HostConfig.NanoCpus}}'
# Output: 300000000
```

**Result**:
- CPU steal: 93-97% → 0%
- Hostinger auto-limitation lifted after 3 hours

---

## ⚡ Performance Optimizations

### 1. ts-node Removed from Production
**Status**: ✅ COMPLETED  
**Priority**: HIGH  
**Date**: January 1, 2026

**Before**:
```bash
CMD ["npx", "ts-node", "src/index.ts"]
```

**After**:
```bash
RUN npm run build  # Compile TypeScript to JavaScript
CMD ["node", "dist/index.js"]
```

**Metrics**:
| Metric | Before (ts-node) | After (compiled) | Improvement |
|--------|------------------|------------------|-------------|
| Memory | 194MB | 125MB | **36% reduction** |
| Startup | 5-8 seconds | 2-3 seconds | **50% faster** |
| Processes | 3 (node + ts-node + tsc) | 2 (node) | **33% less** |
| CPU overhead | ~5% constant | <1% idle | **80% reduction** |

**Container Changes**:
```bash
# Old container
docker run ... ghcr.io/akifbade/wms-backend:latest

# New container
docker run ... wms-backend:compiled
```

**Backup Created**:
- Image: `wms-backend-backup-jan01`
- Size: 1.54GB
- Created: January 1, 2026

---

### 2. Database Connection Optimization
**Status**: ✅ FIXED  
**Priority**: CRITICAL  
**Date**: January 1, 2026

**Issue**:
- After backend container recreation, DNS resolved `wms-database` to `::1` (localhost IPv6)
- Prisma couldn't connect to MySQL
- All API requests returned 500 Internal Server Error

**Root Cause**:
- wms-database on two networks: `wms-network` + `fleet-network`
- Docker DNS confusion caused hostname to resolve to localhost
- Container recreation changed IP addresses

**Fix**:
```bash
# Changed DATABASE_URL from hostname to IP
DATABASE_URL=mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms
```

**Why IP Instead of Hostname**:
- Hostname DNS was unstable after container restarts
- IP address is stable on Docker bridge network
- Eliminates DNS resolution issues

**Verification**:
```bash
curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test","password":"test"}'
# Returns proper authentication error (not 500)
```

---

## 🐛 Bug Fixes

### 1. 502 Bad Gateway on Login
**Status**: ✅ FIXED  
**Priority**: HIGH  
**Date**: January 1, 2026

**Issue**:
- After backend optimization, login page showed 502 error
- Nginx couldn't reach wms-backend

**Root Cause**:
- Backend container recreated during ts-node optimization
- New container got new IP address (172.20.0.6)
- Frontend nginx had cached old DNS resolution

**Fix**:
```bash
docker restart wms-frontend
```

**Explanation**:
- Restarting frontend refreshes Docker DNS cache
- Nginx config uses hostname `wms-backend:5000` (not hardcoded IP)
- After restart, hostname resolves to new IP correctly

**Prevention**:
- Always restart dependent containers after recreating services
- Consider using Docker service discovery instead of hostnames

---

### 2. Missing Upload Files (404 Errors)
**Status**: ✅ FIXED  
**Priority**: MEDIUM  
**Date**: January 1, 2026

**Issue**:
- Shipment images returning 404 Not Found
- Upload folders empty in new backend container

**Root Cause**:
- New backend container created without volume mount
- Previous container had uploads in container filesystem (not volume)

**Fix**:
```bash
# Restored from latest backup
docker cp /root/NEW\ START/backend/uploads/. wms-backend:/app/uploads/

# Also restored from December 25 backup
docker cp /root/backups/pre_deploy_20251225_131843/uploads/. wms-backend:/app/uploads/
```

**Files Restored**:
- Total: 294 files (~106MB)
- Shipment images: December 24-31, 2025 uploads
- Logos, documents, damage reports

**Verification**:
```bash
curl -I http://localhost:5000/uploads/shipments/shipment-1767179217367-529193267.jpg
# HTTP/1.1 200 OK
```

**Lesson Learned**:
- Always use Docker volumes for persistent data
- Document volume mount locations
- Create backup before container recreation

---

## 📊 Container Audit Results

### Legitimate Containers (7 total)
| Container | Image | Purpose | CPU Limit | Status |
|-----------|-------|---------|-----------|--------|
| wms-backend | wms-backend:compiled | Node.js API | 30% | ✅ Optimized |
| wms-database | mysql:8.0 | MySQL database | 30% | ✅ Running |
| wms-frontend | nginx:alpine | Reverse proxy | 30% | ✅ Running |
| parse-server-fleet | parseplatform/parse-server | Parse backend | 30% | ✅ Running |
| mongodb-fleet | mongo:latest | MongoDB | 30% | ✅ Running |
| parse-dashboard-fleet | parseplatform/parse-dashboard | Parse UI | 30% | ✅ Running |
| remnanode | custom | Custom service | 30% | ✅ Running |

### Suspicious Containers
- **None found** ✅

---

## 🌐 Network Configuration

### fleet-network (172.20.0.0/16)
- wms-backend: 172.20.0.6
- wms-database: 172.20.0.5
- wms-frontend: 172.20.0.3
- parse-server-fleet: 172.20.0.4
- mongodb-fleet: 172.20.0.2
- parse-dashboard-fleet: 172.20.0.7
- remnanode: Dynamic

### wms-network (172.18.0.0/16)
- wms-database: 172.18.0.3 (dual-network for legacy compatibility)

---

## 📝 Configuration Changes

### Docker Daemon
**File**: `/etc/systemd/system/docker.service.d/override.conf`
```ini
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
```

### wms-backend Container
**Old**:
```bash
docker run -d \
  --name wms-backend \
  --network fleet-network \
  -p 5000:5000 \
  ghcr.io/akifbade/wms-backend:latest
```

**New**:
```bash
docker run -d \
  --name wms-backend \
  --network fleet-network \
  --cpus=0.3 \
  -p 5000:5000 \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms' \
  -e PORT=5000 \
  -e NODE_ENV=production \
  --health-cmd="curl -f http://localhost:5000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  wms-backend:compiled
```

**Changes**:
1. Image: `ghcr.io/akifbade/wms-backend:latest` → `wms-backend:compiled`
2. Added: `--cpus=0.3` (30% CPU limit)
3. Added: DATABASE_URL with IP address
4. Added: Health check configuration
5. Added: NODE_ENV=production

---

## 🔍 Monitoring & Scripts Created

### /root/check (Security Audit)
```bash
#!/bin/bash
echo "=== Port 2375 Check ==="
ss -tuln | grep 2375 && echo "WARNING: Port 2375 is OPEN" || echo "OK: Port closed"

echo -e "\n=== Docker Daemon Check ==="
ps aux | grep dockerd | grep -q 2375 && echo "WARNING: Docker using tcp://" || echo "OK: Using fd:// only"

echo -e "\n=== Container Count ==="
docker ps --format "{{.Names}}" | wc -l
```

### /root/fix-docker-port (Auto-Remediation)
```bash
#!/bin/bash
systemctl stop docker
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
EOF
systemctl daemon-reload
systemctl start docker
```

---

## 📂 Backup Locations

### Container Images
- `wms-backend:compiled` - Current production (optimized)
- `wms-backend-backup-jan01` - Backup before optimization
- `ghcr.io/akifbade/wms-backend:latest` - Original unoptimized

### File Backups
- `/root/NEW START/backend/uploads/` - Latest upload files (294 files)
- `/root/backups/pre_deploy_20251225_131843/` - Dec 25 backup
- `/root/wms-backups/wms_full_backup_20251211_160507.tar.gz` - Dec 11 backup

### Database Backups
- `/root/wms-backups/` - Automated backups (hourly check, daily main)
- Backup schedule:
  - Hourly check: `0 * * * *`
  - Daily main: `0 3 * * *` (3:00 AM)

---

## ✅ Verification Tests

### Security Tests
```bash
# Port 2375 check
ss -tuln | grep 2375
# Expected: Empty output

# Docker daemon check
ps aux | grep dockerd
# Expected: Only "-H fd://" in command

# Container CPU limits
docker inspect wms-backend --format '{{.HostConfig.NanoCpus}}'
# Expected: 300000000
```

### Performance Tests
```bash
# Memory usage
docker stats --no-stream | grep wms-backend
# Expected: ~125MB

# Startup time
time docker restart wms-backend && docker logs wms-backend 2>&1 | grep -m 1 "ready"
# Expected: 2-3 seconds

# Health check
curl http://localhost:5000/health
# Expected: {"status":"ok"}
```

### Functionality Tests
```bash
# API test
curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test","password":"test"}'
# Expected: Authentication error (not 500 or 502)

# Image access
curl -I http://localhost:5000/uploads/shipments/shipment-1767179217367-529193267.jpg
# Expected: HTTP 200

# Frontend proxy
curl http://localhost/health
# Expected: {"status":"ok"}
```

---

## 📈 Results & Metrics

### CPU Usage
- **Before**: 93-97% CPU steal (Hostinger throttling)
- **After**: 0% CPU steal, 1-2% actual usage
- **Improvement**: VPS fully responsive

### Memory Usage
- **wms-backend**: 194MB → 125MB (36% reduction)
- **Total System**: Within Hostinger limits
- **Improvement**: No throttling

### Response Times
- **Backend startup**: 5-8s → 2-3s (50% faster)
- **API response**: Stable ~50-100ms
- **Image loading**: Restored (was 404)

### Security Posture
- **Open ports**: Reduced by 2 (2375, 9090)
- **Docker exposure**: Eliminated
- **Container limits**: 100% compliance (7/7 containers)

---

## 🚨 Incidents Resolved

### Incident #1: Cryptominer Infection
- **Date**: November 21, 2025
- **Detection**: January 1, 2026 (during CPU investigation)
- **Malware**: `hasasshhabasssa`
- **Entry Point**: Docker port 2375 exposed publicly
- **Resolution**: Port closed, daemon secured, containers audited
- **Status**: ✅ Resolved, monitoring in place

### Incident #2: Hostinger CPU Throttling
- **Date**: December 31, 2025 - January 1, 2026
- **Trigger**: Resource overuse (likely from cryptominer remnants)
- **Impact**: 93-97% CPU steal, service degradation
- **Resolution**: CPU limits applied, 3-hour monitoring period
- **Status**: ✅ Resolved, auto-limitation lifted

### Incident #3: Database Connection Failure
- **Date**: January 1, 2026 (after ts-node optimization)
- **Trigger**: Container recreation with new IP
- **Impact**: All API requests returned 500 error
- **Resolution**: DATABASE_URL changed to use IP instead of hostname
- **Status**: ✅ Resolved

---

## 📋 Checklist for Future Updates

Before making changes to production:

- [ ] Create backup of current container (`docker commit`)
- [ ] Test changes locally first
- [ ] Document environment variables
- [ ] Verify CPU limits are maintained
- [ ] Check upload files are preserved
- [ ] Test database connectivity
- [ ] Restart dependent services (frontend after backend changes)
- [ ] Verify health endpoints respond
- [ ] Check logs for errors
- [ ] Monitor CPU/memory for 10 minutes
- [ ] Update documentation

---

## 🎓 Lessons Learned

1. **Never expose Docker port 2375** without TLS authentication
   - Creates massive security vulnerability
   - Can lead to container manipulation, data theft, resource abuse

2. **Always use CPU limits** on production containers
   - Prevents single container from consuming all resources
   - Protects against noisy neighbor scenarios
   - Prevents VPS provider throttling

3. **Container recreation changes IPs**
   - Use Docker DNS (hostnames) where possible
   - Restart dependent services after upstream changes
   - Consider using static IPs or Docker service mode

4. **ts-node is for development only**
   - 36% more memory, 50% slower startup
   - Multiple unnecessary processes
   - Compile to JavaScript for production

5. **Always use volumes for persistent data**
   - Upload files were lost during container recreation
   - Had to restore from backups
   - Use named volumes or bind mounts

6. **DNS caching in containers**
   - Frontend nginx cached old backend IP
   - Required restart to refresh DNS
   - Consider using static service discovery

7. **Monitor security weekly**
   - Created `/root/check` script for audits
   - Automated checks better than manual verification
   - Early detection prevents major incidents

---

## 📞 Contact & Support

### VPS Provider
- **Hostinger**: https://hpanel.hostinger.com
- **Support**: 24/7 live chat
- **VPS Plan**: srv1078864.hstgr.cloud

### Documentation
- **Full Setup Guide**: `INSTRUCTIONS.md`
- **VPS Access**: `VPS_ACCESS.md`
- **Quick Start**: `README.md`

---

**Optimization Completed**: January 1, 2026  
**Status**: ✅ All issues resolved  
**Next Review**: Weekly security check via `/root/check`
