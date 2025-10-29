# 📁 UPLOADS SYSTEM DOCUMENTATION

## ✅ Status: OPERATIONAL

### Upload Folder Structure:
```
/app/uploads/
├── logos/                 - Company/branding logos
├── documents/            - General documents
├── damages/             - Damaged items photos
├── temp/                - Temporary files
├── job-files/           - Moving job files (by jobId)
│   └── {jobId}/
│       ├── documents/
│       ├── photos/
│       └── other/
└── shipments/           - Shipment related files
```

### Folder Permissions:
```
All folders: drwxrwxrwx (777)
All folders: Owned by root:root
Accessible by: All users (backend process)
```

### Access Routes:

#### 1. **Upload Files via API**
```bash
POST /api/upload/logo
POST /api/materials/upload
POST /api/shipments/{id}/upload
POST /api/jobs/{jobId}/upload
```

#### 2. **Access Uploaded Files**
```
HTTP:   http://localhost/uploads/{category}/{filename}
HTTPS:  https://localhost/uploads/{category}/{filename}
Domain: https://qgocargo.cloud/uploads/{category}/{filename}
```

#### 3. **Categories & Endpoints**
```
/uploads/logos          → Company logos
/uploads/documents      → Documents
/uploads/damages        → Damage photos
/uploads/job-files      → Job attachments
/uploads/shipments      → Shipment photos
/uploads/temp           → Temporary files
```

### Backend Static Route:
```typescript
// From backend/src/index.ts
app.use('/uploads', express.static('uploads'));
```

### Nginx Proxy Configuration:
```nginx
location /uploads {
    proxy_pass http://backend:5000/uploads;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
}
```

### File Upload API Examples:

#### Upload Company Logo
```bash
curl -X POST http://localhost:5000/api/upload/logo \
  -H "Authorization: Bearer {token}" \
  -F "file=@logo.png"
```

#### Upload Job Files
```bash
curl -X POST http://localhost:5000/api/jobs/{jobId}/upload \
  -H "Authorization: Bearer {token}" \
  -F "files=@file1.pdf" \
  -F "files=@file2.docx" \
  -F "folder=documents"
```

#### Upload Shipment Photos
```bash
curl -X POST http://localhost:5000/api/shipments/{shipmentId}/upload \
  -H "Authorization: Bearer {token}" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"
```

### Database Volume Mapping:
```yaml
volumes:
  - ./backend/uploads:/app/uploads  # Local ↔ Container mapping
```

### File Access Flow:
```
1. User selects file in Frontend UI
2. Frontend sends to: POST /api/{endpoint}/upload
3. Backend receives in Express route handler
4. Multer saves to /app/uploads/{category}
5. Backend returns URL: /uploads/category/filename
6. Frontend displays from URL via img/video tags
7. Nginx proxies request to Backend static route
8. Browser receives file
```

### Storage Limits:
```
Max file size:   50MB (default, configurable in routes)
Total storage:   Depends on VPS disk space
Backup:          Automatic database backups include file references
Retention:       Files kept indefinitely (no auto-cleanup)
```

### Common Upload Routes Usage:

#### Company Branding (Logo)
- **Endpoint**: `POST /api/upload/logo`
- **Folder**: `/uploads/logos/`
- **Access**: `https://qgocargo.cloud/uploads/logos/{filename}`

#### Job Attachments
- **Endpoint**: `POST /api/jobs/{jobId}/upload`
- **Folder**: `/uploads/job-files/{jobId}/{folder}/`
- **Access**: `https://qgocargo.cloud/uploads/job-files/{jobId}/{folder}/{filename}`

#### Material Damage Photos
- **Endpoint**: `POST /api/materials/upload`
- **Folder**: `/uploads/damages/`
- **Access**: `https://qgocargo.cloud/uploads/damages/{filename}`

#### Shipment Documents
- **Endpoint**: `POST /api/shipments/{shipmentId}/upload`
- **Folder**: `/uploads/shipments/`
- **Access**: `https://qgocargo.cloud/uploads/shipments/{filename}`

### Testing File Upload:
```bash
# Test via backend directly
curl -X POST http://localhost:5000/api/upload/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.png"

# Verify file exists
docker exec wms-backend ls -lh /app/uploads/logos/

# Test file access
curl -I http://localhost/uploads/logos/test.png
```

### Troubleshooting:

#### Files Not Uploading?
```bash
# Check backend logs
docker logs wms-backend | grep -i upload

# Check folder permissions
docker exec wms-backend ls -ld /app/uploads

# Check if multer is configured
docker exec wms-backend grep -r "multer" /app/src/routes/
```

#### Files Not Accessible via HTTP?
```bash
# Test backend upload endpoint
curl -I http://localhost:5000/uploads/logos/

# Test nginx proxy
curl -I http://localhost/uploads/logos/

# Check nginx config
docker exec wms-frontend cat /etc/nginx/conf.d/default.conf | grep -A5 uploads
```

#### Storage Full?
```bash
# Check disk usage
docker exec wms-backend df -h /app/uploads

# Clean temporary files
docker exec wms-backend rm -rf /app/uploads/temp/*

# Check for large files
docker exec wms-backend find /app/uploads -type f -size +100M
```

### Performance Optimization:

#### Client-Side Caching (Already Configured)
```nginx
# Asset files cached for 30 days
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

#### Compression
- Files automatically gzipped by nginx
- Reduces bandwidth usage ~70%

#### Direct Backend Access (Bypass Nginx)
```bash
# If nginx proxy issues occur, use backend directly
curl http://backend:5000/uploads/logos/filename
```

### Security Notes:

✅ **Secured:**
- File uploads require JWT authentication
- All uploads stored server-side only
- No executable files allowed (backend validation)
- Folder permissions restricted to app process

⚠️ **Consider:**
- Implement file size limits per user/role
- Add virus scanning for uploaded files
- Enable disk usage quotas
- Regular backup of uploads folder
- Implement cleanup for old temp files

---

## Quick Status Check:

```bash
# SSH into server
ssh root@148.230.107.155

# Check upload folders
docker exec wms-backend ls -lh /app/uploads/

# Check permissions
docker exec wms-backend ls -ld /app/uploads

# Test static route
curl -I http://localhost:5000/uploads/logos/

# Monitor uploads
docker logs -f wms-backend | grep upload
```
