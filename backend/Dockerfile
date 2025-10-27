# Backend Dockerfile
# Using Debian-based Node for better Prisma compatibility
FROM node:18-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Clean any existing node_modules
RUN rm -rf node_modules package-lock.json 2>/dev/null || true

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies including devDependencies (needed for Prisma CLI)
# Use npm install as fallback if npm ci fails
RUN npm ci --include=dev --verbose 2>&1 || npm install --include=dev

# Ensure Prisma CLI binaries are executable then generate client
RUN find node_modules/.bin -name "prisma" -exec chmod +x {} \; 2>/dev/null || true && \
    npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server using ts-node (no build required)
CMD ["npx", "ts-node", "src/index.ts"]
