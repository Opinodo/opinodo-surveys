FROM node:22-alpine3.20 AS build

# Install build dependencies
RUN apk update && apk add --no-cache \
    g++ \
    make \
    gcc \
    python3 \
    openssl-dev
RUN npm install -g pnpm

# Set build-only environment variables for Prisma code generation
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake?schema=public"

# Set up working directory
WORKDIR /app/packages/database

# Copy necessary files for building
COPY apps/migrations/migration-package.json ./package.json
COPY packages/database/schema.prisma ./

# We're using a simplified approach by creating a minimal logger implementation directly in the runtime stage

# Install dependencies
RUN npm install && \
    npm install prisma-json-types-generator && \
    # Install dependencies required by migrations
    npm install @paralleldrive/cuid2 zod lodash date-fns nanoid

# Generate Prisma client code
RUN npx prisma generate

# Create Prisma migrations directory structure
RUN mkdir -p prisma/migrations

# Start fresh for the runtime image (multi-stage build)
FROM node:22-alpine3.20

# Install runtime dependencies
RUN apk update && apk add --no-cache python3 openssl
RUN npm install -g pnpm

# Set up working directory
WORKDIR /app/packages/database

# Copy build artifacts and migration files
COPY --from=build /app/packages/database/node_modules ./node_modules
COPY --from=build /app/packages/database/package.json ./
COPY --from=build /app/packages/database/schema.prisma ./

# Set up migration directories and copy files
RUN mkdir -p prisma/migrations
COPY packages/database/migration/ ./migration/
COPY packages/database/src ./src/

# Install global tools needed for running the migrations
RUN npm install -g tsx typescript pino pino-pretty

# Copy the required packages
COPY packages/config-typescript /app/packages/config-typescript
COPY packages/logger /app/packages/logger

# Create the workspace link for the typescript config
WORKDIR /app/packages/logger/node_modules/@formbricks
RUN mkdir -p . && ln -s /app/packages/config-typescript config-typescript

# Build the logger package
WORKDIR /app/packages/logger
RUN npm install && npm run build

# Create a symlink to the logger package
WORKDIR /app/packages/database
RUN mkdir -p node_modules/@formbricks && \
    ln -s /app/packages/logger node_modules/@formbricks/logger

# Copy and configure scripts
COPY apps/migrations/health-check.sh /app/health-check.sh
COPY apps/migrations/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/health-check.sh /app/entrypoint.sh

# Set entrypoint
CMD ["/app/entrypoint.sh"]
