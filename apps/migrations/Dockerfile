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

# Set up logger package
RUN mkdir -p /app/packages/logger/dist

# Create minimal logger implementation
RUN echo 'export * from "./logger.js";' > /app/packages/logger/dist/index.js && \
    echo 'const createLogFn = (level) => (msg, context) => { \
  const timestamp = new Date().toISOString(); \
  const contextStr = context ? ` ${JSON.stringify(context)}` : ""; \
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${msg}${contextStr}`); \
}; \
export const logger = { \
  debug: createLogFn("debug"), \
  info: createLogFn("info"), \
  warn: createLogFn("warn"), \
  error: createLogFn("error"), \
  fatal: createLogFn("fatal"), \
  withContext: () => logger \
};' > /app/packages/logger/dist/logger.js

# Create a simplified package.json for the logger
RUN echo '{ \
  "name": "@formbricks/logger", \
  "private": true, \
  "type": "module", \
  "version": "0.1.0", \
  "description": "Logger for Formbricks", \
  "main": "./dist/index.js", \
  "exports": { \
    "import": "./dist/index.js" \
  } \
}' > /app/packages/logger/package.json

# Create a node_modules symlink for the logger package
RUN cd /app/packages/database/node_modules && \
    mkdir -p @formbricks && \
    ln -s /app/packages/logger /app/packages/database/node_modules/@formbricks/logger

# Copy and configure scripts
COPY apps/migrations/health-check.sh /app/health-check.sh
COPY apps/migrations/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/health-check.sh /app/entrypoint.sh

# Set entrypoint
CMD ["/app/entrypoint.sh"]
