# Multi-stage build for optimized production image

# Stage 1: Build (install all deps, build, and prepare runtime artifacts)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and prisma schema first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev) for building
RUN npm ci

# Copy the rest of the source
COPY . .

# Generate Prisma Client (uses prisma/schema.prisma)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Optionally prune devDependencies to reduce size for runtime
RUN npm prune --omit=dev

# Stage 2: Production (copy built artifacts and production deps from builder)
FROM node:18-alpine

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema (optional, useful for tooling/ops)
COPY --from=builder /app/prisma ./prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

