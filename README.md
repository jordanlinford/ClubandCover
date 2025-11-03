# pnpm Monorepo

A modern full-stack monorepo built with pnpm workspaces, featuring:

- **apps/web**: React 18 + Vite + TypeScript + Tailwind CSS + React Router
- **apps/api**: Fastify + TypeScript + Prisma + Zod + Stripe + Supabase JWT Auth
- **packages/types**: Shared Zod schemas and TypeScript types for API contracts
- **packages/ui**: Shared Tailwind component library (Button, Input, Card, PageHeader, DataTable)
- **packages/config**: Shared ESLint, Prettier, and TypeScript configurations

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL database

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` in the root directory and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`: Supabase project credentials
- `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY`: Stripe API keys

### 3. Set up the database

Generate Prisma client and push schema to database:

```bash
cd apps/api
pnpm db:generate
pnpm db:push
```

### 4. Run development servers

From the root directory, run both web and API servers concurrently:

```bash
pnpm dev
```

This will start:
- Web app on `http://localhost:5173`
- API server on `http://localhost:3001`

## Project Structure

```
├── apps/
│   ├── web/              # React frontend application
│   │   ├── src/
│   │   │   ├── pages/    # React Router pages
│   │   │   ├── lib/      # API client, Supabase client
│   │   │   └── index.css # Tailwind base styles
│   │   └── package.json
│   └── api/              # Fastify backend API
│       ├── src/
│       │   ├── routes/   # API route handlers
│       │   ├── lib/      # Prisma, Stripe, Supabase setup
│       │   └── middleware/ # Auth middleware
│       ├── prisma/       # Prisma schema
│       └── package.json
├── packages/
│   ├── types/            # Shared TypeScript types and Zod schemas
│   ├── ui/               # Shared React components
│   └── config/           # Shared ESLint, Prettier, TypeScript config
├── pnpm-workspace.yaml
└── package.json
```

## Available Scripts

### Root

- `pnpm dev` - Run both web and API in development mode
- `pnpm build` - Build both applications for production
- `pnpm clean` - Clean all node_modules and build artifacts
- `pnpm type-check` - Run TypeScript type checking across all packages

### apps/web

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

### apps/api

- `pnpm dev` - Start Fastify server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Run production server
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Create and run migrations

## Tech Stack

### Frontend (apps/web)
- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router v7
- Supabase JS Client

### Backend (apps/api)
- Fastify
- TypeScript
- Prisma ORM
- Zod validation
- Stripe SDK
- Supabase JWT authentication

### Shared Packages
- @repo/types: Zod schemas + TypeScript types
- @repo/ui: Tailwind component library
- @repo/config: ESLint, Prettier, TypeScript configs

## Configuration

### TypeScript

All packages extend base configurations from `packages/config/typescript`:
- `base.json` - Base TypeScript config
- `react.json` - React-specific config extending base

### ESLint & Prettier

Shared configurations available in `packages/config`:
- `eslint/base.js` - ESLint rules
- `prettier/index.js` - Prettier formatting rules

## Database

The API uses Prisma ORM with PostgreSQL. Schema is located at `apps/api/prisma/schema.prisma`.

To modify the database schema:

1. Update `apps/api/prisma/schema.prisma`
2. Run `pnpm db:push` to apply changes
3. For production, use `pnpm db:migrate` to create migrations

## Deployment

### Building for Production

```bash
pnpm build
```

This builds:
- Web app to `apps/web/dist`
- API server to `apps/api/dist`

### Environment Variables

Ensure all environment variables from `.env.example` are set in your production environment.

## Development

### Adding a New Package

1. Create directory in `packages/`
2. Add `package.json` with `name: "@repo/package-name"`
3. Add to `pnpm-workspace.yaml` if needed
4. Run `pnpm install` from root

### Using Shared Packages

In your app's `package.json`:

```json
{
  "dependencies": {
    "@repo/types": "workspace:*",
    "@repo/ui": "workspace:*"
  }
}
```

Then import:

```typescript
import { Button } from '@repo/ui';
import type { User } from '@repo/types';
```

## License

MIT
