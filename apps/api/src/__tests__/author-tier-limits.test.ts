import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../lib/prisma.js';

/**
 * Integration tests for author tier limit enforcement
 * Validates that pitch/swap/AI limits are correctly enforced per tier
 * 
 * Tier Limits:
 * - FREE: 3 pitches, 3 swaps, 10 AI calls/day
 * - PRO_AUTHOR: 10 pitches, 10 swaps, 50 AI calls/day
 * - PUBLISHER: 999 pitches, 999 swaps, 999 AI calls/day
 */

const API_BASE = `http://localhost:${process.env.PORT || 5000}`;

// Test users for each tier
let freeAuthorId: string;
let freeAuthorToken: string;
let proAuthorId: string;
let proAuthorToken: string;
let publisherAuthorId: string;
let publisherAuthorToken: string;

beforeAll(async () => {
  // Create FREE tier author
  const freeAuthor = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'free-author-limits@test.com',
      name: 'Free Author',
      roles: ['AUTHOR'],
      tier: 'FREE',
      accountStatus: 'ACTIVE',
    },
  });
  freeAuthorId = freeAuthor.id;
  freeAuthorToken = `test-token-${freeAuthorId}`;

  await prisma.authorProfile.create({
    data: {
      userId: freeAuthorId,
      penName: 'Free Author',
      bio: 'Testing FREE tier limits',
      verificationStatus: 'VERIFIED',
    },
  });

  // Create PRO_AUTHOR tier author
  const proAuthor = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'pro-author-limits@test.com',
      name: 'Pro Author',
      roles: ['AUTHOR'],
      tier: 'PRO_AUTHOR',
      accountStatus: 'ACTIVE',
    },
  });
  proAuthorId = proAuthor.id;
  proAuthorToken = `test-token-${proAuthorId}`;

  await prisma.authorProfile.create({
    data: {
      userId: proAuthorId,
      penName: 'Pro Author',
      bio: 'Testing PRO_AUTHOR tier limits',
      verificationStatus: 'VERIFIED',
    },
  });

  // Create PUBLISHER tier author
  const publisherAuthor = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'publisher-limits@test.com',
      name: 'Publisher',
      roles: ['AUTHOR'],
      tier: 'PUBLISHER',
      accountStatus: 'ACTIVE',
    },
  });
  publisherAuthorId = publisherAuthor.id;
  publisherAuthorToken = `test-token-${publisherAuthorId}`;

  await prisma.authorProfile.create({
    data: {
      userId: publisherAuthorId,
      penName: 'Publisher',
      bio: 'Testing PUBLISHER tier limits',
      verificationStatus: 'VERIFIED',
    },
  });
});

afterAll(async () => {
  // Cleanup test data
  await prisma.pitch.deleteMany({
    where: { authorId: { in: [freeAuthorId, proAuthorId, publisherAuthorId] } },
  });
  await prisma.swap.deleteMany({
    where: {
      OR: [
        { requesterId: { in: [freeAuthorId, proAuthorId, publisherAuthorId] } },
        { responderId: { in: [freeAuthorId, proAuthorId, publisherAuthorId] } },
      ],
    },
  });
  await prisma.authorProfile.deleteMany({
    where: { userId: { in: [freeAuthorId, proAuthorId, publisherAuthorId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [freeAuthorId, proAuthorId, publisherAuthorId] } },
  });
  await prisma.$disconnect();
});

describe('Author Tier Limit Enforcement', () => {
  describe('FREE Tier - Pitch Limits (3 active)', () => {
    it('should allow FREE author to create 3 pitches', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_BASE}/api/pitches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freeAuthorToken}`,
          },
          body: JSON.stringify({
            title: `FREE Pitch ${i + 1}`,
            synopsis: 'Testing pitch limits for FREE tier',
            genres: ['FICTION'],
          }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    it('should block 4th pitch and suggest upgrade to PRO_AUTHOR', async () => {
      const response = await fetch(`${API_BASE}/api/pitches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeAuthorToken}`,
        },
        body: JSON.stringify({
          title: 'FREE Pitch 4 - Should Fail',
          synopsis: 'This should be blocked',
          genres: ['FICTION'],
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('PITCH_LIMIT_REACHED');
      expect(data.requiredTier).toBe('PRO_AUTHOR');
    });
  });

  describe('PRO_AUTHOR Tier - Pitch Limits (10 active)', () => {
    it('should allow PRO_AUTHOR to create 10 pitches', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${API_BASE}/api/pitches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${proAuthorToken}`,
          },
          body: JSON.stringify({
            title: `PRO Pitch ${i + 1}`,
            synopsis: 'Testing pitch limits for PRO_AUTHOR tier',
            genres: ['FICTION'],
          }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    it('should block 11th pitch for PRO_AUTHOR', async () => {
      const response = await fetch(`${API_BASE}/api/pitches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${proAuthorToken}`,
        },
        body: JSON.stringify({
          title: 'PRO Pitch 11 - Should Fail',
          synopsis: 'This should be blocked',
          genres: ['FICTION'],
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('PITCH_LIMIT_REACHED');
    });
  });

  describe('PUBLISHER Tier - Unlimited Pitches', () => {
    it('should allow PUBLISHER to create many pitches (testing 15)', async () => {
      for (let i = 0; i < 15; i++) {
        const response = await fetch(`${API_BASE}/api/pitches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publisherAuthorToken}`,
          },
          body: JSON.stringify({
            title: `PUBLISHER Pitch ${i + 1}`,
            synopsis: 'Testing unlimited pitches for PUBLISHER tier',
            genres: ['FICTION'],
          }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });
  });

  describe('FREE Tier - Swap Limits (3 pending)', () => {
    let targetUserId: string;

    beforeAll(async () => {
      // Create target user for swaps
      const targetUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: 'swap-target@test.com',
          name: 'Swap Target',
          roles: ['AUTHOR'],
          tier: 'FREE',
          accountStatus: 'ACTIVE',
        },
      });
      targetUserId = targetUser.id;

      await prisma.authorProfile.create({
        data: {
          userId: targetUserId,
          penName: 'Swap Target',
          bio: 'Target for swap tests',
          verificationStatus: 'VERIFIED',
          openToSwaps: true,
        },
      });

      // Create a book for target user
      await prisma.book.create({
        data: {
          id: crypto.randomUUID(),
          title: 'Target Book',
          ownerId: targetUserId,
          status: 'AVAILABLE',
        },
      });
    });

    it('should allow FREE author to create 3 pending swaps', async () => {
      const targetBook = await prisma.book.findFirst({
        where: { ownerId: targetUserId },
      });

      // Create requester books
      for (let i = 0; i < 3; i++) {
        await prisma.book.create({
          data: {
            id: crypto.randomUUID(),
            title: `FREE Author Book ${i + 1}`,
            ownerId: freeAuthorId,
            status: 'AVAILABLE',
          },
        });
      }

      const requesterBooks = await prisma.book.findMany({
        where: { ownerId: freeAuthorId },
        take: 3,
      });

      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${API_BASE}/api/swaps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freeAuthorToken}`,
          },
          body: JSON.stringify({
            requestedBookId: targetBook?.id,
            offeredBookId: requesterBooks[i].id,
          }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    it('should block 4th swap and suggest upgrade', async () => {
      const targetBook = await prisma.book.findFirst({
        where: { ownerId: targetUserId },
      });

      await prisma.book.create({
        data: {
          id: crypto.randomUUID(),
          title: 'FREE Author Book 4',
          ownerId: freeAuthorId,
          status: 'AVAILABLE',
        },
      });

      const fourthBook = await prisma.book.findFirst({
        where: { ownerId: freeAuthorId, title: 'FREE Author Book 4' },
      });

      const response = await fetch(`${API_BASE}/api/swaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeAuthorToken}`,
        },
        body: JSON.stringify({
          requestedBookId: targetBook?.id,
          offeredBookId: fourthBook?.id,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('SWAP_LIMIT');
      expect(data.requiredTier).toBe('PRO_AUTHOR');
    });
  });

  describe('AI Rate Limits', () => {
    it('should enforce FREE tier AI limit (10/day)', async () => {
      // Reset AI calls for clean test
      await prisma.user.update({
        where: { id: freeAuthorId },
        data: {
          aiCallsToday: 0,
          aiCallsResetAt: new Date(),
        },
      });

      // This endpoint uses AI rate limiting middleware
      // Make 10 calls successfully
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${API_BASE}/api/ai/generate-blurb`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freeAuthorToken}`,
          },
          body: JSON.stringify({
            title: 'Test Book',
            synopsis: 'Testing AI limits',
          }),
        });

        // Should succeed (or fail for other reasons, but not rate limit)
        if (response.status === 429) {
          const data = await response.json();
          if (data.error?.code === 'AI_RATE_LIMIT') {
            // If we hit limit before 10, something is wrong
            expect(i).toBeGreaterThanOrEqual(10);
          }
        }
      }

      // 11th call should be rate limited
      const response = await fetch(`${API_BASE}/api/ai/generate-blurb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeAuthorToken}`,
        },
        body: JSON.stringify({
          title: 'Test Book',
          synopsis: 'This should be rate limited',
        }),
      });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error?.code).toBe('AI_RATE_LIMIT');
      expect(data.error?.requiredTier).toBe('PRO_AUTHOR');
    });

    it('should allow PRO_AUTHOR higher AI limit (50/day)', async () => {
      await prisma.user.update({
        where: { id: proAuthorId },
        data: {
          aiCallsToday: 49, // Set to 49, next call should succeed
          aiCallsResetAt: new Date(),
        },
      });

      const response = await fetch(`${API_BASE}/api/ai/generate-blurb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${proAuthorToken}`,
        },
        body: JSON.stringify({
          title: 'Test Book',
          synopsis: 'Testing PRO_AUTHOR AI limit',
        }),
      });

      // Should succeed (50th call)
      if (response.status === 429) {
        const data = await response.json();
        expect(data.error?.code).not.toBe('AI_RATE_LIMIT');
      }
    });
  });
});
