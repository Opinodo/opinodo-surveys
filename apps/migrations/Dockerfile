FROM node:22-alpine3.20 AS base

# Enable corepack and prepare pnpm
RUN npm install -g corepack@latest
RUN corepack enable

# Install necessary build tools and compilers
RUN apk update && apk add --no-cache g++ cmake make gcc python3 openssl-dev jq

# Set hardcoded environment variables for build only
ENV DATABASE_URL="postgresql://placeholder:for@build:5432/gets_overwritten_at_runtime?schema=public"
ENV NEXTAUTH_SECRET="placeholder_for_next_auth_of_64_chars_get_overwritten_at_runtime"
ENV ENCRYPTION_KEY="placeholder_for_build_key_of_64_chars_get_overwritten_at_runtime"
ENV CRON_SECRET="placeholder_for_cron_secret_of_64_chars_get_overwritten_at_runtime"

# Set the working directory
WORKDIR /app

# Copy the code
COPY . .

# Create a .env file
RUN touch apps/web/.env

# Install the dependencies
RUN pnpm install

# Build the project - we only need to build the database package
RUN pnpm build --filter=@formbricks/database...

# Create the runtime user
RUN adduser --system --uid 1001 nextjs

WORKDIR /home/nextjs

# Copy only the necessary files for database migrations
COPY --from=base --chown=nextjs:nextjs /app/packages/database/schema.prisma ./packages/database/schema.prisma
COPY --from=base --chown=nextjs:nextjs /app/packages/database/package.json ./packages/database/package.json
COPY --from=base --chown=nextjs:nextjs /app/packages/database/migration ./packages/database/migration
COPY --from=base --chown=nextjs:nextjs /app/packages/database/src ./packages/database/src

# Copy Prisma-specific generated files
COPY --from=base --chown=nextjs:nextjs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=base --chown=nextjs:nextjs /app/node_modules/.prisma ./node_modules/.prisma

# Install necessary tools
RUN npm install -g tsx typescript prisma

# Set the user
USER nextjs

# Run migrations as the entrypoint
CMD cd packages/database && npm run db:migrate:deploy && npm run db:create-saml-database:deploy
