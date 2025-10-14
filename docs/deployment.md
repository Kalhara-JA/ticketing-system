# Deployment Guide

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- Environment variables configured

### Quick Deploy

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd ticketing-system
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Deploy the application:**
   ```bash
   # Build and start all services
   docker compose up --build
   ```
   
   The deployment process includes:
   - Database setup and migrations
   - **Automatic admin user creation** (using ADMIN_EMAIL, ADMIN_PASSWORD, etc.)
   - Application startup

3. **Verify deployment:**
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

### Admin User Setup
The system automatically creates an admin user during deployment using the environment variables:
- `ADMIN_EMAIL`: Admin user's email address
- `ADMIN_PASSWORD`: Admin user's password (default: `Admin123!`)
- `ADMIN_NAME`: Admin user's display name (default: `System Administrator`)
- `ADMIN_USERNAME`: Admin user's username (default: `admin`)

You can log in to the application using these credentials immediately after deployment.

## ⚙️ Environment Variables

Create a `.env` file with the following required variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/tickets?schema=public

# Authentication
BETTER_AUTH_SECRET=your-long-random-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com

# Admin User (automatically seeded on first run)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=System Administrator
ADMIN_USERNAME=admin

# MinIO Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ticket-attachments

# Application
APP_URL=http://localhost:3000
AUTO_CLOSE_DAYS=14

# Feature Flags
ENABLE_ATTACHMENTS=true  # Set to false to disable attachment functionality
```

## 🏗️ Production Setup

### Environment Configuration

For production deployment, update the following variables:

```bash
# Production URLs
APP_URL=https://yourdomain.com
BETTER_AUTH_URL=https://yourdomain.com

# Secure secrets
BETTER_AUTH_SECRET=your-production-secret-key

# Production email
RESEND_API_KEY=your-production-resend-key
EMAIL_FROM=noreply@yourdomain.com

# Production admin user
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=System Administrator
ADMIN_USERNAME=admin

# Production storage (optional: use AWS S3)
MINIO_ENDPOINT=your-s3-endpoint
MINIO_ACCESS_KEY=your-s3-access-key
MINIO_SECRET_KEY=your-s3-secret-key
MINIO_BUCKET=your-production-bucket
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

### Application Security
- Change default MinIO credentials
- Use strong `BETTER_AUTH_SECRET`
- Verify email domains with Resend
- Set up proper CORS policies

## 📊 Monitoring

### Health Checks
```bash
# Check application status
curl http://localhost:3000

# Check container health
docker compose ps

# View application logs
docker compose logs app

# View database logs
docker compose logs db

# View MinIO logs
docker compose logs minio
```

### Logs
```bash
# Follow application logs
docker compose logs -f app

# Follow all service logs
docker compose logs -f

# View specific service logs
docker compose logs --tail=100 app
```

## 🔄 Backup & Maintenance

### Database Backup
```bash
# Create backup
docker compose exec db pg_dump -U postgres tickets > backup-$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T db psql -U postgres tickets < backup-20250920.sql
```

### File Storage Backup
```bash
# Backup MinIO data (if using local MinIO)
docker compose exec minio mc mirror /data /backup/

# For AWS S3, use AWS CLI or S3 sync tools
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose down
docker compose up -d --build

# Check status
docker compose ps
```

## 🚀 Production Deployment

### Using Docker Compose

1. **Server Setup:**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Deploy Application:**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd ticketing-system
   
   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production values
   
   # Deploy
   docker compose up -d --build
   ```

3. **Setup Reverse Proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Environment Variables for Production

```bash
# Production URLs
APP_URL=https://yourdomain.com
BETTER_AUTH_URL=https://yourdomain.com

# Database (use external PostgreSQL for production)
DATABASE_URL=postgresql://username:password@your-db-host:5432/tickets?schema=public

# Secure authentication
BETTER_AUTH_SECRET=your-very-long-random-secret-key

# Email configuration
RESEND_API_KEY=your-production-resend-key
EMAIL_FROM=noreply@yourdomain.com

# Admin user configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_NAME=System Administrator
ADMIN_USERNAME=admin

# Storage (use AWS S3 for production)
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_SSL=true
MINIO_ACCESS_KEY=your-aws-access-key
MINIO_SECRET_KEY=your-aws-secret-key
MINIO_BUCKET=your-production-bucket

# Auto-close configuration
AUTO_CLOSE_DAYS=14

# Feature Flags
ENABLE_ATTACHMENTS=true  # Set to false to disable attachment functionality
```

## 🚩 Feature Flags

The application supports feature flags to control functionality:

### `ENABLE_ATTACHMENTS`

Controls attachment functionality across the entire application.

**Configuration:**
```bash
# Enable attachments (default)
ENABLE_ATTACHMENTS=true

# Disable attachments
ENABLE_ATTACHMENTS=false
```

**When Disabled:**
- ✅ All attachment UI elements are hidden
- ✅ Upload/download APIs return 403 Forbidden
- ✅ Server actions throw clear error messages
- ✅ No file storage infrastructure required
- ⚠️ Existing attachments remain in database but inaccessible

**Use Cases:**
- **Compliance**: Deploy in environments that prohibit file uploads
- **Simplified Setup**: Deploy without MinIO/S3 infrastructure
- **Maintenance**: Temporarily disable during storage system maintenance
- **Testing**: Test core functionality without file handling complexity

**Deployment Examples:**

**Minimal Deployment (No Attachments):**
```bash
# Disable attachments for simplified deployment
ENABLE_ATTACHMENTS=false

# MinIO configuration not required when disabled
# MINIO_ENDPOINT=...
# MINIO_ACCESS_KEY=...
# MINIO_SECRET_KEY=...
```

**Full Deployment (With Attachments):**
```bash
# Enable attachments (default)
ENABLE_ATTACHMENTS=true

# Configure MinIO/S3 storage
MINIO_ENDPOINT=your-storage-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket-name
```

## 🔧 Troubleshooting

### Common Issues

1. **Application won't start:**
   ```bash
   # Check logs
   docker compose logs app
   
   # Check database connection
   docker compose exec app pg_isready -h db -p 5432
   ```

2. **Database connection issues:**
   ```bash
   # Check database status
   docker compose ps db
   
   # Check database logs
   docker compose logs db
   ```

3. **File upload issues:**
   ```bash
   # Check MinIO status
   docker compose ps minio
   
   # Access MinIO console
   # http://localhost:9001 (admin/minioadmin)
   ```

4. **Email not working:**
   - Verify Resend API key
   - Check domain verification in Resend dashboard
   - Review email logs in application

### Performance Optimization

- Use external PostgreSQL database for production
- Configure Redis for session storage
- Set up CDN for static assets
- Use AWS S3 or similar for file storage
- Configure proper caching headers

---

*Last updated: September 2025*