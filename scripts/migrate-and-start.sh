#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting application startup process..."

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if database is ready
wait_for_db() {
    log "🔄 Waiting for database to be ready..."
    
    # Get database URL from environment
    DB_URL=${DATABASE_URL:-"postgresql://postgres:postgres@db:5432/tickets?schema=public"}
    
    # Extract host and port from DATABASE_URL
    DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    if [ -z "$DB_HOST" ]; then
        DB_HOST="db"
    fi
    if [ -z "$DB_PORT" ]; then
        DB_PORT="5432"
    fi
    
    log "📍 Database host: $DB_HOST, port: $DB_PORT"
    
    # Wait for database to be available
    local retries=0
    local max_retries=30
    
    while [ $retries -lt $max_retries ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres >/dev/null 2>&1; then
            log "✅ Database is ready!"
            return 0
        fi
        
        retries=$((retries + 1))
        log "⏳ Database is unavailable - attempt $retries/$max_retries (sleeping for 2 seconds)..."
        sleep 2
    done
    
    log "❌ Database failed to become ready after $max_retries attempts"
    exit 1
}

# Function to run migrations
run_migrations() {
    log "🚀 Starting database migrations..."
    
    # Check if Prisma is available
    if ! command -v pnpm &> /dev/null; then
        log "❌ pnpm not found"
        exit 1
    fi
    
    # Run migrations with verbose output
    log "📋 Running: pnpm prisma migrate deploy"
    if pnpm prisma migrate deploy --verbose; then
        log "✅ Database migrations completed successfully!"
    else
        log "❌ Database migrations failed!"
        exit 1
    fi
}

# Function to start the application
start_app() {
    log "🚀 Starting Next.js application..."
    log "📋 Running: pnpm start"
    exec pnpm start
}

# Main execution
main() {
    log "🎯 Application startup sequence initiated"
    
    # Step 1: Wait for database
    wait_for_db
    
    # Step 2: Run migrations
    run_migrations
    
    # Step 3: Start application
    start_app
}

# Run main function
main "$@"
