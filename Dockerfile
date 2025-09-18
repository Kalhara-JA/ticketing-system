# syntax=docker/dockerfile:1.6

############################
# Base image
############################
FROM node:20-alpine AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# prisma engines need OpenSSL; next/sharp is fine on alpine
RUN apk add --no-cache libc6-compat openssl

############################
# Dependencies
############################
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN pnpm ci

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

# Copy only what we need at runtime
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
# Run DB migrations, then start Next
CMD ["sh", "-c", "pnpm prisma migrate deploy && next start -p 3000"]
