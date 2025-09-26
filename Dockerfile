# syntax=docker/dockerfile:1.6

############################
# Base
############################
FROM node:22-alpine AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
WORKDIR /app

# Packages used across stages
RUN apk add --no-cache libc6-compat openssl bash postgresql-client curl \
  && corepack enable

############################
# Dependencies (cache-friendly online install)
############################
FROM base AS deps
WORKDIR /app

# Lock deps early for better caching
COPY package.json pnpm-lock.yaml ./

# Activate specific pnpm
RUN corepack prepare pnpm@10.17.0 --activate

# Harden installs for flaky networks + enable BuildKit cache for the store
RUN pnpm config set network-timeout 600000 \
 && pnpm config set fetch-retries 5 \
 && pnpm config set fetch-retry-factor 2 \
 && pnpm config set fetch-retry-maxtimeout 120000

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

############################
# Build
############################
FROM base AS builder
WORKDIR /app

# Reuse resolved deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client at build time
RUN pnpm run prisma:generate

# Build Next.js (standalone output recommended in next.config)
# next.config.(js|ts): export default { output: "standalone" }
RUN pnpm run build

############################
# Runtime
############################
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl bash postgresql-client curl \
  && corepack enable

# --- Next.js standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# --- Prisma schema, generated client, and engines
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# --- App scripts (e.g., maintenance jobs)
COPY --from=builder /app/scripts ./scripts

# --- Source files needed for seed script
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/node_modules ./node_modules

# Unprivileged user
RUN addgroup -S nextjs -g 1001 \
 && adduser -S nextjs -u 1001 -G nextjs \
 && chmod +x ./scripts/*.sh || true \
 && chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start only the app here; migrations are handled by a separate one-shot service
CMD ["node","server.js"]
