import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { startTestServer, stopTestServer } from './helpers/server.js';
import { createTestAuthor, getAuthHeaders, deleteTestUser } from './helpers/auth.js';
import { prisma } from '../lib/prisma.js';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests for author tier limit enforcement
 * Validates that pitch/swap/AI limits are correctly enforced per tier
 * 
 * Tier Limits:
 * - FREE: 3 pitches, 3 swaps, 10 AI calls/day
 * - PRO_AUTHOR: 10 pitches, 10 swaps, 50 AI calls/day
 * - PUBLISHER: 999 pitches, 999 swaps, 999 AI calls/day
 */

describe('Author Tier Limit Enforcement', () => {
  let app: FastifyInstance;
  let freeAuthor: Awaited<ReturnType<typeof createTestAuthor>>;
  let proAuthor: Awaited<ReturnType<typeof createTestAuthor>>;
  let publisherAuthor: Awaited<ReturnType<typeof createTestAuthor>>;

  beforeAll(async () => {
    app = await startTestServer();

    // Create FREE tier author
    freeAuthor = await createTestAuthor({
      email: 'free-author-limits@test.com',
      name: 'Free Author',
      tier: 'FREE',
      penName: 'Free Author',
      bio: 'Testing FREE tier limits',
    });

    // Create PRO_AUTHOR tier author
    proAuthor = await createTestAuthor({
      email: 'pro-author-limits@test.com',
      name: 'Pro Author',
      tier: 'PRO_AUTHOR',
      penName: 'Pro Author',
      bio: 'Testing PRO_AUTHOR tier limits',
    });

    // Create PUBLISHER tier author
    publisherAuthor = await createTestAuthor({
      email: 'publisher-limits@test.com',
      name: 'Publisher',
      tier: 'PUBLISHER',
      penName: 'Publisher',
      bio: 'Testing PUBLISHER tier limits',
    });
  });

  afterAll(async () => {
    // Cleanup
    await deleteTestUser(freeAuthor.user.id);
    await deleteTestUser(proAuthor.user.id);
    await deleteTestUser(publisherAuthor.user.id);
    await stopTestServer();
  });

  describe('FREE Tier - Pitch Limits (3 active)', () => {
    it('should allow FREE author to create 3 pitches', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app.server)
          .post('/api/pitches')
          .set(getAuthHeaders(freeAuthor.token))
          .send({
            title: `FREE Pitch ${i + 1}`,
            synopsis: 'Testing pitch limits for FREE tier',
            genres: ['FICTION'],
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });

    it('should block 4th pitch and suggest upgrade to PRO_AUTHOR', async () => {
      const response = await request(app.server)
        .post('/api/pitches')
        .set(getAuthHeaders(freeAuthor.token))
        .send({
          title: 'FREE Pitch 4 - Should Fail',
          synopsis: 'This should be blocked',
          genres: ['FICTION'],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('PITCH_LIMIT_REACHED');
      expect(response.body.error?.requiredTier).toBe('PRO_AUTHOR');
    });
  });

  describe('PRO_AUTHOR Tier - Pitch Limits (10 active)', () => {
    it('should allow PRO_AUTHOR to create 10 pitches', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app.server)
          .post('/api/pitches')
          .set(getAuthHeaders(proAuthor.token))
          .send({
            title: `PRO Pitch ${i + 1}`,
            synopsis: 'Testing pitch limits for PRO_AUTHOR tier',
            genres: ['FICTION'],
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });

    it('should block 11th pitch for PRO_AUTHOR', async () => {
      const response = await request(app.server)
        .post('/api/pitches')
        .set(getAuthHeaders(proAuthor.token))
        .send({
          title: 'PRO Pitch 11 - Should Fail',
          synopsis: 'This should be blocked',
          genres: ['FICTION'],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('PITCH_LIMIT_REACHED');
    });
  });

  describe('PUBLISHER Tier - Unlimited Pitches', () => {
    it('should allow PUBLISHER to create many pitches (testing 15)', async () => {
      for (let i = 0; i < 15; i++) {
        const response = await request(app.server)
          .post('/api/pitches')
          .set(getAuthHeaders(publisherAuthor.token))
          .send({
            title: `PUBLISHER Pitch ${i + 1}`,
            synopsis: 'Testing unlimited pitches for PUBLISHER tier',
            genres: ['FICTION'],
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Swap Limits', () => {
    let targetAuthor: Awaited<ReturnType<typeof createTestAuthor>>;
    let targetBookId: string;

    beforeAll(async () => {
      // Create target author for swaps
      targetAuthor = await createTestAuthor({
        email: 'swap-target@test.com',
        name: 'Swap Target',
        tier: 'FREE',
        penName: 'Swap Target',
        bio: 'Target for swap tests',
      });

      // Update author profile to accept swaps
      await prisma.authorProfile.update({
        where: { userId: targetAuthor.user.id },
        data: { openToSwaps: true },
      });

      // Create a book for target author
      const book = await prisma.book.create({
        data: {
          title: 'Target Book',
          ownerId: targetAuthor.user.id,
          status: 'AVAILABLE',
        },
      });
      targetBookId = book.id;
    });

    afterAll(async () => {
      await deleteTestUser(targetAuthor.user.id);
    });

    it('should enforce FREE tier swap limits (3 pending)', async () => {
      // Create books for FREE author
      const books = [];
      for (let i = 0; i < 4; i++) {
        const book = await prisma.book.create({
          data: {
            title: `FREE Author Book ${i + 1}`,
            ownerId: freeAuthor.user.id,
            status: 'AVAILABLE',
          },
        });
        books.push(book);
      }

      // First 3 swaps should succeed
      for (let i = 0; i < 3; i++) {
        const response = await request(app.server)
          .post('/api/swaps')
          .set(getAuthHeaders(freeAuthor.token))
          .send({
            requestedBookId: targetBookId,
            offeredBookId: books[i].id,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      }

      // 4th swap should be blocked
      const response = await request(app.server)
        .post('/api/swaps')
        .set(getAuthHeaders(freeAuthor.token))
        .send({
          requestedBookId: targetBookId,
          offeredBookId: books[3].id,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('SWAP_LIMIT');
      expect(response.body.error?.requiredTier).toBe('PRO_AUTHOR');
    });
  });

  describe('AI Rate Limits', () => {
    it('should enforce FREE tier AI limit (10/day)', async () => {
      // Reset AI calls for clean test
      await prisma.user.update({
        where: { id: freeAuthor.user.id },
        data: {
          aiCallsToday: 0,
          aiCallsResetAt: new Date(),
        },
      });

      // Make 10 calls successfully
      for (let i = 0; i < 10; i++) {
        const response = await request(app.server)
          .post('/api/ai/generate-blurb')
          .set(getAuthHeaders(freeAuthor.token))
          .send({
            title: 'Test Book',
            synopsis: 'Testing AI limits',
          });

        // Allow for either success or rate limit at exactly 10
        if (response.status === 429 && i < 10) {
          fail(`Got rate limited at call ${i + 1}, expected to allow 10 calls`);
        }
      }

      // 11th call should be rate limited
      const response = await request(app.server)
        .post('/api/ai/generate-blurb')
        .set(getAuthHeaders(freeAuthor.token))
        .send({
          title: 'Test Book',
          synopsis: 'This should be rate limited',
        })
        .expect(429);

      expect(response.body.error?.code).toBe('AI_RATE_LIMIT');
      expect(response.body.error?.requiredTier).toBe('PRO_AUTHOR');
    });

    it('should allow PRO_AUTHOR higher AI limit (50/day)', async () => {
      await prisma.user.update({
        where: { id: proAuthor.user.id },
        data: {
          aiCallsToday: 49, // Set to 49, next call should succeed
          aiCallsResetAt: new Date(),
        },
      });

      const response = await request(app.server)
        .post('/api/ai/generate-blurb')
        .set(getAuthHeaders(proAuthor.token))
        .send({
          title: 'Test Book',
          synopsis: 'Testing PRO_AUTHOR AI limit',
        });

      // Should succeed (50th call)
      if (response.status === 429) {
        expect(response.body.error?.code).not.toBe('AI_RATE_LIMIT');
      }
    });
  });
});
