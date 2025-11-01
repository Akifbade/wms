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

# Ensure Prisma CLI binaries are executable
RUN chmod +x node_modules/.bin/* 2>/dev/null || true

# Copy source code BEFORE generating Prisma client
COPY . .

# NOW generate Prisma client with the final schema
RUN chmod +x node_modules/.bin/prisma && npx prisma generate

# Create upload directories
RUN mkdir -p /app/uploads/logos /app/uploads/documents /app/uploads/damages /app/uploads/temp /app/uploads/shipments && \
    chmod -R 777 /app/uploads

# Ensure all binaries are executable
# Skip build for now - will run with ts-node in dev mode
RUN chmod +x node_modules/.bin/* 2>/dev/null || true

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server in development mode with ts-node (allows running without compilation)
CMD ["npx", "ts-node", "src/index.ts"]
