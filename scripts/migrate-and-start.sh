#!/usr/bin/env bash
set -euo pipefail

echo "[BOOT] Waiting for database ${DATABASE_URL:-<unset>} ..."
# db host might be db when running in compose
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-tickets}"

# Allow override via DATABASE_URL if provided
if [[ -n "${DATABASE_URL:-}" ]]; then
  # Extract host, port, user, and database from DATABASE_URL for pg_isready
  # Format: postgresql://user:password@host:port/database?schema=public
  DB_URL_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_URL_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_URL_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_URL_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  # Use extracted values or fallback to defaults
  DB_HOST="${DB_URL_HOST:-$DB_HOST}"
  DB_USER="${DB_URL_USER:-$DB_USER}"
  DB_NAME="${DB_URL_NAME:-$DB_NAME}"
  if [[ -n "$DB_URL_PORT" ]]; then
    DB_PORT="$DB_URL_PORT"
  fi
fi

until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t 5; do
  echo "[BOOT] Postgres not ready yet, retrying..."
  sleep 2
done
echo "[BOOT] Database is ready."

echo "[BOOT] Running Prisma migrations..."
# Use migrate deploy (idempotent in containers)
npx prisma migrate deploy

# Optional: seed (only if you have a seed)
if [[ "${RUN_SEED:-false}" == "true" ]]; then
  echo "[BOOT] Seeding database..."
  npx prisma db seed || echo "[BOOT] Seed skipped/failed (non-fatal)."
fi

# Optional: ensure S3 bucket exists (MinIO)
if [[ -n "${MINIO_ENDPOINT:-}" && -n "${MINIO_BUCKET:-}" ]]; then
  echo "[BOOT] Ensuring MinIO bucket '$MINIO_BUCKET' exists..."
  # Requires mc (not installed). If you want this, add 'apk add --no-cache minio-client' in Dockerfile.
  # For now we skip to keep image slim.
fi

echo "[BOOT] Starting Next.js server..."
# Next standalone places server.js at /app/server.js
exec node server.js
