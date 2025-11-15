# Jest Test Infrastructure - Setup Complete

## ✅ What's Been Built

### 1. Jest Configuration
- **File:** `jest.config.js`
- **Features:**
  - TypeScript support via ts-jest with ESM
  - 30-second test timeout
  - Setup file for database connection
  - Proper module resolution for .ts files

### 2. Server Refactoring
- **File:** `src/app.ts` - New build function
- **File:** `src/index.ts` - Updated to use build()
- **Features:**
  - Extracted Fastify setup into reusable `build(options)` function
  - Test mode bypasses production auth and uses test auth
  - Options to skip static files, Stripe initialization, admin migrations
  - Production behavior unchanged

### 3. Test Auth System
- **File:** `src/middleware/testAuth.ts`
- **Features:**
  - Accepts tokens in format `test-token-${userId}`
  - Bypasses Supabase JWT validation in tests
  - Properly attaches user to request object
  - Only active when `testMode: true` in build()

### 4. Test Helpers
- **File:** `src/__tests__/setup.ts` - Global setup and database cleanup
- **File:** `src/__tests__/helpers/server.ts` - Start/stop test server
- **File:** `src/__tests__/helpers/auth.ts` - Create test users with auth tokens

### 5. Test Suites
- **File:** `src/__tests__/free-tier-reader.test.ts` - Validates FREE tier access
- **File:** `src/__tests__/author-tier-limits.test.ts` - Validates tier limit enforcement

---

## ⚠️ Remaining Fixes Needed

The infrastructure is complete, but tests need schema alignment fixes before they'll run successfully:

### 1. **Prisma Model Name Fixes**
Replace remaining incorrect model references:
- `prisma.clubMember` → `prisma.membership`
- Compound unique key: `clubId_userId`
- Role field: Use `OWNER`, `MEMBER`, `MODERATOR`

**Files to fix:**
- `src/__tests__/free-tier-reader.test.ts` (lines with `clubMember.create`, `clubMember.upsert`)
- `src/__tests__/author-tier-limits.test.ts` (if any references exist)

### 2. **Enum Value Corrections**
Update test data to match Prisma schema enums:

**Join Rules:**
- ❌ `joinRule: 'APPROVAL_REQUIRED'`
- ✅ `joinRule: 'APPROVAL'`

**Visibility:**
- Confirm schema uses `PUBLIC`/`PRIVATE` (currently looks correct)

**Poll Status:**
- Confirm: `ACTIVE`, `CLOSED`, `CANCELLED`

**Pitch Status:**
- Confirm: `ACTIVE`, `INACTIVE`, `ACCEPTED`, `REJECTED`

### 3. **Required Field Additions**
Add missing required fields to test payloads:

**Pitch Creation:**
```typescript
// Current (incomplete):
{
  title: 'Test Pitch',
  synopsis: 'Test synopsis',
  genres: ['FICTION'],
}

// Should include:
{
  title: 'Test Pitch',
  synopsis: 'Test synopsis',
  blurb: 'Short blurb',  // REQUIRED
  genres: ['FICTION'],
  authorId: userId,  // May be auto-set from auth
}
```

**Poll Creation:**
```typescript
// Ensure polls include:
{
  clubId,
  title: 'Test Poll',
  description: 'Description',
  type: 'BOOK_SELECTION',  // REQUIRED enum
  status: 'ACTIVE',         // REQUIRED enum
  endsAt: futureDate,
}
```

### 4. **API Response Format Verification**
Update test assertions to match actual API responses:

**Current assumptions (may be incorrect):**
```typescript
expect(response.body.success).toBe(true);
expect(response.body.data).toBe(...);
```

**Action:** Cross-check actual route handlers in:
- `src/routes/pitches.ts`
- `src/routes/clubs.ts`
- `src/routes/polls.ts`

Verify they return `{ success, data }` format or adjust assertions.

### 5. **Compound Unique Keys**
When using `upsert` or `where` clauses, use correct compound uniques:

```typescript
// Membership lookup:
await prisma.membership.upsert({
  where: {
    clubId_userId: {  // Compound unique key
      clubId: publicClubId,
      userId: freeReader.user.id,
    },
  },
  create: {...},
  update: {...},
});
```

---

## 🚀 Running Tests

Once fixes are applied:

```bash
# Run all tests
pnpm --filter @repo/api test

# Run specific test file
pnpm --filter @repo/api test -- free-tier-reader.test.ts

# Run with coverage
pnpm --filter @repo/api test -- --coverage
```

---

## 📝 Test Development Workflow

1. **Start test server:**
   - Tests automatically start/stop server using helpers
   - Server runs with `testMode: true` for auth bypass

2. **Create test users:**
   ```typescript
   const testUser = await createTestReader({
     email: 'test@test.com',
     name: 'Test User',
     tier: 'FREE',
   });
   ```

3. **Make authenticated requests:**
   ```typescript
   await request(app.server)
     .post('/api/clubs')
     .set(getAuthHeaders(testUser.token))
     .send({...})
     .expect(201);
   ```

4. **Cleanup:**
   - Tests automatically cleanup via `deleteTestUser()` in `afterAll`
   - Global cleanup available via `testUtils.cleanupDatabase()`

---

## 🔧 Quick Reference

**Test Auth Format:**
```typescript
const token = `test-token-${userId}`;
const headers = getAuthHeaders(token);
```

**Database Cleanup:**
```typescript
await deleteTestUser(userId);  // Removes all related data
await global.testUtils.cleanupDatabase();  // Nuclear cleanup
```

**Server Control:**
```typescript
const app = await startTestServer();  // In beforeAll
await stopTestServer();  // In afterAll
```

---

## 🎯 Next Steps

1. Apply all schema alignment fixes listed above
2. Run `pnpm --filter @repo/api test`
3. Fix any remaining TypeScript/runtime errors
4. Add more test cases once core suites pass
5. Integrate into CI/CD pipeline

---

## 📚 Related Documentation

- Main README: `apps/api/README.md` - Test suite overview
- Pricing Docs: `docs/pricing-access.md` - Tier limits reference
- Prisma Schema: `apps/api/prisma/schema.prisma` - Source of truth for models/enums
