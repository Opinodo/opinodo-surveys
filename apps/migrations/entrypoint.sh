#!/bin/sh
set -e

# Print environment variables for debugging (excluding sensitive info)
echo "Environment variables available:"
env | grep -v PASSWORD | grep -v SECRET | grep -v KEY

# Decode URL-encoded DATABASE_URL if needed
if [ ! -z "$DATABASE_URL" ]; then
  echo "Database URL found, checking format..."
  if echo "$DATABASE_URL" | grep -q "%"; then
    echo "URL-encoded DATABASE_URL detected, decoding..."
    # Parse and decode the DATABASE_URL
    PROTOCOL=$(echo $DATABASE_URL | cut -d: -f1)
    USER_PASS_HOST_PORT=$(echo $DATABASE_URL | cut -d/ -f3)
    USER=$(echo $USER_PASS_HOST_PORT | cut -d: -f1)
    PASS=$(echo $USER_PASS_HOST_PORT | cut -d: -f2 | cut -d@ -f1)
    HOST_PORT=$(echo $USER_PASS_HOST_PORT | cut -d@ -f2)
    DB_PATH=$(echo $DATABASE_URL | cut -d/ -f4-)
    
    # URL decode the password
    DECODED_PASS=$(echo $PASS | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read()), end='')")
    
    # Reconstruct the DATABASE_URL with the decoded password
    FIXED_URL="${PROTOCOL}://${USER}:${DECODED_PASS}@${HOST_PORT}/${DB_PATH}"
    echo "Using decoded DATABASE_URL (password hidden)"
    export DATABASE_URL=$FIXED_URL
  else
    echo "DATABASE_URL is not URL-encoded, using as is"
  fi
else
  echo "ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

# Check database connection before attempting migrations
echo "Checking database connection..."
/app/health-check.sh

# Check if DataMigration table exists, create it if not
echo "Checking for DataMigration table..."
TABLE_EXISTS=$(npx prisma db execute --stdin <<EOF | grep -c "datamigration" || echo "0"
SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'DataMigration';
EOF
)

if [ "$TABLE_EXISTS" -eq 0 ]; then
  echo "Creating DataMigration table..."
  npx prisma db execute --stdin <<EOF
  CREATE TYPE IF NOT EXISTS "DataMigrationStatus" AS ENUM ('pending', 'applied', 'failed');
  CREATE TABLE IF NOT EXISTS "DataMigration" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "status" "DataMigrationStatus" NOT NULL,
    CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "DataMigration_name_key" ON "DataMigration"("name");
EOF
fi

# Run actual migrations - only at runtime with real database
echo "Running migrations..."
npm run db:migrate:deploy && npm run db:create-saml-database:deploy
