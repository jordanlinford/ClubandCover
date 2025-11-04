# Testing Guide

This document explains how to test the Book Club/Swap platform, including authentication setup for automated tests.

## Two Testing Approaches

The application provides **two different testing approaches**:

1. **Supabase Admin Seeding** (Recommended for E2E tests)
   - Creates **real Supabase users** with passwords
   - Users can sign in through the actual UI
   - Most realistic for end-to-end testing
   - Requires `ENABLE_TEST_ROUTES=1` and `TEST_SEED_TOKEN`

2. **Mock Token Auth** (Recommended for API-only tests)
   - Creates database-only users with mock tokens
   - Bypasses Supabase completely
   - Faster for API testing
   - Requires `NODE_ENV=test`

---

## Approach 1: Supabase Admin Seeding (E2E Tests)

This approach uses Supabase's admin API to create real test users that can sign in normally.

### Setup

**Step 1: Add Replit Secrets**

Add these two secrets in your Replit project:

```
ENABLE_TEST_ROUTES=1
TEST_SEED_TOKEN=your_random_secret_token_here
```

⚠️ **Security Note**: Never enable `ENABLE_TEST_ROUTES` in production!

**Step 2: Restart the Server**

The test-seed route will be registered on startup. You'll see in logs:
```
[TEST] Test-seed route enabled
```

### Seed Test Users

```bash
POST /api/test/seed-users
x-seed-token: your_random_secret_token_here
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "email": "alice.test+e2e@bookpitch.dev",
      "id": "uuid-here",
      "error": null
    },
    {
      "email": "bob.test+e2e@bookpitch.dev",
      "id": "uuid-here",
      "error": null
    }
  ]
}
```

Now both users exist in Supabase Auth with password `Test123!`

### Use in Playwright Tests

```typescript
import { test, expect } from '@playwright/test';

test.beforeAll(async ({ request }) => {
  // Seed users once before all tests
  await request.post('/api/test/seed-users', {
    headers: {
      'x-seed-token': process.env.TEST_SEED_TOKEN!
    }
  });
});

test('user can sign in and create books', async ({ page }) => {
  // Navigate to sign in
  await page.goto('/auth/sign-in');
  
  // Sign in with seeded user
  await page.getByTestId('input-email').fill('alice.test+e2e@bookpitch.dev');
  await page.getByTestId('input-password').fill('Test123!');
  await page.getByTestId('button-signin').click();
  
  // Wait for redirect
  await page.waitForURL('/');
  
  // User is now authenticated and can use the app normally!
  await page.goto('/books/new');
  await page.getByTestId('input-title').fill('Test Book');
  // ... rest of test
});
```

### Cleanup

The seeded users persist in Supabase. To remove them manually:
1. Go to your Supabase dashboard
2. Navigate to Authentication > Users
3. Delete users with emails ending in `@bookpitch.dev`

Or create a cleanup endpoint if needed.

---

## Approach 2: Mock Token Auth (API Tests)

## Test Support Routes

The application includes test support routes that are **only available when `NODE_ENV=test`**. These routes enable automated testing without requiring real Supabase authentication.

### Security

- Test routes are completely disabled in development and production environments
- Only activate when `NODE_ENV=test` is explicitly set
- Should never be deployed to production with test mode enabled

---

## Test Authentication Flow

### 1. Check Test Auth Status

```bash
GET /api/test/auth/status
```

**Response (when enabled):**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "environment": "test",
    "message": "Test authentication is available"
  }
}
```

---

### 2. Create Test Session

Creates a test user in the database and returns a mock authentication token.

```bash
POST /api/test/auth/create-session
Content-Type: application/json

{
  "email": "testuser@example.com",  // Optional: auto-generated if not provided
  "name": "Test User",               // Optional: defaults to "Test User"
  "tier": "FREE"                     // Optional: defaults to "FREE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "test-user-1730749200000",
      "email": "testuser@example.com",
      "name": "Test User",
      "tier": "FREE"
    },
    "token": "test-token-test-user-1730749200000",
    "message": "Test session created - use this token in Authorization header"
  }
}
```

---

### 3. Use Test Token

Include the token in subsequent requests:

```bash
POST /api/books
Authorization: Bearer test-token-test-user-1730749200000
Content-Type: application/json

{
  "title": "Test Book",
  "author": "Test Author",
  "isbn": "1234567890123",
  "condition": "NEW",
  "availableForSwap": true
}
```

---

### 4. Cleanup Test Data

After tests complete, clean up test users:

```bash
POST /api/test/auth/cleanup
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 5,
    "message": "Cleaned up 5 test users"
  }
}
```

This removes all users with:
- Email starting with `test_`
- Email ending with `@example.com`
- ID starting with `test-user-`

---

## Playwright Testing Example

Here's how to use test authentication in Playwright tests:

```typescript
import { test, expect } from '@playwright/test';

let testToken: string;
let userId: string;

test.beforeAll(async ({ request }) => {
  // Create test session
  const response = await request.post('/api/test/auth/create-session', {
    data: {
      email: 'playwright@example.com',
      name: 'Playwright Test User',
      tier: 'FREE'
    }
  });
  
  const data = await response.json();
  testToken = data.data.token;
  userId = data.data.user.id;
});

test('create a book with AI blurb generation', async ({ page, request }) => {
  // Create book via API (authenticated)
  const bookResponse = await request.post('/api/books', {
    headers: {
      'Authorization': `Bearer ${testToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '9780743273565',
      condition: 'NEW',
      availableForSwap': true,
      genres: ['Fiction', 'Classic']
    }
  });
  
  expect(bookResponse.status()).toBe(201);
  const book = await bookResponse.json();
  
  // Navigate to book detail page
  await page.goto(`/books/${book.data.id}`);
  
  // Verify book details displayed
  await expect(page.getByTestId('text-title')).toContainText('The Great Gatsby');
  await expect(page.getByTestId('text-author')).toContainText('F. Scott Fitzgerald');
});

test.afterAll(async ({ request }) => {
  // Cleanup test users
  await request.post('/api/test/auth/cleanup');
});
```

---

## Sprint-2 AI Testing Example

Testing AI features requires authentication. Here's a complete test flow:

```typescript
test('AI blurb generation and matching', async ({ page, request }) => {
  // 1. Create test session
  const authResponse = await request.post('/api/test/auth/create-session', {
    data: { tier: 'FREE' } // 10 AI calls per day
  });
  const { token, user } = (await authResponse.json()).data;
  
  // 2. Create a book via API
  const bookResponse = await request.post('/api/books', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      title: 'Epic Fantasy Adventure',
      author: 'Fantasy Author',
      genres: ['fantasy', 'adventure'],
      isbn: '1234567890123',
      condition: 'NEW',
      availableForSwap: true
    }
  });
  const book = (await bookResponse.json()).data;
  
  // 3. Generate AI blurb
  const blurbResponse = await request.post('/api/ai/generate-blurb', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      title: book.title,
      author: book.author,
      genres: book.genres
    }
  });
  const { blurb } = (await blurbResponse.json()).data;
  
  expect(blurb).toBeTruthy();
  expect(blurb.split(/\s+/).length).toBeLessThanOrEqual(120);
  
  // 4. Wait for auto-indexing to complete
  await page.waitForTimeout(2000);
  
  // 5. Get recommended clubs
  const matchResponse = await request.post('/api/ai/match', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { bookId: book.id }
  });
  const matches = (await matchResponse.json()).data;
  
  expect(Array.isArray(matches)).toBe(true);
  if (matches.length > 0) {
    expect(matches[0]).toHaveProperty('score');
    expect(matches[0]).toHaveProperty('why');
  }
});
```

---

## Running Tests with Test Mode

### Enable Test Environment

```bash
# Set environment variable
export NODE_ENV=test

# Or in .env file
NODE_ENV=test

# Then start the server
npm run dev
```

### Verify Test Mode Active

```bash
curl http://localhost:5000/api/test/auth/status
```

If test mode is active, you'll see:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "environment": "test",
    "message": "Test authentication is available"
  }
}
```

If test mode is disabled (development/production):
- The route returns 404
- Server logs show: `[TEST] Test support routes disabled (not in test environment)`

---

## Manual Testing (Without Test Routes)

For manual testing in development, use the real Supabase authentication:

1. **Sign Up**: Navigate to `/auth/sign-up`
2. **Create Account**: Use a real email address (e.g., `yourname@gmail.com`)
3. **Test Features**: All features work normally with Supabase auth

---

## Rate Limiting in Tests

Test users inherit the tier-based rate limits:

| Tier | AI Calls Per Day |
|------|------------------|
| Anonymous (IP-based) | 3 |
| FREE | 10 |
| PRO_AUTHOR | 50 |

To test rate limiting:

```typescript
test('AI rate limit enforcement', async ({ request }) => {
  const { token } = await createTestSession({ tier: 'FREE' });
  
  // Make 11 AI calls (FREE tier limit is 10)
  for (let i = 0; i < 11; i++) {
    const response = await request.post('/api/ai/generate-blurb', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        title: `Book ${i}`,
        author: 'Test Author',
        genres: ['Fiction']
      }
    });
    
    if (i < 10) {
      expect(response.status()).toBe(200);
    } else {
      // 11th call should be rate limited
      expect(response.status()).toBe(429);
      const error = await response.json();
      expect(error.error.code).toBe('AI_RATE_LIMIT');
    }
  }
});
```

---

## Troubleshooting

### Test Routes Not Available

**Problem**: Getting 404 on `/api/test/auth/status`

**Solution**: Ensure `NODE_ENV=test` is set before starting the server:
```bash
NODE_ENV=test npm run dev
```

### Token Not Working

**Problem**: Getting 401 errors with test token

**Possible causes**:
1. `NODE_ENV` is not set to `test` (test tokens only work in test mode)
2. Token format is incorrect (should be `test-token-{userId}`)
3. User doesn't exist in database

**Solution**: Re-create the test session and use the new token

### Auto-Indexing Not Working

**Problem**: Embeddings not created for books/clubs

**Possible causes**:
1. `OPENAI_API_KEY` not configured
2. AI features disabled

**Solution**: Add `OPENAI_API_KEY` to environment variables or expect 501 responses

---

## Security Notes

🔒 **Production Safety**:
- Test routes are completely disabled when `NODE_ENV !== 'test'`
- Test tokens are rejected in non-test environments
- Never deploy with `NODE_ENV=test` to production

🔐 **Test Isolation**:
- Test users are created with predictable IDs (`test-user-*`)
- Cleanup removes all test data automatically
- Test database should be separate from production

---

## Summary

The test support system provides:

✅ **Easy Authentication**: No Supabase email validation hurdles  
✅ **Programmatic Control**: Create users with specific tiers  
✅ **Clean Tests**: Automatic cleanup of test data  
✅ **Production Safe**: Only works in test environment  
✅ **Full Feature Access**: Test all authenticated endpoints  

This eliminates the authentication blocker for automated testing while maintaining production security.
