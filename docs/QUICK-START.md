# Quick Start Guide

Get Club & Cover running locally in under 5 minutes.

## Prerequisites

- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **pnpm** 9.x or higher
  ```bash
  npm install -g pnpm@9
  ```
- **PostgreSQL** database (via Supabase recommended)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/club-and-cover.git
cd club-and-cover
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all packages in the monorepo.

### 3. Set Up Environment Variables

Create `.env` files in the appropriate locations:

**Root `.env` (for running the combined app):**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clubandcover

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
SESSION_SECRET=your-random-secret-key-here

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Email (optional)
RESEND_API_KEY=re_...

# OpenAI (optional)
OPENAI_API_KEY=sk-...
```

**Get your credentials:**
- **Supabase:** [Create a project](https://supabase.com/dashboard)
- **Stripe:** [Get test keys](https://dashboard.stripe.com/test/apikeys)
- **Resend:** [Sign up](https://resend.com/)
- **OpenAI:** [Get API key](https://platform.openai.com/api-keys)

### 4. Set Up Database

```bash
cd apps/api
pnpm prisma:migrate
pnpm seed  # Optional: seed with sample data
cd ../..
```

### 5. Build Packages

```bash
# Build shared packages (required before running apps)
pnpm --filter @repo/types build
pnpm --filter @repo/ui build
pnpm --filter @repo/config build
```

### 6. Start Development Server

```bash
pnpm dev
```

This starts both the API server and web app on `http://localhost:5000`.

**Alternative: Start separately**
```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

## Verify Installation

1. **Open the app:** http://localhost:5000
2. **Create an account** on the landing page
3. **Verify email** (check console logs if using test email)
4. **Explore features:**
   - Browse clubs
   - Create a pitch (upgrade to AUTHOR role)
   - Join a club
   - Vote on polls

## Project Structure

```
club-and-cover/
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── lib/         # Utilities
│   │   │   └── index.ts     # Entry point
│   │   └── prisma/          # Database schema
│   │
│   └── web/                 # React frontend
│       └── src/
│           ├── components/  # UI components
│           ├── pages/       # Route pages
│           └── App.tsx      # Entry point
│
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── ui/                 # Shared UI components
│   └── config/             # Shared configuration
│
└── docs/                   # Documentation
```

## Common Commands

### Development

```bash
# Start all services
pnpm dev

# Start specific app
pnpm --filter @repo/api dev
pnpm --filter @repo/web dev
```

### Building

```bash
# Build all packages
pnpm --filter @repo/types build
pnpm --filter @repo/ui build
pnpm --filter @repo/api build
pnpm --filter @repo/web build

# Build specific package
pnpm --filter @repo/api build
```

### Type Checking

```bash
# Check all packages
pnpm --filter @repo/api type-check
pnpm --filter @repo/web type-check
```

### Database

```bash
cd apps/api

# Create migration
pnpm prisma:migrate

# Reset database
pnpm prisma migrate reset

# Seed database
pnpm seed

# Open Prisma Studio
pnpm prisma studio
```

### Testing (when configured)

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @repo/api test
```

## Troubleshooting

### Port 5000 Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in apps/api/src/index.ts
const PORT = process.env.PORT || 5001;
```

### Database Connection Error

```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
cd apps/api
pnpm prisma db pull
```

### Build Errors

```bash
# Clean node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Clean build cache
rm -rf apps/*/dist packages/*/dist

# Rebuild in order
pnpm --filter @repo/types build
pnpm --filter @repo/ui build
pnpm --filter @repo/api build
pnpm --filter @repo/web build
```

### Type Errors

```bash
# Regenerate Prisma client
cd apps/api
pnpm prisma generate

# Rebuild types package
cd ../..
pnpm --filter @repo/types build
```

## Next Steps

- **Read the docs:** Check `docs/` directory for detailed documentation
- **Contribute:** See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Deploy:** See [CI-CD-SETUP.md](CI-CD-SETUP.md)
- **API Reference:** See [API.md](API.md)

## Getting Help

- **Documentation:** Browse the `docs/` directory
- **Issues:** Check existing [GitHub Issues](https://github.com/YOUR_ORG/club-and-cover/issues)
- **Discussions:** Ask questions in [GitHub Discussions](https://github.com/YOUR_ORG/club-and-cover/discussions)

## Development Tips

### Hot Reload

Both the API and web app support hot reload:
- **API:** Uses `tsx` for instant TypeScript reloads
- **Web:** Uses Vite's HMR for instant React updates

### Database Changes

After modifying `apps/api/prisma/schema.prisma`:

```bash
cd apps/api
pnpm prisma:migrate  # Create and apply migration
pnpm prisma generate  # Regenerate Prisma client
```

### Adding Dependencies

```bash
# Add to specific package
pnpm --filter @repo/api add package-name

# Add dev dependency
pnpm --filter @repo/web add -D package-name

# Add to root workspace
pnpm add -D -w package-name
```

### Environment Variables

- **API:** Uses `.env` in root directory
- **Web:** Uses `.env.local` (Vite requires `VITE_` prefix)
- **Never commit `.env` files** (they're in `.gitignore`)

### Code Quality

```bash
# Format code (if configured)
pnpm format

# Lint code (if configured)
pnpm lint

# Type check
pnpm --filter @repo/api type-check
pnpm --filter @repo/web type-check
```

## Production Build

```bash
# Build for production
pnpm --filter @repo/types build
pnpm --filter @repo/ui build
pnpm --filter @repo/api build
pnpm --filter @repo/web build

# Start production server
cd apps/api
pnpm start
```

Happy coding! 🚀
