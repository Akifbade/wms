# WMS Backup - 20260110_102057

## Backup Contents
- **MySQL Database**: All databases dump (compressed)
- **Upload Files**: File list only (actual files in full VPS backup)
- **Docker Configs**: Container configurations
- **Nginx Config**: Web server configuration

## Restore Instructions

### 1. Restore MySQL Database
```bash
gunzip -c mysql-database.sql.gz | docker exec -i wms-database mysql -uroot -prootpassword123
```

### 2. Restore Upload Files
Upload files are in the full VPS backup (C:\VPS-Backups on laptop or /root/daily-backups on VPS)

### 3. Restore Nginx Config
```bash
tar xzf nginx-config.tar.gz -C /
systemctl restart nginx
```

## Backup Date
2026-01-10 10:20:58

## Server Info
- Host: srv1078864.hstgr.cloud
- IP: 148.230.107.155

