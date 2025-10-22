# VPS Setup Checklist

Complete this checklist to deploy your application to production on a VPS.

## 🖥️ Pre-Deployment (Local)

- [ ] All npm dependencies installed: `npm install`
- [ ] Database migrations created: `npm run prisma:migrate`
- [ ] Environment variables configured in `.env`
- [ ] Application builds successfully: `npm run build`
- [ ] All tests pass locally
- [ ] Code committed to git repository
- [ ] Git repository cloned/pushed to accessible location (GitHub, GitLab, etc.)

## 🌐 VPS Setup (Ubuntu 20.04+)

### System Preparation

- [ ] VPS created and accessible via SSH
- [ ] System updated: `sudo apt update && sudo apt upgrade -y`
- [ ] Firewall configured:
  ```bash
  sudo ufw allow 22/tcp      # SSH
  sudo ufw allow 80/tcp      # HTTP
  sudo ufw allow 443/tcp     # HTTPS
  sudo ufw enable
  ```
- [ ] SSH key-based authentication configured
- [ ] Non-root user created with sudo privileges

### Docker Installation

- [ ] Docker installed:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```
- [ ] Docker Compose installed:
  ```bash
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  ```
- [ ] User added to docker group: `sudo usermod -aG docker $USER`
- [ ] Docker daemon enabled: `sudo systemctl enable docker`

### Application Deployment

- [ ] Application directory created: `/home/user/qgo-app`
- [ ] Application code cloned/uploaded:
  ```bash
  git clone your-repo /home/user/qgo-app
  # Or: scp -r . user@vps-ip:/home/user/qgo-app
  ```
- [ ] Environment file configured:
  ```bash
  cd /home/user/qgo-app
  cp .env.example .env
  nano .env  # Edit with production values
  ```
- [ ] Database credentials secured:
  - [ ] Strong MySQL password generated
  - [ ] JWT_SECRET generated: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - [ ] FRONTEND_URL set to your domain
- [ ] Docker containers built and started:
  ```bash
  docker-compose up -d
  docker-compose ps  # Verify all containers running
  ```
- [ ] Database seeded:
  ```bash
  docker-compose exec app npm run prisma:seed
  ```
- [ ] Health check passed:
  ```bash
  curl http://localhost:5000/api/health
  ```

## 🔒 SSL/TLS Configuration

- [ ] Domain name registered and DNS configured
- [ ] Domain points to VPS IP
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx -y`
- [ ] SSL certificate obtained:
  ```bash
  sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
  ```
- [ ] Certificate auto-renewal configured: `sudo certbot renew --dry-run`

## 🌐 Nginx Configuration

- [ ] Nginx installed: `sudo apt install nginx -y`
- [ ] Nginx site configured:
  ```bash
  sudo nano /etc/nginx/sites-available/qgo
  # Copy from DEPLOYMENT.md template
  ```
- [ ] Site enabled: `sudo ln -s /etc/nginx/sites-available/qgo /etc/nginx/sites-enabled/`
- [ ] Nginx configuration tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`
- [ ] Nginx enabled on startup: `sudo systemctl enable nginx`

## 📊 Database & Backups

- [ ] MySQL container is running and healthy
- [ ] Database created and seeded with initial data
- [ ] First backup completed:
  ```bash
  docker-compose exec mysql mysqldump -u qgo_user -p qgo_cargo > backup-$(date +%Y%m%d).sql
  ```
- [ ] Backup directory created: `mkdir -p /home/user/backups`
- [ ] Backup script created: `/home/user/backup.sh`
- [ ] Backup cron job scheduled: `crontab -e`
  ```
  0 2 * * * /home/user/backup.sh
  ```
- [ ] Remote backup storage configured (optional: AWS S3, etc.)

## 🔐 Security Hardening

- [ ] `.env` file permissions restricted: `chmod 600 /home/user/qgo-app/.env`
- [ ] SSH password authentication disabled
- [ ] SSH key-only authentication enforced
- [ ] Fail2ban configured: `sudo apt install fail2ban -y`
- [ ] Rate limiting configured in Nginx
- [ ] CORS settings restricted to your domain
- [ ] X-Frame-Options header set: `X-Frame-Options: SAMEORIGIN`
- [ ] X-Content-Type-Options set: `X-Content-Type-Options: nosniff`
- [ ] Security headers configured in Nginx

## 📈 Monitoring & Logging

- [ ] Docker logs accessible: `docker-compose logs -f app`
- [ ] Application logs monitored
- [ ] Docker stats monitored: `docker stats`
- [ ] Disk space monitored: `df -h`
- [ ] Memory usage monitored: `free -h`
- [ ] CPU usage monitored: `htop`
- [ ] Log rotation configured for application logs
- [ ] Error notifications configured (optional)

## 🚀 Production Checklist

- [ ] DNS records propagated (wait 24-48 hours if needed)
- [ ] Website accessible at https://yourdomain.com
- [ ] API accessible at https://yourdomain.com/api
- [ ] Database admin panel NOT exposed publicly
- [ ] Login page accessible: https://yourdomain.com
- [ ] Default admin user password changed
- [ ] Default users updated or disabled
- [ ] Settings configured correctly
- [ ] Company branding/logo updated
- [ ] Email notifications tested (if configured)

## 📱 Testing

- [ ] Webpage loads without errors (Chrome)
- [ ] Webpage loads without errors (Firefox)
- [ ] Webpage loads without errors (Safari)
- [ ] Webpage loads without errors (mobile browser)
- [ ] Login functionality works
- [ ] Job creation works
- [ ] Job approval workflow works
- [ ] Analytics dashboard loads
- [ ] File downloads work
- [ ] All API endpoints respond

## 🔄 Maintenance Setup

- [ ] Automated backups running
- [ ] Backup verification tested
- [ ] Restore procedure documented
- [ ] Update schedule planned
- [ ] Maintenance window communicated to users
- [ ] Status page setup (optional)
- [ ] Uptime monitoring configured (optional: UptimeRobot, etc.)

## 📚 Documentation

- [ ] Deployment process documented
- [ ] Emergency procedures documented
- [ ] Database connection details secured (not in repo)
- [ ] API documentation updated
- [ ] User manual created
- [ ] Admin procedures documented

## 🎉 Post-Deployment

- [ ] Monitor application for first 24-48 hours
- [ ] Check logs for any errors: `docker-compose logs app`
- [ ] Monitor resource usage: `docker stats`
- [ ] Verify backups are working
- [ ] Test email notifications (if configured)
- [ ] Gather user feedback
- [ ] Document any issues encountered
- [ ] Create runbook for common tasks

## ⚠️ Important Notes

- **Backups**: Test restore procedures before relying on them
- **Updates**: Plan regular updates for security patches
- **Monitoring**: Set up proactive monitoring and alerts
- **Scaling**: Plan for growth if needed
- **Disaster Recovery**: Have a documented recovery plan
- **HTTPS**: Always use HTTPS in production
- **Secrets**: Never commit `.env` file to git
- **Logs**: Monitor logs regularly for issues

## 🆘 Troubleshooting During Deployment

### Port Already in Use
```bash
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3306
```

### Docker Not Running
```bash
sudo systemctl start docker
sudo systemctl status docker
```

### Application Not Starting
```bash
docker-compose logs -f app
docker-compose restart app
```

### Database Connection Failed
```bash
docker-compose ps  # Check if MySQL is running
docker-compose logs mysql
```

### SSL Certificate Issues
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## 📞 Support Resources

- Deployment Guide: [DEPLOYMENT.md](../DEPLOYMENT.md)
- API Documentation: [server/README.md](../server/README.md)
- Prisma Docs: https://www.prisma.io/docs
- Express Docs: https://expressjs.com
- Docker Docs: https://docs.docker.com
- Nginx Docs: https://nginx.org/en/docs

---

**Last Updated**: October 20, 2025

✅ Once all items are checked, your application is production-ready!
