FROM node:22-alpine3.20 AS build

# Install dependencies
RUN apk update && apk add --no-cache g++ make gcc python3 openssl-dev

# Set build-only environment variables
# This is never used to connect to a real DB, just for Prisma code generation
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake?schema=public"
# Remove problematic schema engine binary settings

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

# Copy the health check and entrypoint scripts into the container
COPY apps/migrations/health-check.sh /app/health-check.sh
COPY apps/migrations/entrypoint.sh /app/entrypoint.sh

# Make the scripts executable
RUN chmod +x /app/health-check.sh /app/entrypoint.sh

# Run the entrypoint script when container starts
CMD ["/app/entrypoint.sh"]
