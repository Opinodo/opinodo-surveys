FROM node:22-alpine3.20 AS build

# Install dependencies
RUN apk update && apk add --no-cache g++ make gcc python3 openssl-dev

# Set build-only environment variables
# This is never used to connect to a real DB, just for Prisma code generation
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake?schema=public"
ENV PRISMA_SCHEMA_ENGINE_BINARY="/tmp/prisma-schema-engine"
ENV PRISMA_QUERY_ENGINE_BINARY="/tmp/prisma-query-engine"
ENV PRISMA_GENERATE_DATAPROXY=false

# Create app directory
WORKDIR /app/packages/database

# Copy only the necessary files for building
COPY apps/migrations/migration-package.json ./package.json
COPY packages/database/schema.prisma ./

# Install dependencies including required Prisma generators
RUN npm install
RUN npm install prisma-json-types-generator

# Generate Prisma client code only - no database connection is made
# This step validates the schema and generates TypeScript code
RUN npx prisma generate

# Start fresh for the runtime image (multi-stage build)
FROM node:22-alpine3.20

# Install runtime dependencies
RUN apk update && apk add --no-cache python3 openssl

WORKDIR /app/packages/database

# Copy from build stage and add migration files
COPY --from=build /app/packages/database/node_modules ./node_modules
COPY --from=build /app/packages/database/package.json ./
COPY --from=build /app/packages/database/schema.prisma ./

# Copy migration files and scripts
COPY packages/database/migration ./migration/
COPY packages/database/src ./src/

# Add a health check script to verify database connection
RUN echo '#!/bin/sh\n\
echo "Checking database connection..."\n\
npx prisma db execute --stdin <<EOF\n\
SELECT 1;\n\
EOF\n\
if [ $? -eq 0 ]; then\n\
  echo "Database connection successful!"\n\
  exit 0\n\
else\n\
  echo "Database connection failed!"\n\
  exit 1\n\
fi' > /app/health-check.sh && chmod +x /app/health-check.sh

# Create the entrypoint script
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# Print environment variables for debugging (excluding sensitive info)\n\
echo "Environment variables available:"\n\
env | grep -v PASSWORD | grep -v SECRET | grep -v KEY\n\
\n\
# Decode URL-encoded DATABASE_URL if needed\n\
if [ ! -z "$DATABASE_URL" ]; then\n\
  echo "Database URL found, checking format..."\n\
  if echo "$DATABASE_URL" | grep -q "%"; then\n\
    echo "URL-encoded DATABASE_URL detected, decoding..."\n\
    # Parse and decode the DATABASE_URL\n\
    PROTOCOL=$(echo $DATABASE_URL | cut -d: -f1)\n\
    USER_PASS_HOST_PORT=$(echo $DATABASE_URL | cut -d/ -f3)\n\
    USER=$(echo $USER_PASS_HOST_PORT | cut -d: -f1)\n\
    PASS=$(echo $USER_PASS_HOST_PORT | cut -d: -f2 | cut -d@ -f1)\n\
    HOST_PORT=$(echo $USER_PASS_HOST_PORT | cut -d@ -f2)\n\
    DB_PATH=$(echo $DATABASE_URL | cut -d/ -f4-)\n\
    \n\
    # URL decode the password\n\
    DECODED_PASS=$(echo $PASS | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read()), end=\'\')")\n\
    \n\
    # Reconstruct the DATABASE_URL with the decoded password\n\
    FIXED_URL="${PROTOCOL}://${USER}:${DECODED_PASS}@${HOST_PORT}/${DB_PATH}"\n\
    echo "Using decoded DATABASE_URL (password hidden)"\n\
    export DATABASE_URL=$FIXED_URL\n\
  else\n\
    echo "DATABASE_URL is not URL-encoded, using as is"\n\
  fi\n\
else\n\
  echo "ERROR: DATABASE_URL environment variable is not set!"\n\
  exit 1\n\
fi\n\
\n\
# Check database connection before attempting migrations\n\
echo "Checking database connection..."\n\
/app/health-check.sh\n\
\n\
# Check if DataMigration table exists, create it if not\n\
echo "Checking for DataMigration table..."\n\
TABLE_EXISTS=$(npx prisma db execute --stdin <<EOF | grep -c "datamigration" || echo "0"\n\
SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = \'DataMigration\';\n\
EOF\n\
)\n\
\n\
if [ "$TABLE_EXISTS" -eq 0 ]; then\n\
  echo "Creating DataMigration table..."\n\
  npx prisma db execute --stdin <<EOF\n\
  CREATE TYPE IF NOT EXISTS "DataMigrationStatus" AS ENUM (\'pending\', \'applied\', \'failed\');\n\
  CREATE TABLE IF NOT EXISTS "DataMigration" (\n\
    "id" TEXT NOT NULL,\n\
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n\
    "finished_at" TIMESTAMP(3),\n\
    "name" TEXT NOT NULL,\n\
    "status" "DataMigrationStatus" NOT NULL,\n\
    CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("id")\n\
  );\n\
  CREATE UNIQUE INDEX IF NOT EXISTS "DataMigration_name_key" ON "DataMigration"("name");\n\
EOF\n\
fi\n\
\n\
# Run actual migrations - only at runtime with real database\n\
echo "Running migrations..."\n\
npm run db:migrate:deploy && npm run db:create-saml-database:deploy\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Run the entrypoint script when container starts
CMD ["/app/entrypoint.sh"]
