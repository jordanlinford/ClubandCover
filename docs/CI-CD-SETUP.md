# CI/CD Pipeline Documentation

## Overview

This monorepo uses **pnpm workspaces** with **GitHub Actions** for continuous integration and deployment. The pipeline is optimized for speed with intelligent caching and parallel job execution.

## Architecture

### Monorepo Structure

```
club-and-cover/
├── apps/
│   ├── api/          # Fastify backend API
│   └── web/          # React frontend (Vite)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configuration
├── .github/
│   ├── workflows/    # CI/CD workflows
│   └── actions/      # Reusable composite actions
└── pnpm-workspace.yaml
```

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main` or `master`

**Jobs:**
1. **Type Check** - Validates TypeScript types across all packages
   - Uses reusable pnpm-install composite action
   - Type checks API and Web packages
   - Note: Linting not currently configured (no lint scripts in package.json files)
   
2. **Build** - Compiles all packages and apps, uploads artifacts
   - Uses reusable pnpm-install composite action
   - Builds in dependency order
   - Uploads dist/ artifacts (7-day retention)
   
3. **Test** - Runs test suites when test scripts exist
   - Checks for test scripts before running
   - Fails the build if tests fail (no continue-on-error)
   
4. **Security** - Runs `pnpm audit` for vulnerability checks
   - Production dependencies only (--prod flag)
   - Moderate severity threshold

**Performance:**
- Cold cache: ~2-3 minutes
- Warm cache: ~1 minute
- Uses reusable composite action with monthly cache rotation

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` or `master` branches
- Manual trigger via `workflow_dispatch`

**Process:**
1. Build all packages in dependency order using composite action
2. Trigger Replit deployment via API (or fallback to Git integration)
3. Wait 45 seconds for deployment to stabilize
4. Health check with retries (5 attempts, 10s intervals)
5. Notification of deployment status

**Deployment Methods:**
- **API Trigger** (preferred): Uses `REPLIT_DEPLOY_KEY` to trigger deployment via Replit API
- **Git Integration** (fallback): Replit auto-deploys when connected to repository

**Required Secrets:**
- `REPLIT_DEPLOY_KEY` - Replit API deployment key (optional)
- `REPLIT_PROJECT_URL` - Replit project URL (optional)
- `APP_URL` - Application URL for health checks (optional)

**Environment:** Production environment with approval gates

### 3. PR Check Workflow (`.github/workflows/pr-check.yml`)

**Triggers:** Pull request events (open, sync, reopen)

**Features:**
- Detects affected packages using git diff
- Only builds changed packages (selective compilation)
- Checks PR size and warns if > 1000 lines
- Posts summary comment on PR with build status

### 4. Dependency Review (`.github/workflows/dependency-review.yml`)

**Triggers:** Pull requests

**Features:**
- Scans new dependencies for security issues
- Blocks PRs with moderate+ severity vulnerabilities
- Denies GPL-3.0 and AGPL-3.0 licenses

### 5. CodeQL Security Scan (`.github/workflows/codeql.yml`)

**Triggers:**
- Push to main branches
- Pull requests
- Weekly schedule (Mondays at 6 AM UTC)

**Features:**
- Static analysis for JavaScript/TypeScript
- Security and quality queries
- Integrates with GitHub Security tab

## Setup Instructions

### 1. Enable GitHub Actions

GitHub Actions should be enabled by default. Verify in repository settings:
- Go to **Settings** → **Actions** → **General**
- Enable "Allow all actions and reusable workflows"

### 2. Configure Secrets

Add these secrets in **Settings** → **Secrets and variables** → **Actions**:

#### Required Secrets:
- `REPLIT_DEPLOY_KEY` - Replit deployment key (if using automated deployment)

#### Application Secrets (for CI builds):
These are already in your Replit environment but may be needed for CI tests:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `STRIPE_SECRET_KEY` - Stripe API key (test mode)
- `SESSION_SECRET` - Session encryption secret

### 3. Configure Environments

Create a **production** environment:
1. Go to **Settings** → **Environments**
2. Click **New environment**, name it `production`
3. Add protection rules (optional):
   - Required reviewers
   - Wait timer
   - Deployment branches (main/master only)

### 4. Enable Dependency Graph

For dependency review to work:
1. Go to **Settings** → **Code security and analysis**
2. Enable **Dependency graph**
3. Enable **Dependabot alerts**

## Package Build Order

The build system respects workspace dependencies:

```
1. @repo/types     (no dependencies)
2. @repo/ui        (depends on types)
3. @repo/config    (no dependencies)
4. @repo/api       (depends on types)
5. @repo/web       (depends on types, ui)
```

## Caching Strategy

### pnpm Store Cache
- **Key:** `${{ runner.os }}-pnpm-store-${{ YEAR_MONTH }}-${{ hashFiles('**/pnpm-lock.yaml') }}`
- **Restore Keys:** Monthly rotation (YYYYMM format)
- **Path:** pnpm global store (not node_modules)

**Why monthly rotation?**
- Prevents indefinite cache growth
- Forces periodic clean installs
- Balances speed vs. freshness

### Build Artifacts Cache
- Uploaded after successful builds
- 7-day retention
- Available for deployment jobs

## Local Development

### Install Dependencies
```bash
pnpm install
```

### Build All Packages
```bash
# Build in dependency order
pnpm --filter @repo/types build
pnpm --filter @repo/ui build
pnpm --filter @repo/config build
pnpm --filter @repo/api build
pnpm --filter @repo/web build
```

### Type Check All Packages
```bash
pnpm --filter @repo/api type-check
pnpm --filter @repo/web type-check
```

### Build Specific Package
```bash
pnpm --filter @repo/api build
```

### Run Tests (when configured)
```bash
pnpm test
```

## CI Performance Optimization

### Current Optimizations:
1. ✅ **pnpm** instead of npm (3-5x faster installs)
2. ✅ **Intelligent caching** (pnpm store + monthly rotation)
3. ✅ **Parallel jobs** (lint/build/test run concurrently)
4. ✅ **Selective builds** (PR checks only build affected packages)
5. ✅ **Frozen lockfile** (`--frozen-lockfile` prevents lockfile changes)
6. ✅ **Prefer offline** (`--prefer-offline` uses cache first)

### Future Optimizations (Optional):
- **Turborepo** - Add intelligent build caching and task orchestration
- **nx** - Alternative to Turborepo with more features
- **Matrix builds** - Test across multiple Node versions (16, 18, 20)
- **Docker layer caching** - If containerizing the application

## Troubleshooting

### Build Failures

**Issue:** Type check fails
```bash
# Solution: Ensure types package is built first
pnpm --filter @repo/types build
```

**Issue:** pnpm install fails with peer dependency conflicts
```bash
# Solution: Check .npmrc has strict-peer-dependencies=false
cat .npmrc | grep strict-peer-dependencies
```

### Cache Issues

**Issue:** Build uses stale dependencies
```bash
# Solution: Clear cache manually
# Delete the cache key from GitHub Actions cache settings
# Or wait for monthly rotation
```

### Deployment Issues

**Issue:** Replit deployment doesn't trigger
```bash
# Solution: Ensure Git integration is enabled in Replit
# Replit > Settings > Git > Link Repository
```

## Best Practices

### Commits
- ✅ Descriptive commit messages
- ✅ Atomic commits (one logical change per commit)
- ✅ Link commits to issues/PRs

### Pull Requests
- ✅ Keep PRs < 500 lines when possible
- ✅ Write clear PR descriptions
- ✅ Wait for all checks to pass before merging
- ✅ Use squash merge to keep main branch clean

### Dependencies
- ✅ Update dependencies regularly
- ✅ Run `pnpm audit` before merging
- ✅ Review dependency changes in PRs
- ✅ Test builds locally before pushing

### Security
- ✅ Never commit secrets to Git
- ✅ Use GitHub Secrets for sensitive data
- ✅ Enable CodeQL and Dependabot
- ✅ Review security alerts promptly

## Monitoring

### GitHub Actions Dashboard
- View all workflow runs: **Actions** tab
- Filter by workflow, branch, or status
- Download logs for debugging

### Build Status Badges
Add to README.md:
```markdown
![CI](https://github.com/YOUR_ORG/YOUR_REPO/workflows/CI/badge.svg)
![Deploy](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Deploy%20to%20Replit/badge.svg)
```

## Migration from Other CI Systems

### From Jenkins
- Replace Jenkinsfile with GitHub Actions YAML
- Migrate environment variables to GitHub Secrets
- Use Actions marketplace for plugin replacements

### From Travis CI
- Similar YAML syntax, minimal changes needed
- Replace `travis.yml` with `.github/workflows/ci.yml`
- Update cache configuration for pnpm

### From CircleCI
- Convert orbs to composite actions
- Migrate config.yml to GitHub Actions format
- Adjust caching keys and restore patterns

## Additional Resources

- [pnpm CI Documentation](https://pnpm.io/continuous-integration)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions tab
2. Review this documentation
3. Check pnpm/GitHub Actions documentation
4. Open an issue in the repository
