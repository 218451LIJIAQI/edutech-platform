# syntax=docker/dockerfile:1

# ---------- Base deps stage (installs dependencies) ----------
FROM node:20.11.1-alpine AS deps
WORKDIR /app
# Prisma needs openssl on Alpine
RUN apk add --no-cache openssl

# Copy backend package manifests (lockfile optional)
# Using wildcard ensures build doesn't fail if package-lock.json is missing
COPY backend/package*.json ./

# Install dependencies (prefer lockfile, fallback if not present)
RUN if [ -f package-lock.json ] && [ -s package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --include=dev --no-audit --no-fund; \
    fi

# ---------- Builder stage (builds the app) ----------
FROM node:20.11.1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Bring node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy full backend source
COPY backend/ ./

# Generate Prisma client if schema exists
RUN if [ -d prisma ] || [ -f prisma/schema.prisma ]; then \
      npx prisma generate; \
    else \
      echo "No prisma schema found, skipping generate"; \
    fi

# Build (supports TypeScript projects with build script)
# If build script is absent, this will no-op.
RUN if npm run | grep -qE "\bbuild\b"; then \
      npm run build; \
    else \
      echo "No build script defined, skipping build"; \
    fi

# ---------- Production runtime stage ----------
FROM node:20.11.1-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl && addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copy production files (lockfile optional)
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Include prisma assets (optional, useful for migrations)
COPY --from=builder /app/prisma ./prisma

# Prune devDependencies if any slipped in
RUN if [ -f package-lock.json ] && [ -s package-lock.json ]; then \
      npm prune --omit=dev --no-audit --no-fund; \
    else \
      npm remove prisma || true; \
    fi

# Healthcheck placeholder (customize path/port as needed)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000
USER nodeuser

# Prefer start script; fallback to running built server
CMD if npm run | grep -qE "\bstart\b"; then \
      npm run start; \
    elif [ -f dist/main.js ]; then \
      node dist/main.js; \
    elif [ -f dist/server.js ]; then \
      node dist/server.js; \
    else \
      echo "No start script or entry file found. Please define \"start\" script or provide dist/main.js" && exit 1; \
    fi