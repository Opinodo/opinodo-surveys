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

# Create minimal logger implementation
RUN mkdir -p ./node_modules/@formbricks/logger/dist
RUN echo 'export const logger = { fatal: console.error, error: console.error, warn: console.warn, info: console.info, debug: console.debug };' > ./node_modules/@formbricks/logger/dist/index.js
RUN echo 'export { logger };' > ./node_modules/@formbricks/logger/dist/index.cjs
RUN echo 'export declare const logger: { fatal: (message: any, ...args: any[]) => void; error: (message: any, ...args: any[]) => void; warn: (message: any, ...args: any[]) => void; info: (message: any, ...args: any[]) => void; debug: (message: any, ...args: any[]) => void; };' > ./node_modules/@formbricks/logger/dist/index.d.ts
# Create package.json for logger
RUN echo '{"name":"@formbricks/logger","version":"0.1.0","main":"./dist/index.js","types":"./dist/index.d.ts","exports":{"types":"./dist/index.d.ts","import":"./dist/index.js","require":"./dist/index.cjs"}}' > ./node_modules/@formbricks/logger/package.json

# Copy and configure scripts
COPY apps/migrations/health-check.sh /app/health-check.sh
COPY apps/migrations/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/health-check.sh /app/entrypoint.sh

# Set entrypoint
CMD ["/app/entrypoint.sh"]
