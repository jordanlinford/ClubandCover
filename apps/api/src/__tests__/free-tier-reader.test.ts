import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { startTestServer, stopTestServer } from './helpers/server.js';
import { createTestReader, createTestClubAdmin, getAuthHeaders, deleteTestUser } from './helpers/auth.js';
import { 
  createTestBook, 
  createTestPoll, 
  createTestPitch, 
  createTestPitchNomination,
  createTestPointEntry,
  createTestRewardItem,
  createTestRedemptionRequest,
  TestEnums 
} from './helpers/testFactories.js';
import { prisma } from '../lib/prisma.js';
import type { FastifyInstance } from 'fastify';

/**
 * Integration tests to guarantee FREE tier users can access all reader features
 * These tests ensure readers are NEVER paywalled for core participation
 * 
 * Critical: If any of these tests fail, readers are being incorrectly paywalled
 */

describe('FREE Tier Reader Access', () => {
  let app: FastifyInstance;
  let freeReader: Awaited<ReturnType<typeof createTestReader>>;
  let clubAdmin: Awaited<ReturnType<typeof createTestClubAdmin>>;
  let publicClubId: string;
  let privateClubId: string;

  beforeAll(async () => {
    app = await startTestServer();

    // Create FREE tier reader
    freeReader = await createTestReader({
      email: 'free-reader@test.com',
      name: 'Free Reader',
      tier: 'FREE',
    });

    // Create club admin with a club (also FREE tier to prove club creation is free)
    clubAdmin = await createTestClubAdmin({
      email: 'club-admin@test.com',
      name: 'Club Admin',
      tier: 'FREE',
      clubName: 'Test Club for Readers',
      clubDescription: 'A club to test reader access',
    });

    publicClubId = clubAdmin.clubId;

    // Create a private club for approval testing
    const privateClub = await prisma.club.create({
      data: {
        name: 'Private Test Club',
        description: 'Requires approval',
        createdById: clubAdmin.user.id,
        isPublic: true,
        joinRules: 'APPROVAL',
      },
    });
    privateClubId = privateClub.id;

    // Add club admin as member
    await prisma.membership.create({
      data: {
        clubId: privateClubId,
        userId: clubAdmin.user.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await deleteTestUser(freeReader.user.id);
    await deleteTestUser(clubAdmin.user.id);
    await prisma.club.deleteMany({
      where: {
        id: { in: [publicClubId, privateClubId] },
      },
    });
    await stopTestServer();
  });

  describe('Club Access', () => {
    it('should allow FREE tier user to join public club', async () => {
      const response = await request(app.server)
        .post(`/api/clubs/${publicClubId}/join`)
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow FREE tier user to request to join private club', async () => {
      const response = await request(app.server)
        .post(`/api/clubs/${privateClubId}/join`)
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow FREE tier user to view clubs list', async () => {
      const response = await request(app.server)
        .get('/api/clubs')
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow FREE tier user to create a club (no tier restriction)', async () => {
      const response = await request(app.server)
        .post('/api/clubs')
        .set(getAuthHeaders(freeReader.token))
        .send({
          name: 'Reader Created Club',
          description: 'Proving readers can create clubs',
          isPublic: true,
          joinRules: 'OPEN',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Reader Created Club');

      // Cleanup
      await prisma.club.delete({ where: { id: response.body.data.id } });
    });
  });

  describe('Voting Access', () => {
    let pollId: string;

    beforeAll(async () => {
      // Ensure reader is a member of the club
      await prisma.membership.upsert({
        where: {
          clubId_userId: {
            clubId: publicClubId,
            userId: freeReader.user.id,
          },
        },
        create: {
          clubId: publicClubId,
          userId: freeReader.user.id,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        update: {},
      });

      // Create a poll
      const poll = await createTestPoll({
        clubId: publicClubId,
        createdBy: clubAdmin.user.id,
        type: TestEnums.PollType.PITCH,
        status: TestEnums.PollStatus.OPEN,
      });
      pollId = poll.id;
    });

    it('should allow FREE tier user to vote in polls', async () => {
      // Create a book and pitch for voting
      const book = await createTestBook({
        ownerId: clubAdmin.user.id,
        title: 'Test Book for Poll',
        author: 'Test Author',
        isbn: '978-0-123456-78-9',
      });

      const pitch = await createTestPitch({
        authorId: clubAdmin.user.id,
        bookId: book.id,
        title: 'Test Book for Poll',
        synopsis: 'A test synopsis',
      });

      await createTestPitchNomination({
        pitchId: pitch.id,
        userId: clubAdmin.user.id,
      });

      const response = await request(app.server)
        .post(`/api/polls/${pollId}/vote`)
        .set(getAuthHeaders(freeReader.token))
        .send({
          pitchId: pitch.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Cleanup
      await prisma.pitch.delete({ where: { id: pitch.id } });
      await prisma.book.delete({ where: { id: book.id } });
    });
  });

  describe('Messaging Access', () => {
    beforeAll(async () => {
      // Ensure reader is a member
      await prisma.membership.upsert({
        where: {
          clubId_userId: {
            clubId: publicClubId,
            userId: freeReader.user.id,
          },
        },
        create: {
          clubId: publicClubId,
          userId: freeReader.user.id,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        update: {},
      });
    });

    it('should allow FREE tier user to post messages in clubs', async () => {
      const response = await request(app.server)
        .post(`/api/clubs/${publicClubId}/messages`)
        .set(getAuthHeaders(freeReader.token))
        .send({
          content: 'Test message from FREE tier reader',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Test message from FREE tier reader');
    });

    it('should allow FREE tier user to view messages in clubs', async () => {
      const response = await request(app.server)
        .get(`/api/clubs/${publicClubId}/messages`)
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Pitch Viewing Access', () => {
    let testPitchId: string;
    let testBookId: string;

    beforeAll(async () => {
      const book = await createTestBook({
        ownerId: clubAdmin.user.id,
        title: 'Test Book for Viewing',
        author: 'Test Author',
      });
      testBookId = book.id;

      const pitch = await createTestPitch({
        authorId: clubAdmin.user.id,
        bookId: book.id,
        title: 'Test Pitch for Viewing',
        synopsis: 'Readers should see this',
        status: TestEnums.PitchStatus.SUBMITTED,
      });
      testPitchId = pitch.id;
    });

    afterAll(async () => {
      await prisma.pitch.delete({ where: { id: testPitchId } });
      await prisma.book.delete({ where: { id: testBookId } });
    });

    it('should allow FREE tier user to view pitches', async () => {
      const response = await request(app.server)
        .get('/api/pitches')
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow FREE tier user to view pitch details', async () => {
      const response = await request(app.server)
        .get(`/api/pitches/${testPitchId}`)
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Pitch for Viewing');
    });
  });

  describe('Points and Rewards Access', () => {
    beforeAll(async () => {
      // Give reader some points
      await createTestPointEntry({
        userId: freeReader.user.id,
        amount: 100,
        type: TestEnums.PointType.VOTE_PARTICIPATION,
      });

      // Update user points
      await prisma.user.update({
        where: { id: freeReader.user.id },
        data: { points: 100 },
      });
    });

    it('should allow FREE tier user to view points balance', async () => {
      const response = await request(app.server)
        .get('/api/points')
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBeGreaterThanOrEqual(100);
    });

    it('should allow FREE tier user to view rewards', async () => {
      const response = await request(app.server)
        .get('/api/rewards')
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow FREE tier user to redeem rewards (if they have enough points)', async () => {
      // Create a low-cost reward
      const reward = await createTestRewardItem({
        name: 'Test Badge',
        pointsCost: 50,
        copiesAvailable: 10,
      });

      const response = await request(app.server)
        .post(`/api/rewards/${reward.id}/redeem`)
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Cleanup
      await prisma.redemptionRequest.deleteMany({ where: { rewardId: reward.id } });
      await prisma.rewardItem.delete({ where: { id: reward.id } });
    });
  });

  describe('Profile Access', () => {
    it('should allow FREE tier user to view their own profile', async () => {
      const response = await request(app.server)
        .get('/api/user/me')
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('free-reader@test.com');
      expect(response.body.user.tier).toBe('FREE');
    });

    it('should allow FREE tier user to update their profile', async () => {
      const response = await request(app.server)
        .patch('/api/users/me/profile')
        .set(getAuthHeaders(freeReader.token))
        .send({
          favoriteGenres: ['FICTION', 'MYSTERY'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
