# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Formbricks is an open-source survey and experience management platform. This is a Turborepo + pnpm workspaces monorepo.

## Common Commands

```bash
# Development
pnpm go                  # Start DB (docker-compose) + dev servers (recommended)
pnpm dev                 # Run all dev servers in parallel (DB must be running)
pnpm db:up               # Start local PostgreSQL/Redis via docker-compose
pnpm db:down             # Stop local DB stack

# Building
pnpm build               # Build all packages/apps
pnpm build:dev           # Dev-optimized builds

# Testing
pnpm test                # Run all tests
pnpm test:coverage       # Run tests with coverage
pnpm test:e2e            # Run Playwright e2e tests

# Run specific test from apps/web
cd apps/web && pnpm test -- modules/path/to/file.test.ts
cd apps/web && pnpm test -- --watch modules/path/to/file.test.ts

# Linting & Formatting
pnpm lint                # Lint all
pnpm format              # Prettier write across repo

# Database
pnpm db:migrate:dev      # Apply dev migrations
pnpm db:migrate:deploy   # Apply prod migrations
pnpm db:push             # Prisma db push
pnpm fb-migrate-dev      # Create migration + prisma generate
pnpm generate            # Run generators (Prisma, API specs)

# Prisma only (faster)
cd packages/database && pnpm prisma generate

# Other
pnpm storybook           # Run Storybook
pnpm clean               # Clean turbo cache, node_modules, coverage
```

## Architecture

### Monorepo Structure
- `apps/web/` - Main Next.js application (API, UI, SSO, i18n, emails, integrations)
- `apps/storybook/` - Storybook for UI components
- `packages/database/` - Prisma schema, migrations, data layer
- `packages/types/` - Shared TypeScript/Zod types
- `packages/js-core/` - Core runtime for web embed
- `packages/surveys/` - Embeddable survey rendering
- `packages/logger/` - Shared logging (pino)
- `packages/i18n-utils/` - i18n helpers

### Web App Structure (`apps/web/`)
```
apps/web/
├── app/                    # Next.js 13+ app directory
│   ├── (app)/             # Main application routes
│   ├── (auth)/            # Authentication routes
│   └── api/               # API routes
├── modules/               # Feature-specific modules
│   └── ee/                # Enterprise modules (SAML/SSO)
└── lib/                   # Utility functions and services
```

### Key Routing Pattern
```
(app)/environments/[environmentId]/surveys/[surveyId]/
├── (analysis)/        # Analysis views (responses, summary)
├── edit/              # Survey editing
└── settings/          # Survey settings
```

### Data Hierarchy
```
Organization → Project → Environment (production/development)
                              ├── Survey
                              ├── Contact
                              └── Integration
```

### Response API Structure
```
/api/
├── v1/
│   ├── client/[environmentId]/responses/     # Public - survey respondents
│   │   ├── route.ts (POST create)
│   │   └── [responseId]/route.ts (PUT update) ← High traffic endpoint
│   └── management/responses/                 # Admin API
│       └── [responseId]/route.ts (PUT update)
└── v2/
    ├── client/[environmentId]/responses/     # V2 public API
    └── management/responses/                 # V2 admin API
```

Each endpoint has a corresponding `lib/response.ts` with business logic.

## Tech Stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Database**: PostgreSQL + Prisma ORM, Redis for caching
- **UI**: TailwindCSS, Radix UI components
- **Auth**: Auth.js (next-auth) with SSO/SAML/OIDC support
- **Testing**: Vitest for unit tests, Playwright for e2e
- **Build**: Turborepo, pnpm workspaces

## Testing Conventions

- Test files go in the **same directory** as source files
- Use `.test.tsx` for React component tests (jsdom environment)
- Use `.test.ts` for utility/service tests (Node environment)
- Use `test()` function instead of `it()`
- Use `vi.mocked()` for mocking inside test blocks
- For `packages/surveys/`, use `@testing-library/preact` instead of `@testing-library/react`
- Import types from `packages/types/` - don't create new types that aren't in the codebase

### Component Test Template
```typescript
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/path/to/dependency", () => ({
  dependency: vi.fn(),
}));

describe("ComponentName", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("descriptive test name", async () => {
    // Test implementation
  });
});
```

## Environment Setup

- Copy `.env.example` to `.env` and configure required variables
- Prisma schema: `packages/database/schema.prisma`
- Local development requires Docker for PostgreSQL/Redis

## Import Aliases

- `@/` maps to `apps/web/` in the web app
- Use `@formbricks/*` for workspace packages

## Performance Considerations

- **Avoid `prisma.$transaction()` on high-traffic endpoints** - can cause cascade failures under load
- Default transaction timeout is 5 seconds; connection pool is limited (~10-20 connections)
- Under high concurrency, transactions queue up waiting for connections, hit timeout, and cascade into complete failure
- Prefer direct database operations over transactions when possible

## Troubleshooting

### TypeScript errors about missing Prisma properties
If you see errors like `'field' does not exist in type 'ResponseSelect'`, regenerate Prisma client:
```bash
cd packages/database && pnpm prisma generate
```

### Module resolution errors (`Cannot find module '@formbricks/*'`)
Run a full build to compile all packages:
```bash
pnpm build
```
