# Multi-stage build for Frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Remove any cached files
RUN rm -rf node_modules package-lock.json yarn.lock 2>/dev/null || true

# Copy package files
COPY package*.json ./

# Install dependencies (clean install) with increased timeout
# Don't skip optional dependencies - they're needed for Alpine Linux (rollup)
RUN npm ci --legacy-peer-deps --verbose 2>&1 || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build application - fix permissions inline
RUN chmod +x node_modules/.bin/* 2>/dev/null || true && npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
