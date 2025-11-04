# Test Authentication Setup - Complete ✅

## Problem Solved

**Issue**: Automated tests couldn't create accounts because Supabase rejects programmatically-generated emails (e.g., `test_123@example.com`)

**Solution**: Two complementary testing approaches now available

---

## ✅ What Was Implemented

### 1. Supabase Admin Seeding (Real Users)

**File**: `apps/api/src/routes/test-seed.ts`

**Purpose**: Creates **real Supabase users** with passwords for E2E testing

**How it works**:
- Uses Supabase admin API to create verified users
- Users can sign in through the actual UI
- Password: `Test123!`
- Pre-configured test users:
  - `alice.test+e2e@bookpitch.dev`
  - `bob.test+e2e@bookpitch.dev`

**Security**:
- Only works when `ENABLE_TEST_ROUTES=1`
- Requires `TEST_SEED_TOKEN` header for authorization
- Blocked in production environments

**To enable**:
```bash
# Add to Replit Secrets:
ENABLE_TEST_ROUTES=1
TEST_SEED_TOKEN=your_secret_token
```

**Usage**:
```bash
curl -X POST http://localhost:5000/api/test/seed-users \
  -H "x-seed-token: your_secret_token"
```

**Best for**: Playwright tests that need to sign in through the UI

---

### 2. Mock Token Auth (Database-Only)

**File**: `apps/api/src/routes/test-support.ts`

**Purpose**: Creates database-only test users with mock JWT tokens

**How it works**:
- Creates users directly in the database
- Returns mock tokens (`test-token-{userId}`)
- Auth middleware recognizes test tokens
- No Supabase interaction

**Security**:
- Only works when `NODE_ENV=test`
- Completely disabled in development/production
- Test tokens rejected outside test environment

**To enable**:
```bash
export NODE_ENV=test
npm run dev
```

**Usage**:
```bash
# Create test session
curl -X POST http://localhost:5000/api/test/auth/create-session \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "tier": "FREE"}'

# Response includes token to use in API calls
```

**Best for**: Fast API-only tests, unit tests, CI/CD pipelines

---

## Which Approach Should I Use?

### Use Supabase Admin Seeding When:
✅ Testing full user flows (sign up → create book → swap)  
✅ Testing UI interactions (clicking buttons, filling forms)  
✅ Testing authentication flows (sign in, sign out, password reset)  
✅ End-to-end Playwright tests  
✅ You need users to persist between test runs  

### Use Mock Token Auth When:
✅ Testing API endpoints directly  
✅ Fast iteration during development  
✅ CI/CD pipelines where speed matters  
✅ Testing AI features without UI interaction  
✅ You want automatic cleanup after tests  

---

## Files Modified/Created

### New Files
1. `apps/api/src/routes/test-seed.ts` - Supabase admin seeding
2. `apps/api/src/routes/test-support.ts` - Mock token auth
3. `docs/TESTING.md` - Complete testing guide
4. `docs/TEST_SETUP_SUMMARY.md` - This file

### Modified Files
1. `apps/api/src/routes/index.ts` - Registered test routes
2. `apps/api/src/index.ts` - Conditional test-seed registration
3. `apps/api/src/middleware/auth.ts` - Test token recognition
4. `replit.md` - Added testing section

---

## Quick Start Examples

### Example 1: E2E Test with Real User

```typescript
// playwright test
test('user creates book with AI blurb', async ({ page, request }) => {
  // 1. Seed users (run once)
  await request.post('/api/test/seed-users', {
    headers: { 'x-seed-token': process.env.TEST_SEED_TOKEN! }
  });
  
  // 2. Sign in through UI
  await page.goto('/auth/sign-in');
  await page.getByTestId('input-email').fill('alice.test+e2e@bookpitch.dev');
  await page.getByTestId('input-password').fill('Test123!');
  await page.getByTestId('button-signin').click();
  
  // 3. User is now authenticated!
  await page.goto('/books/new');
  await page.getByTestId('input-title').fill('Epic Fantasy');
  await page.getByTestId('button-generate-blurb').click();
  
  // 4. Verify AI blurb generated
  await expect(page.getByTestId('textarea-description')).not.toBeEmpty();
});
```

### Example 2: API Test with Mock Token

```typescript
// API test
test('AI rate limiting works', async ({ request }) => {
  // 1. Create test session with FREE tier
  const auth = await request.post('/api/test/auth/create-session', {
    data: { tier: 'FREE' } // 10 AI calls/day
  });
  const { token } = (await auth.json()).data;
  
  // 2. Make 11 API calls
  for (let i = 0; i < 11; i++) {
    const res = await request.post('/api/ai/generate-blurb', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        title: `Book ${i}`,
        author: 'Test Author',
        genres: ['Fiction']
      }
    });
    
    if (i < 10) {
      expect(res.status()).toBe(200);
    } else {
      expect(res.status()).toBe(429); // Rate limited!
    }
  }
  
  // 3. Cleanup
  await request.post('/api/test/auth/cleanup');
});
```

---

## Security Checklist

Before deploying to production:

- [ ] `ENABLE_TEST_ROUTES` is NOT set (or set to `0`)
- [ ] `NODE_ENV` is NOT set to `test`
- [ ] `TEST_SEED_TOKEN` exists only in dev/test environments
- [ ] Test routes return 404 or 403 in production
- [ ] Seeded test users are removed from production Supabase

---

## Testing Status

✅ **Email validation issue**: SOLVED  
✅ **Automated testing**: ENABLED  
✅ **Two testing approaches**: IMPLEMENTED  
✅ **Documentation**: COMPLETE  
✅ **Security**: PRODUCTION-SAFE  

You can now run automated tests without the Supabase email validation blocker!

---

**See `docs/TESTING.md` for complete API documentation and more examples.**
