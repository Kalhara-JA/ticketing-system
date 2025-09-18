## Overview

A minimal, server-first **Service Request / Ticketing** app built with:

* **Next.js (App Router)**
* **Prisma** + **PostgreSQL**
* **Better Auth** (email+password, username, RBAC)
* **Resend** (email)
* **MinIO/S3** (attachments via presigned URLs)
* **Zod** (validation)

### Key features

* Username/email login, email verification & password reset
* RBAC: `user` (requester) and `admin`
* Tickets with statuses & priorities; comment threads, attachments
* Email notifications (admin on create, other party on comment, requester on status change, admin on reopen) w/ 1-minute de-dup
* Full audit log
* Search (title/body) using Postgres trigram + FTS
* Admin dashboard metrics + trends
* Auto-close job for resolved tickets after N days
* Secure, RBAC-checked download proxy for attachments

---

## Project structure (high level)

```
src/
  app/
    (auth)/...
    (user)/tickets/...
    admin/...
    api/
      auth/[...all]/route.ts           # Better Auth handler
      attachments/[id]/route.ts        # Secure download proxy
      attachments/presign/route.ts     # Presign uploads
      resolve-identifier/route.ts      # username/email -> email
  components/
  features/
    audit/
    tickets/
      components/
      repositories/
      services/
      email.ts
    comments/
    attachments/
  lib/
    auth/
    db/
    email/
    storage/
    validation/
prisma/
  models/*.schema                      # split schema parts
  migrations/                          # prisma migrations
scripts/
  auto-close-resolved.mjs              # optional background job
```

---

## Requirements

* Node.js 18+ (Node 20 recommended)
* PostgreSQL 14+ (the migration enables `pg_trgm`)
* MinIO or S3-compatible storage
* Resend API key (email)
* (Optional) Docker + Docker Compose

---

## Environment variables

Create `.env`:

```bash
# App
APP_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-long-random-string

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tickets?schema=public

# Email (Resend)
RESEND_API_KEY=replace-me
ADMIN_EMAIL=admin@example.com

# MinIO (or S3 values)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ticket-attachments

# (Optional) jobs
AUTO_CLOSE_DAYS=14
```

---

## Install & dev

```bash
# 1) Install deps
npm ci

# 2) Build the composed Prisma schema + generate client
npm run prisma:generate

# 3) Run migrations (includes pg_trgm + FTS + DB checks)
npm run prisma:migrate

# 4) Run dev server
npm run dev
```

Visit:

* `/signup` → create account (username + email + password)
* Check your inbox for the verification link (Resend)
* `/login` → login with username **or** email + password
* `/tickets` → user list & “New Ticket”
* `/admin/dashboard` → admin dashboard (after promoting a user’s `role` to `admin`)

> **Promote to admin**
> Open Prisma Studio: `npx prisma studio`, set `User.role = 'admin'` for your account.

---

## Storage (MinIO)

* Start MinIO (see Compose below) or point to your S3.
* Ensure the bucket exists (first run can do this via your `ensureBucket()` util or MinIO console).
* Attachments are limited to **pdf/png/jpg**, ≤ **10 MB**, **≤ 5 files** per ticket (client + server + DB checks).

---

## Email (Resend)

* Add your verified sender domain & address.
* `RESEND_API_KEY` must be set.
* New users receive verification emails; password resets & notifications use the same sender.

---

## Scripts

```bash
# Prisma helpers (compose schema parts -> schema.prisma, generate client, run migrations)
npm run prisma:build-schema
npm run prisma:generate
npm run prisma:migrate

# Background job (optional): auto-close "resolved" tickets after N days
npm run jobs:autoClose
```

---

## Testing

```bash
npx vitest run
```

---

## Production (Docker)

You can run the app with the **Dockerfile** below (multi-stage, production).
The container will: **run migrations on start** and then `next start`.

### Dockerfile

```dockerfile
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
CMD ["sh", "-c", "pnpm run prisma migrate deploy && next start -p 3000"]
```

> Notes
>
> * The Docker build runs `prisma generate` (using your split-schema builder script).
> * Migrations run at **container start** (`migrate deploy`) so new envs self-update.
> * If you use Next’s `output: 'standalone'`, you can shrink the runtime image further by copying `.next/standalone` + `.next/static` and only the `public/` + `prisma/` folders. The above is the simpler, reliable pattern.

---

## Optional: docker-compose (dev or quick demo)

```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: tickets
    ports:
      - "5432:5432"
    volumes:
      - dbdata:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"  # S3 API
      - "9001:9001"  # Console
    volumes:
      - miniodata:/data

  app:
    build: .
    depends_on:
      - db
      - minio
    environment:
      APP_URL: http://localhost:3000
      AUTH_SECRET: replace-with-a-long-random-string
      DATABASE_URL: postgresql://postgres:postgres@db:5432/tickets?schema=public
      RESEND_API_KEY: replace-me
      ADMIN_EMAIL: admin@example.com
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_SSL: "false"
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: ticket-attachments
      AUTO_CLOSE_DAYS: 14
    ports:
      - "3000:3000"

  # Optional: run the auto-close job hourly
  autoclose:
    build: .
    depends_on:
      - db
    command: sh -c "while true; do node scripts/auto-close-resolved.mjs; sleep 3600; done"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/tickets?schema=public
      RESEND_API_KEY: replace-me
      APP_URL: http://localhost:3000
      AUTO_CLOSE_DAYS: 14

volumes:
  dbdata:
  miniodata:
```

**Bring it up:**

```bash
docker compose up --build
```

Then open:

* App: [http://localhost:3000](http://localhost:3000)
* MinIO Console: [http://localhost:9001](http://localhost:9001) (login: minioadmin / minioadmin)
  → Create bucket `ticket-attachments` (or run your `ensureBucket()` once).

---

## Deployment checklist

* ✅ `APP_URL` set to your **public HTTPS** domain (no trailing slash).
* ✅ `AUTH_SECRET` set to a long random string.
* ✅ Postgres reachable; `DATABASE_URL` correct; migrations run on start.
* ✅ Resend domain & sender verified; `RESEND_API_KEY` set.
* ✅ MinIO/S3 accessible; bucket exists; envs set.
* ✅ Reverse proxy forwards `X-Forwarded-For` (for audit IPs).
* ✅ Admin user promoted (`role='admin'`).
* ✅ Auto-close job scheduled (cron or compose sidecar) if desired.

---

## Troubleshooting

* **“pg\_trgm requires superuser”**
  Use the default `postgres` superuser or grant privileges; our migration runs `CREATE EXTENSION IF NOT EXISTS pg_trgm;`.

* **Email not sending**
  Check `RESEND_API_KEY`, sender domain verification, and logs. In dev, it’s fine to see failures if not configured.

* **MinIO 403 / CORS**
  We use presigned uploads/downloads; no special CORS config is needed beyond allowing your app origin if you front with a different host.

* **Auth cookies**
  In production, ensure you’re on HTTPS so cookies are marked `Secure`.

---
