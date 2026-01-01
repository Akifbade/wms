# Backend Dockerfile
# Using Debian-based Node for better Prisma compatibility
FROM node:18-slim

WORKDIR /app

# Install OpenSSL for Prisma, MySQL client for backups, Docker CLI for stats, and Chromium for Puppeteer
RUN apt-get update -y && apt-get install -y \
    openssl \
    default-mysql-client \
    docker.io \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium instead of downloading
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Clean any existing node_modules and dist folder
RUN rm -rf node_modules package-lock.json dist 2>/dev/null || true

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies including devDependencies (needed for Prisma CLI)
# Use npm install as fallback if npm ci fails
RUN npm ci --include=dev --verbose 2>&1 || npm install --include=dev

# Ensure Prisma CLI binaries are executable
# RUN chmod +x node_modules/.bin/* 2>/dev/null || true

# Copy source code BEFORE generating Prisma client
COPY . .

# NOW generate Prisma client with the final schema
RUN npx prisma generate

# Create upload directories including physical-reports
RUN mkdir -p /app/uploads/logos /app/uploads/documents /app/uploads/damages /app/uploads/temp /app/uploads/shipments /app/uploads/physical-reports && \
  chmod -R 777 /app/uploads

# Ensure all binaries are executable
# Skip build for now - will run with ts-node in dev mode
# RUN chmod +x node_modules/.bin/* 2>/dev/null || true

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server in development mode with ts-node (allows running without compilation)
CMD ["npx", "ts-node", "src/index.ts"]
