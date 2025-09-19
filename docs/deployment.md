# Deployment Guide

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose
- Environment variables configured

### Quick Deploy
```bash
# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec app pnpm db:migrate

# Verify deployment
curl http://localhost:3000/api/health
```

## ⚙️ Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@postgres:5432/ticketing_system"

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="https://yourdomain.com"

# File Storage
MINIO_ENDPOINT="minio"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="attachments"

# Email
RESEND_API_KEY="your-resend-key"
ADMIN_EMAIL="admin@yourdomain.com"
EMAIL_FROM="noreply@yourdomain.com"

# Application
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

## 🏗️ Production Setup

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      # ... other environment variables
    depends_on:
      - postgres
      - minio

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ticketing_system
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

## 🔒 Security

### SSL/TLS
- Use reverse proxy (Nginx) for SSL termination
- Configure HTTPS redirects
- Use secure environment variable storage

### Database Security
- Use strong passwords
- Enable SSL connections
- Regular backups

## 📊 Monitoring

### Health Checks
- `GET /api/health` - Application health
- Database connectivity
- File storage access
- Email service status

### Logs
```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres
```

## 🔄 Backup

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres ticketing_system > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres ticketing_system < backup.sql
```

### File Backup
```bash
# Backup MinIO data
docker-compose exec minio mc mirror /data /backup/
```

---

*Last updated: September 2025*