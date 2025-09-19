# Ticketing System Documentation

## 📋 Overview

Internal Service Request (Ticketing) System - A multi-user service request management platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Docker (for database and MinIO)

### Setup
```bash
# Install dependencies
pnpm install

# Start services
docker-compose up -d

# Run migrations
pnpm db:migrate

# Start development
pnpm dev
```

## 📁 Documentation

- **[Test Summary](./test-summary.md)** - Test coverage and results
- **[Deployment Guide](./deployment.md)** - Production deployment instructions

## 🔧 Key Features

- ✅ Multi-tenant ticket management
- ✅ Admin controls and user isolation
- ✅ File attachments with MinIO
- ✅ Email notifications
- ✅ Audit logging
- ✅ Search and filtering
- ✅ RBAC security

## 📊 Test Coverage

- **Total Tests**: 72
- **Passing**: 72 (100%)
- **Coverage**: All core functionality

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma
- **Auth**: Better-Auth
- **Storage**: MinIO (S3-compatible)
- **Email**: Resend API
- **Testing**: Vitest

---

*Last updated: September 2025*