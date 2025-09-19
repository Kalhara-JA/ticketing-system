# syntax=docker/dockerfile:1.6

############################
# Base image
############################
FROM node:20-alpine AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# prisma engines need OpenSSL; next/sharp is fine on alpine
# Also install postgresql-client for pg_isready
RUN apk add --no-cache libc6-compat openssl postgresql-client
# Install pnpm with retry logic
RUN npm install -g pnpm@latest
# Configure pnpm for better network reliability
RUN pnpm config set network-timeout 300000
RUN pnpm config set fetch-retries 5
RUN pnpm config set fetch-retry-factor 2
RUN pnpm config set fetch-retry-mintimeout 10000
RUN pnpm config set fetch-retry-maxtimeout 60000

############################
# Dependencies
############################
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Install dependencies with retry logic and better error handling
RUN pnpm install --frozen-lockfile || \
    (echo "First attempt failed, retrying..." && sleep 10 && pnpm install --frozen-lockfile) || \
    (echo "Second attempt failed, retrying with no cache..." && sleep 10 && pnpm install --no-cache)

############################
# Build
############################
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compose Prisma schema & generate client for build
RUN pnpm run prisma:generate
# Build Next.js
RUN pnpm run build

############################
# Runtime
############################
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what we need at runtime
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma generated client and engines
COPY --from=builder /app/generated ./generated

# Copy .env file for runtime (if it exists)
COPY --from=builder /app/.env* ./

# Make scripts executable and set permissions
RUN chmod +x ./scripts/*.sh && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run DB migrations with proper waiting and logging, then start Next
CMD ["/app/scripts/migrate-and-start.sh"]
