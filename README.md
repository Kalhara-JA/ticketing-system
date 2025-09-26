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

* Node.js 22+ (Node 22 LTS recommended)
* PostgreSQL 14+ (the migration enables `pg_trgm`)
* MinIO or S3-compatible storage
* Resend API key (email)
* (Optional) Docker + Docker Compose

---

## Environment variables

Create `.env`:

```bash
# Application Configuration
APP_URL="http://localhost:3000"
NODE_ENV="development"
AUTO_CLOSE_DAYS=14

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tickets?schema=public"

# Authentication
BETTER_AUTH_SECRET="T1OeNmemOXA6jtOUM0x3ZgpoiuUgHcjh"

# Email Configuration
RESEND_API_KEY="replace-me"
EMAIL_FROM="Support <onboarding@resend.dev>"
ADMIN_EMAIL="admin@example.com"

# MinIO Configuration
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="ticket-attachments"

# MinIO External Configuration (for presigned URLs)
# These should match MINIO_ENDPOINT/MINIO_PORT in most cases
MINIO_EXTERNAL_ENDPOINT="localhost"
MINIO_EXTERNAL_PORT="9000"
MINIO_EXTERNAL_SSL="false"

```

---

## Install & dev

```bash
# 1) Install deps (use frozen lockfile)
pnpm install --frozen-lockfile

# 2) Build the composed Prisma schema + generate client
pnpm run prisma:generate

# 3) Run migrations (includes pg_trgm + FTS + DB checks)
pnpm run prisma:migrate

# 4) Run dev server
pnpm run dev
```

Visit:

* `/signup` → create account (username + email + password)
* Check your inbox for the verification link (Resend)
* `/login` → login with username **or** email + password
* `/tickets` → user list & “New Ticket”
* `/admin/dashboard` → admin dashboard (after promoting a user’s `role` to `admin`)

> **Promote to admin**
> Open Prisma Studio: `pnpm prisma studio`, set `User.role = 'admin'` for your account.

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
# Development
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm prisma:generate        # Generate Prisma client
pnpm prisma:migrate         # Run database migrations
pnpm prisma:migrate:deploy  # Deploy migrations (production)

# Testing
pnpm test                   # Run all tests
pnpm test:unit             # Run unit tests only (fast)
pnpm test:integration      # Run integration tests (with containers)
pnpm test:integration:flow # Run comprehensive integration flow test
pnpm test:watch            # Run tests in watch mode

# Background jobs
pnpm jobs:autoClose        # Auto-close resolved tickets after N days
pnpm seed:admin            # Seed admin user
```

---

## Testing

### Test Suite Overview

The project includes a comprehensive test suite with both unit and integration tests:

- **Unit Tests**: Fast tests for individual components and functions
- **Integration Tests**: End-to-end tests with real database and MinIO containers

### Running Tests

```bash
# Run all tests (unit + integration)
pnpm test

# Run only unit tests (fast, ~2 seconds)
pnpm test:unit

# Run only integration tests (with containers, ~18 seconds)
pnpm test:integration

# Run the comprehensive integration flow test
pnpm test:integration:flow

# Run tests in watch mode
pnpm test:watch
```

### Test Configuration

- **Unit Tests**: Use `vitest.config.mts` with standard timeouts
- **Integration Tests**: Use `vitest.integration.config.mts` with extended timeouts for container startup
- **Test Database**: PostgreSQL container with automatic migrations
- **Test Storage**: MinIO container for attachment testing
- **Test Environment**: Isolated test environment with `.env.test`

### Test Coverage

The integration tests cover:
- ✅ Complete ticket lifecycle (create → comment → attachment → status updates → reopen)
- ✅ MinIO storage operations (presigned URLs, bucket management)
- ✅ Database operations with real PostgreSQL
- ✅ Audit logging for all operations
- ✅ Email notifications (mocked)
- ✅ RBAC permissions and user roles

### Test Environment Setup

The integration tests use isolated test containers:

- **Test Database**: PostgreSQL container with automatic migrations
- **Test Storage**: MinIO container for attachment testing
- **Test Environment**: Uses `.env.test` for isolated configuration
- **Container Management**: Automatic startup/teardown with Testcontainers
- **Sequential Execution**: Tests run in sequence to share containers efficiently

### Test Environment Variables

Create `.env.test` for test-specific configuration:

```bash
# Test Database (will be overridden by Testcontainers)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test_tickets?schema=public"

# Test MinIO (will be overridden by Testcontainers)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="ticket-attachments"

# Test Email (mocked in tests)
RESEND_API_KEY="test-key"
EMAIL_FROM="test@example.com"
ADMIN_EMAIL="admin@example.com"

# Test Application
APP_URL="http://localhost:3000"
NODE_ENV="test"
```

---

## Production Deployment

### Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (see Environment Variables section)

### Quick Deploy with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ticketing-system
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Deploy the application:**
   ```bash
   # Build and start all services
   docker compose up --build
   ```

4. **Verify deployment:**
   ```bash
   # Check container status
   docker compose ps
   
   # Check application logs
   docker compose logs app
   
   # Test the application
   curl http://localhost:3000
   ```

### Access Points

- **Application**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)
- **Database**: localhost:5432 (postgres/postgres)

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/tickets?schema=public

# Authentication
BETTER_AUTH_SECRET=your-long-random-secret-key

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# MinIO Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ticket-attachments

# MinIO External Configuration (for presigned URLs)
MINIO_EXTERNAL_ENDPOINT=minio
MINIO_EXTERNAL_PORT=9000
MINIO_EXTERNAL_SSL=false

# Application
APP_URL=http://localhost:3000
AUTO_CLOSE_DAYS=14
```

### Production Considerations

- **Security**: Change default passwords and secrets
- **SSL**: Use HTTPS in production with proper certificates
- **Domain**: Update `APP_URL` and `BETTER_AUTH_URL` to your production domain
- **Email**: Verify your domain with Resend and use a proper sender address
- **Storage**: Configure MinIO with proper access controls or use AWS S3
- **Backup**: Set up regular database and file backups

---

## Deployment checklist

* ✅ `APP_URL` set to your **public HTTPS** domain (no trailing slash).
* ✅ `BETTER_AUTH_SECRET` set to a long random string.
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
