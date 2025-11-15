import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../lib/prisma.js';

/**
 * Integration tests to guarantee FREE tier users can access all reader features
 * These tests ensure readers are NEVER paywalled for core participation
 * 
 * Critical: If any of these tests fail, readers are being incorrectly paywalled
 */

const API_BASE = `http://localhost:${process.env.PORT || 5000}`;

// Test user IDs and tokens
let freeUserId: string;
let freeUserToken: string;
let clubOwnerId: string;
let clubOwnerToken: string;
let publicClubId: string;
let privateClubId: string;
let pollId: string;
let threadId: string;

beforeAll(async () => {
  // Create FREE tier test user (reader)
  const freeUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'free-reader-test@test.com',
      name: 'Free Reader',
      roles: ['READER'],
      tier: 'FREE',
      accountStatus: 'ACTIVE',
    },
  });
  freeUserId = freeUser.id;
  freeUserToken = `test-token-${freeUserId}`;

  // Create club owner (also FREE tier to prove club creation doesn't need paid tier)
  const clubOwner = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'club-owner-test@test.com',
      name: 'Club Owner',
      roles: ['READER'],
      tier: 'FREE',
      accountStatus: 'ACTIVE',
    },
  });
  clubOwnerId = clubOwner.id;
  clubOwnerToken = `test-token-${clubOwnerId}`;

  // Create public club
  const publicClub = await prisma.club.create({
    data: {
      name: 'Free Access Public Club',
      description: 'Everyone can join',
      isPublic: true,
      joinRules: 'OPEN',
      createdById: clubOwnerId,
      memberships: {
        create: {
          userId: clubOwnerId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      },
    },
  });
  publicClubId = publicClub.id;

  // Create private club (requires approval but still FREE to request)
  const privateClub = await prisma.club.create({
    data: {
      name: 'Free Access Private Club',
      description: 'Approval required but still free',
      isPublic: false,
      joinRules: 'APPROVAL_REQUIRED',
      createdById: clubOwnerId,
      memberships: {
        create: {
          userId: clubOwnerId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      },
    },
  });
  privateClubId = privateClub.id;

  // Create a poll in the public club
  const poll = await prisma.poll.create({
    data: {
      clubId: publicClubId,
      creatorId: clubOwnerId,
      type: 'BOOK_SELECTION',
      status: 'OPEN',
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      options: {
        create: [
          { text: 'Book Option 1' },
          { text: 'Book Option 2' },
        ],
      },
    },
    include: {
      options: true,
    },
  });
  pollId = poll.id;

  // Create thread for the public club
  const thread = await prisma.thread.create({
    data: {
      title: 'Public Club Discussion',
      clubId: publicClubId,
      members: {
        create: [
          { userId: clubOwnerId },
        ],
      },
    },
  });
  threadId = thread.id;
});

afterAll(async () => {
  // Cleanup test data
  await prisma.vote.deleteMany({ where: { userId: freeUserId } });
  await prisma.message.deleteMany({ where: { senderId: { in: [freeUserId, clubOwnerId] } }});
  await prisma.threadMember.deleteMany({ where: { userId: { in: [freeUserId, clubOwnerId] } }});
  await prisma.thread.deleteMany({ where: { id: threadId } });
  await prisma.pollOption.deleteMany({ where: { pollId } });
  await prisma.poll.deleteMany({ where: { id: pollId } });
  await prisma.membership.deleteMany({
    where: { userId: { in: [freeUserId, clubOwnerId] } },
  });
  await prisma.club.deleteMany({
    where: { id: { in: [publicClubId, privateClubId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [freeUserId, clubOwnerId] } },
  });
  await prisma.$disconnect();
});

describe('FREE Tier Reader Access - Core Guarantees', () => {
  describe('Club Joining (Public)', () => {
    it('should allow FREE user to join public club without any tier check', async () => {
      const response = await fetch(`${API_BASE}/api/clubs/${publicClubId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('ACTIVE');
    });

    it('should confirm FREE user is now an active member', async () => {
      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId: publicClubId,
            userId: freeUserId,
          },
        },
      });

      expect(membership).not.toBeNull();
      expect(membership?.status).toBe('ACTIVE');
    });
  });

  describe('Club Joining (Private)', () => {
    it('should allow FREE user to request to join private club', async () => {
      const response = await fetch(`${API_BASE}/api/clubs/${privateClubId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      // May return 201 with PENDING status or 200 depending on implementation
      expect([200, 201]).toContain(response.status);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Poll Voting', () => {
    it('should allow FREE user to vote in club polls', async () => {
      // Get poll options
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      const response = await fetch(`${API_BASE}/api/polls/${pollId}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeUserToken}`,
        },
        body: JSON.stringify({
          optionId: poll?.options[0]?.id,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should confirm vote was recorded', async () => {
      const vote = await prisma.vote.findFirst({
        where: {
          pollId,
          userId: freeUserId,
        },
      });

      expect(vote).not.toBeNull();
    });
  });

  describe('Club Messaging', () => {
    beforeAll(async () => {
      // Add FREE user to thread
      await prisma.threadMember.create({
        data: {
          threadId,
          userId: freeUserId,
        },
      });
    });

    it('should allow FREE user to post messages in club', async () => {
      const response = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeUserToken}`,
        },
        body: JSON.stringify({
          content: 'Test message from FREE tier user - no paywall!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should confirm message was posted', async () => {
      const message = await prisma.message.findFirst({
        where: {
          threadId,
          senderId: freeUserId,
        },
      });

      expect(message).not.toBeNull();
      expect(message?.content).toContain('no paywall');
    });
  });

  describe('Pitch Discovery', () => {
    let testPitchId: string;

    beforeAll(async () => {
      // Create test author with a pitch
      const testAuthor = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: 'test-author-for-pitch@test.com',
          name: 'Test Author',
          roles: ['AUTHOR'],
          tier: 'FREE',
          accountStatus: 'ACTIVE',
        },
      });

      await prisma.authorProfile.create({
        data: {
          userId: testAuthor.id,
          penName: 'Test Author',
          bio: 'Test bio',
          verificationStatus: 'VERIFIED',
        },
      });

      const pitch = await prisma.pitch.create({
        data: {
          authorId: testAuthor.id,
          title: 'Test Pitch for Discovery',
          synopsis: 'A test pitch that FREE users should be able to view',
          genres: ['FICTION'],
          status: 'PUBLISHED',
          authorTier: 'FREE',
        },
      });
      testPitchId = pitch.id;
    });

    it('should allow FREE user to view pitches without tier check', async () => {
      const response = await fetch(`${API_BASE}/api/pitches/${testPitchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Test Pitch for Discovery');
    });

    it('should allow FREE user to browse pitch discovery feed', async () => {
      const response = await fetch(`${API_BASE}/api/pitches?status=PUBLISHED`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Author Profile Viewing', () => {
    let testAuthorId: string;

    beforeAll(async () => {
      const testAuthor = await prisma.user.findFirst({
        where: { email: 'test-author-for-pitch@test.com' },
      });
      testAuthorId = testAuthor!.id;
    });

    it('should allow FREE user to view author profiles', async () => {
      const response = await fetch(`${API_BASE}/api/authors/${testAuthorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testAuthorId);
    });
  });

  describe('Points System', () => {
    it('should allow FREE user to earn points (from club join)', async () => {
      // Points should have been awarded when user joined club
      const user = await prisma.user.findUnique({
        where: { id: freeUserId },
        select: { points: true },
      });

      // User should have points from joining club
      expect(user?.points).toBeGreaterThan(0);
    });

    it('should show FREE user their points balance', async () => {
      const response = await fetch(`${API_BASE}/api/points/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.data.points).toBe('number');
    });
  });

  describe('Rewards Redemption', () => {
    beforeAll(async () => {
      // Give user enough points to redeem a reward
      await prisma.user.update({
        where: { id: freeUserId },
        data: { points: 1000 },
      });
    });

    it('should allow FREE user to view available rewards', async () => {
      const response = await fetch(`${API_BASE}/api/rewards/catalog`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${freeUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should allow FREE user to redeem rewards with sufficient points', async () => {
      const response = await fetch(`${API_BASE}/api/rewards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeUserToken}`,
        },
        body: JSON.stringify({
          rewardType: 'BADGE',
          badgeCode: 'BOOKWORM',
          pointsCost: 100,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Club Creation (FREE Tier)', () => {
    it('should allow FREE user to create clubs without tier requirement', async () => {
      const response = await fetch(`${API_BASE}/api/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freeUserToken}`,
        },
        body: JSON.stringify({
          name: 'FREE User Created Club',
          description: 'Proving FREE users can host clubs',
          isPublic: true,
          joinRules: 'OPEN',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Cleanup
      if (data.data?.id) {
        await prisma.membership.deleteMany({ where: { clubId: data.data.id } });
        await prisma.club.delete({ where: { id: data.data.id } });
      }
    });
  });
});
