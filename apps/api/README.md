# Club & Cover - API

Backend API for Club & Cover platform built with Fastify, Prisma, and PostgreSQL.

## Test Suites

### Running Tests

Tests are located in `src/__tests__/` and use Jest for test execution.

To run tests:
```bash
# Run all tests
npm test

# Run specific test file
npm test -- free-tier-reader.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Suites Overview

#### 1. **free-tier-reader.test.ts**
**Purpose:** Guarantees that FREE tier users can access all reader features without hitting paywalls.

**Critical guarantee:** If any of these tests fail, readers are being incorrectly paywalled.

**Tests:**
- ✅ Join public clubs
- ✅ Request to join private clubs
- ✅ Vote in club polls
- ✅ Post messages in clubs
- ✅ View pitches and author profiles
- ✅ Earn points through participation
- ✅ Redeem rewards with sufficient points
- ✅ Create clubs (no tier requirement)

**Why it matters:** Ensures the core business model (readers always free) is enforced at the code level.

---

#### 2. **author-tier-limits.test.ts**
**Purpose:** Validates that author tier limits are correctly enforced.

**Tests:**
- **FREE Tier:**
  - Allows 3 active pitches, blocks 4th with upgrade prompt
  - Allows 3 pending swaps, blocks 4th with upgrade prompt
  - Enforces 10 AI calls/day limit
  
- **PRO_AUTHOR Tier:**
  - Allows 10 active pitches, blocks 11th
  - Allows 10 pending swaps
  - Enforces 50 AI calls/day limit
  
- **PUBLISHER Tier:**
  - Allows unlimited pitches (tests 15+)
  - Enforces 999 limit (essentially unlimited)

**Why it matters:** Prevents tier limit bypasses and validates upgrade prompts appear correctly.

---

#### 3. **suspension.test.ts**
**Purpose:** Validates universal suspension enforcement across all mutating operations.

**Tests:**
- Blocks SUSPENDED users from posting messages, creating pitches, clubs, swaps, and redeeming rewards
- Allows ACTIVE users to perform all actions normally
- Validates DISABLED users can self-reactivate

---

### CI/CD Integration

**Recommended setup:**
```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - name: Fail if reader actions are paywalled
        run: npm test -- free-tier-reader.test.ts
```

This ensures any PR that accidentally paywalls readers will fail CI.

---

## Pricing Model

See `docs/pricing-access.md` for complete tier matrix and access control rules.

**Core Principle:** Readers are always free. Only authors need paid tiers for increased limits.

**Tier Limits:**
- FREE: 3 pitches, 3 swaps, 10 AI/day
- PRO_AUTHOR: 10 pitches, 10 swaps, 50 AI/day
- PUBLISHER: 999 pitches, 999 swaps, 999 AI/day

---

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start dev server
npm run dev

# Run tests
npm test
```
