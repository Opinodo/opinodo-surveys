FROM node:22-alpine3.20

# Install dependencies
RUN apk update && apk add --no-cache g++ make gcc python3 openssl-dev

# Set environment variables for build only - will be overridden at runtime
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/database?schema=public"

# Create app directory
WORKDIR /app/packages/database

# Copy only the necessary files for migrations
COPY apps/migrations/migration-package.json ./package.json
COPY packages/database/schema.prisma ./
COPY packages/database/migration ./migration/
COPY packages/database/src ./src/

# Install database dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

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

# Set up the entry point script
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# First try to generate the client to confirm database connection\n\
echo "Generating Prisma client..."\n\
npx prisma generate\n\
\n\
# Check if DataMigration table exists, create it if not\n\
echo "Checking for DataMigration table..."\n\
TABLE_EXISTS=$(npx prisma db execute --stdin <<EOF | grep -c "datamigration"\n\
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
# Run migrations\n\
echo "Running migrations..."\n\
npm run db:migrate:deploy && npm run db:create-saml-database:deploy\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Run the entrypoint script
CMD ["/app/entrypoint.sh"]
