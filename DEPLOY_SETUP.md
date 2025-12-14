# VPS Deployment Setup Guide

## 1. GitHub Secrets Setup
To enable the automated deployment, you need to add the VPS password to GitHub Secrets.

1. Go to your GitHub Repository.
2. Click on **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. Name: `VPS_PASSWORD`
5. Value: `Qgocargo@123` (or your current VPS root password)
6. Click **Add secret**.

## 2. First Time Setup (One-Off)
Since we just added the `vps-deploy.sh` script, we need to make sure it exists on the VPS before the first automatic deployment can run.

1. SSH into your VPS:
   ```bash
   ssh root@148.230.107.155
   ```
2. Go to the project folder:
   ```bash
   cd "/root/NEW START"
   ```
3. Pull the latest changes (after you push the new files):
   ```bash
   git pull origin stable/prisma-mysql-production
   ```
4. Make the script executable:
   ```bash
   chmod +x vps-deploy.sh
   ```

## 3. How to Deploy
From now on, whenever you push code to the `stable/prisma-mysql-production` branch, GitHub Actions will:
1. Log in to your VPS.
2. Create a full backup (Database + Uploads + .env).
3. Pull the latest code.
4. Rebuild and restart the containers.
5. Prune unused images.

You can check the progress in the **Actions** tab on GitHub.
