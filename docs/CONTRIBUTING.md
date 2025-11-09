# Contributing to Club & Cover

Thank you for your interest in contributing to Club & Cover! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- pnpm 9.x or higher
- PostgreSQL (via Supabase or local)

### Initial Setup

1. **Fork the repository** (if external contributor)
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/club-and-cover.git
   cd club-and-cover
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/club-and-cover.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Set up environment variables**
   ```bash
   # Copy example env file (if it exists)
   cp .env.example .env
   
   # Add your credentials
   # DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, etc.
   ```

6. **Run database migrations**
   ```bash
   cd apps/api
   pnpm prisma:migrate
   ```

7. **Start development servers**
   ```bash
   # From root directory
   pnpm dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates
- `chore/description` - Maintenance tasks

**Examples:**
- `feature/user-profile-page`
- `fix/login-validation-error`
- `docs/update-api-endpoints`

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Run quality checks**
   ```bash
   # Type checking
   pnpm --filter @repo/api type-check
   pnpm --filter @repo/web type-check
   
   # Build packages
   pnpm --filter @repo/types build
   pnpm --filter @repo/ui build
   pnpm --filter @repo/api build
   pnpm --filter @repo/web build
   
   # Run tests (when configured)
   pnpm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add user profile page"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to GitHub and create a PR from your branch
   - Fill out the PR template completely
   - Link any related issues

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] Type checking passes
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

### PR Review Checklist

Your PR will be reviewed for:
- Code quality and style
- Test coverage
- Documentation completeness
- Performance implications
- Security considerations
- Breaking changes

### After Submission

1. **Wait for CI checks** - All GitHub Actions workflows must pass
2. **Address review comments** - Make requested changes promptly
3. **Keep PR updated** - Rebase on main if needed
4. **Squash commits** - PRs will be squash-merged to keep history clean

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Use type aliases for unions/intersections

**Example:**
```typescript
// Good
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// Avoid
const user: any = { ... };
```

### React Components

- Use functional components with hooks
- Define prop types with interfaces
- Use meaningful component names
- Keep components focused and small
- Use composition over complex props

**Example:**
```typescript
interface UserCardProps {
  user: User;
  onEdit: (userId: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div>
      <h3>{user.email}</h3>
      <Button onClick={() => onEdit(user.id)}>Edit</Button>
    </div>
  );
}
```

### API Routes

- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Validate input with Zod schemas
- Return consistent response formats
- Handle errors gracefully
- Use appropriate status codes

**Example:**
```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

app.post('/api/users', async (req, reply) => {
  const data = createUserSchema.parse(req.body);
  const user = await createUser(data);
  return reply.code(201).send({ success: true, data: user });
});
```

### File Organization

```
apps/api/src/
├── routes/          # API route handlers
├── lib/             # Utility functions
├── middleware/      # Fastify middleware
└── index.ts         # Server entry point

apps/web/src/
├── components/      # React components
├── pages/           # Page components
├── contexts/        # React contexts
├── lib/             # Utilities
└── App.tsx          # App entry point
```

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `user-service.ts`)
- **Components:** `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Functions:** `camelCase` (e.g., `getUserById`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Interfaces/Types:** `PascalCase` (e.g., `UserRole`)

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Test additions/updates
- `chore` - Maintenance tasks
- `perf` - Performance improvements

### Scopes

- `api` - Backend API changes
- `web` - Frontend changes
- `types` - Type definitions
- `ui` - UI components
- `config` - Configuration
- `deps` - Dependencies

### Examples

```bash
feat(api): add user profile endpoint

Implements GET /api/users/:id endpoint with full profile data including badges and points.

Closes #123
```

```bash
fix(web): resolve login form validation error

The email validation was incorrectly rejecting valid emails with + symbols.
Updated regex pattern to allow all RFC-compliant email addresses.

Fixes #456
```

```bash
docs(readme): update installation instructions

Added missing step for database migration and clarified pnpm version requirement.
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @repo/api test
pnpm --filter @repo/web test

# Watch mode
pnpm --filter @repo/api test:watch
```

### Writing Tests

**Unit Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculatePoints } from './points';

describe('calculatePoints', () => {
  it('should award 10 points for voting', () => {
    const points = calculatePoints('VOTE');
    expect(points).toBe(10);
  });
});
```

**Integration Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { app } from './app';

describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    
    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);
  });
});
```

## Monorepo Structure

### Workspace Packages

- `apps/api` - Fastify backend
- `apps/web` - React frontend
- `packages/types` - Shared TypeScript types
- `packages/ui` - Shared UI components
- `packages/config` - Shared configuration

### Building Packages

```bash
# Build in dependency order
pnpm --filter @repo/types build
pnpm --filter @repo/ui build
pnpm --filter @repo/config build
pnpm --filter @repo/api build
pnpm --filter @repo/web build
```

### Adding Dependencies

```bash
# Add to specific package
pnpm --filter @repo/api add fastify-plugin

# Add to root (devDependencies)
pnpm add -D -w vitest

# Add workspace dependency
pnpm --filter @repo/web add @repo/ui
```

## Environment Variables

### Required Variables

**API (.env in apps/api):**
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SESSION_SECRET=...
STRIPE_SECRET_KEY=...
```

**Web (.env.local in apps/web):**
```bash
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLIC_KEY=...
```

## Documentation

### Updating Documentation

- Keep README.md up to date
- Document new features in docs/
- Update API documentation for new endpoints
- Add JSDoc comments for complex functions
- Update type definitions

### Documentation Structure

```
docs/
├── CI-CD-SETUP.md       # CI/CD pipeline documentation
├── CONTRIBUTING.md      # This file
├── API.md               # API endpoint documentation
└── ARCHITECTURE.md      # System architecture
```

## Getting Help

- **Documentation:** Check docs/ directory
- **Issues:** Browse existing GitHub issues
- **Discussions:** Use GitHub Discussions for questions
- **PR Reviews:** Ask reviewers for clarification

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub contributor graph

Thank you for contributing to Club & Cover! 🎉
