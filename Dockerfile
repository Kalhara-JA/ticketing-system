# syntax=docker/dockerfile:1.6

############################
# Base
############################
FROM node:20-alpine AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN apk add --no-cache libc6-compat openssl bash postgresql-client curl \
 && corepack enable
WORKDIR /app

############################
# Dependencies (cache-friendly online install)
############################
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Use BuildKit cache for the pnpm store so subsequent builds are fast
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

############################
# Build
############################
FROM base AS builder
WORKDIR /app
# Reuse the deps layer's node_modules to avoid re-downloading
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm run prisma:generate

# Build Next.js (standalone)
RUN pnpm run build

# Build Next (standalone output recommended)
# Make sure next.config.ts has: export default { output: "standalone" }
RUN pnpm run build

############################
# Runtime
############################
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl bash postgresql-client curl

# --- Next.js standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# --- Prisma schema, generated client, and engines
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
# Prisma engines used by the generated client live under node_modules/.prisma and @prisma
# Copy only what's needed to keep the runtime small but functional
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# --- App scripts
COPY --from=builder /app/scripts ./scripts

# Secure user
RUN addgroup -S nextjs -g 1001 \
 && adduser -S nextjs -u 1001 -G nextjs \
 && chmod +x ./scripts/*.sh \
 && chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runs migrations then boots the Next server (node server.js from standalone)
CMD ["bash","-lc","/app/scripts/migrate-and-start.sh"]
