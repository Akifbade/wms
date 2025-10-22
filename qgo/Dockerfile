FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npm run prisma:generate

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose ports
EXPOSE 3000 5000

# Set environment to production
ENV NODE_ENV=production

# Run migrations and start server
CMD ["sh", "-c", "npm run prisma:migrate:deploy && node dist/server/index.js"]
