#!/bin/bash

# Wait for database to be ready
echo "🔄 Waiting for database to be ready..."

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

echo "📍 Database host: $DB_HOST, port: $DB_PORT"

# Wait for database to be available
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres; do
    echo "⏳ Database is unavailable - sleeping for 2 seconds..."
    sleep 2
done

echo "✅ Database is ready!"

# Run migrations with detailed logging
echo "🚀 Starting database migrations..."
pnpm prisma migrate deploy --verbose

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully!"
else
    echo "❌ Database migrations failed!"
    exit 1
fi

# Start the application
echo "🚀 Starting application..."
exec pnpm start
