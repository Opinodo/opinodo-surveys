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

# Run migrations command
CMD npm run db:migrate:deploy && npm run db:create-saml-database:deploy
