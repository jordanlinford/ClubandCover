# GitHub Actions CI/CD

This directory contains all GitHub Actions workflows and reusable actions for the Club & Cover monorepo.

## Workflows

### 🔄 Continuous Integration

**File:** `workflows/ci.yml`  
**Triggers:** Push to main/develop, Pull Requests  
**Purpose:** Validate type safety, builds, and security

**Jobs:**
- ✅ Type Check
- 📦 Build all packages
- 🧪 Run tests
- 🔒 Security audit

**Status:** ![CI](https://github.com/YOUR_ORG/YOUR_REPO/workflows/CI/badge.svg)

---

### 🚀 Deployment

**File:** `workflows/deploy.yml`  
**Triggers:** Push to main, Manual dispatch  
**Purpose:** Deploy to production (Replit)

**Jobs:**
- 📦 Build production artifacts
- 🚀 Deploy to Replit
- ✅ Health check
- 📢 Deployment notification

**Status:** ![Deploy](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Deploy%20to%20Replit/badge.svg)

---

### 🔍 PR Checks

**File:** `workflows/pr-check.yml`  
**Triggers:** Pull Request events  
**Purpose:** Validate PRs with selective builds

**Features:**
- Detects affected packages
- Only builds changed code
- Warns on large PRs (>1000 lines)
- Posts build summary comment

---

### 🔐 Security Scans

**File:** `workflows/codeql.yml`  
**Triggers:** Push, PR, Weekly schedule  
**Purpose:** Static code security analysis

**Languages:** JavaScript, TypeScript  
**Queries:** Security and quality checks

---

### 📦 Dependency Review

**File:** `workflows/dependency-review.yml`  
**Triggers:** Pull Requests  
**Purpose:** Scan new dependencies for vulnerabilities

**Protections:**
- Blocks moderate+ severity vulnerabilities
- Denies GPL-3.0 and AGPL-3.0 licenses

---

## Reusable Actions

### pnpm-install

**File:** `actions/pnpm-install/action.yml`  
**Purpose:** Optimized pnpm installation with caching

**Features:**
- Intelligent cache with monthly rotation
- Frozen lockfile enforcement
- Prefer offline mode
- ~40s install time (warm cache)

**Usage:**
```yaml
- uses: ./.github/actions/pnpm-install
```

---

## Configuration Files

### `.github/dependabot.yml`
Automated dependency updates:
- Weekly npm dependency updates (Mondays 6 AM)
- Weekly GitHub Actions updates
- Auto-labeled PRs

### `.github/PULL_REQUEST_TEMPLATE.md`
Standardized PR template for consistency

---

## Cache Strategy

### pnpm Store Cache
- **Location:** pnpm global store
- **Key Format:** `{OS}-pnpm-store-{YYYYMM}-{lockfile-hash}`
- **Rotation:** Monthly (forces periodic clean installs)
- **Hit Rate:** ~95% on typical development

### Build Artifacts Cache
- **Retention:** 7 days
- **Size:** ~50-100 MB
- **Purpose:** Deployment verification

---

## Performance Metrics

| Metric | Cold Cache | Warm Cache |
|--------|-----------|-----------|
| Install | ~90s | ~40s |
| Type Check | ~15s | ~15s |
| Build | ~45s | ~30s |
| **Total CI** | ~2m30s | ~1m30s |

---

## Secrets Required

Add these in **Settings → Secrets and variables → Actions**:

### Production Deployment
- `REPLIT_DEPLOY_KEY` - Replit deployment key

### Application Secrets (for CI tests)
- `DATABASE_URL` - PostgreSQL connection
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `STRIPE_SECRET_KEY` - Stripe API key (test mode)
- `SESSION_SECRET` - Session encryption key

---

## Workflow Status

Check real-time status: [Actions Tab](../../actions)

### Recent Runs
View the latest workflow runs in the GitHub Actions tab to monitor:
- Build success rates
- Average run times
- Cache hit rates
- Failed jobs and logs

---

## Troubleshooting

### Workflow Fails on First Run
- **Cause:** Missing secrets or environment configuration
- **Solution:** Add required secrets in repository settings

### Cache Misses
- **Cause:** Monthly rotation or lockfile changes
- **Solution:** Normal behavior, wait for cache to rebuild

### Build Timeout
- **Cause:** Large dependency changes or cache miss
- **Solution:** Increase timeout in workflow file

### Type Check Errors
- **Cause:** Missing type builds or Prisma client
- **Solution:** Ensure types package builds before type checking

---

## Best Practices

### For Contributors
1. ✅ Run `pnpm install` before pushing
2. ✅ Run type checks locally first
3. ✅ Test builds before submitting PR
4. ✅ Keep PRs focused and < 500 lines

### For Maintainers
1. ✅ Review Dependabot PRs weekly
2. ✅ Monitor workflow run times
3. ✅ Update cache strategy if needed
4. ✅ Review security scan results

---

## Documentation

- **Setup Guide:** [`docs/CI-CD-SETUP.md`](../../docs/CI-CD-SETUP.md)
- **Contributing:** [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md)
- **Quick Start:** [`docs/QUICK-START.md`](../../docs/QUICK-START.md)

---

## Support

For CI/CD issues:
1. Check workflow logs in Actions tab
2. Review [CI-CD-SETUP.md](../../docs/CI-CD-SETUP.md)
3. Open an issue with `ci` label
