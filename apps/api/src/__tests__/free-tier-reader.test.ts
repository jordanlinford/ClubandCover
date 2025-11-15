import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { startTestServer, stopTestServer } from './helpers/server.js';
import { createTestReader, createTestClubAdmin, getAuthHeaders, deleteTestUser } from './helpers/auth.js';
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
        hostId: clubAdmin.user.id,
        visibility: 'PUBLIC',
        joinRule: 'APPROVAL_REQUIRED',
      },
    });
    privateClubId = privateClub.id;

    // Add club admin as member
    await prisma.clubMember.create({
      data: {
        clubId: privateClubId,
        userId: clubAdmin.user.id,
        role: 'HOST',
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
          visibility: 'PUBLIC',
          joinRule: 'OPEN',
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
      await prisma.clubMember.upsert({
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
        },
        update: {},
      });

      // Create a poll
      const poll = await prisma.poll.create({
        data: {
          clubId: publicClubId,
          title: 'Test Poll',
          description: 'Vote for a book',
          status: 'ACTIVE',
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      pollId = poll.id;
    });

    it('should allow FREE tier user to vote in polls', async () => {
      // Create poll options first
      const pitch = await prisma.pitch.create({
        data: {
          title: 'Test Book for Poll',
          synopsis: 'A test synopsis',
          authorId: clubAdmin.user.id,
          genres: ['FICTION'],
          status: 'ACTIVE',
        },
      });

      await prisma.pitchNomination.create({
        data: {
          pitchId: pitch.id,
          clubId: publicClubId,
          nominatedById: clubAdmin.user.id,
        },
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
    });
  });

  describe('Messaging Access', () => {
    beforeAll(async () => {
      // Ensure reader is a member
      await prisma.clubMember.upsert({
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

    beforeAll(async () => {
      const pitch = await prisma.pitch.create({
        data: {
          title: 'Test Pitch for Viewing',
          synopsis: 'Readers should see this',
          authorId: clubAdmin.user.id,
          genres: ['FICTION'],
          status: 'ACTIVE',
        },
      });
      testPitchId = pitch.id;
    });

    afterAll(async () => {
      await prisma.pitch.delete({ where: { id: testPitchId } });
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
      await prisma.pointLedger.create({
        data: {
          userId: freeReader.user.id,
          amount: 100,
          type: 'VOTE',
          description: 'Test points',
        },
      });

      // Update user points
      await prisma.user.update({
        where: { id: freeReader.user.id },
        data: { pointsBalance: 100 },
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
      const reward = await prisma.reward.create({
        data: {
          name: 'Test Badge',
          description: 'A test reward',
          pointsCost: 50,
          type: 'BADGE',
          badgeCode: 'TEST_BADGE',
          isActive: true,
        },
      });

      const response = await request(app.server)
        .post(`/api/rewards/${reward.id}/redeem`)
        .set(getAuthHeaders(freeReader.token))
        .expect(200);

      expect(response.body.success).toBe(true);

      // Cleanup
      await prisma.redemption.deleteMany({ where: { rewardId: reward.id } });
      await prisma.reward.delete({ where: { id: reward.id } });
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
