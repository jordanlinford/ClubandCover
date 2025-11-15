import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestMessageThread, createTestRewardItem } from './helpers/testFactories.js';
import { createTestUser, deleteTestUser, getAuthHeaders } from './helpers/auth.js';
import { prisma } from '../lib/prisma.js';

/**
 * Integration tests for universal suspension enforcement
 * Validates that SUSPENDED users are blocked from all mutating operations
 * and that ACTIVE users can perform them normally
 */

const API_BASE = `http://localhost:${process.env.PORT || 5000}`;

// Test user credentials
let activeUserId: string;
let suspendedUserId: string;
let activeUserToken: string;
let suspendedUserToken: string;

beforeAll(async () => {
  // Generate unique emails for test repeatability
  const testRunId = Date.now();

  // Create active user with AUTHOR role
  const activeUser = await createTestUser({
    email: `active-suspension-${testRunId}@test.com`,
    name: 'Active Test User',
    roles: ['READER', 'AUTHOR'],
    tier: 'FREE',
    accountStatus: 'ACTIVE',
  });
  activeUserId = activeUser.user.id;
  activeUserToken = activeUser.token;

  // Create verified author profile for active user (needed for pitches)
  await prisma.authorProfile.create({
    data: {
      userId: activeUserId,
      penName: 'Active Author',
      bio: 'Test bio',
      verificationStatus: 'VERIFIED',
    },
  });

  // Create suspended user
  const suspendedUser = await createTestUser({
    email: `suspended-${testRunId}@test.com`,
    name: 'Suspended Test User',
    roles: ['READER', 'AUTHOR'],
    tier: 'FREE',
    accountStatus: 'SUSPENDED',
  });
  suspendedUserId = suspendedUser.user.id;
  suspendedUserToken = suspendedUser.token;

  // Update suspended user with suspension metadata
  await prisma.user.update({
    where: { id: suspendedUserId },
    data: {
      suspendedAt: new Date(),
      suspendedBy: activeUserId,
    },
  });

  // Create verified author profile for suspended user
  await prisma.authorProfile.create({
    data: {
      userId: suspendedUserId,
      penName: 'Suspended Author',
      bio: 'Test bio',
      verificationStatus: 'VERIFIED',
    },
  });
});

afterAll(async () => {
  // Use shared cleanup utilities
  await deleteTestUser(activeUserId);
  await deleteTestUser(suspendedUserId);
  await prisma.$disconnect();
});

describe('Universal Suspension Enforcement', () => {
  describe('Messages', () => {
    let threadId: string;

    beforeAll(async () => {
      // Create a test thread with both users as members
      const thread = await createTestMessageThread({
        userId1: activeUserId,
        userId2: suspendedUserId,
      });
      threadId = thread.id;
    });

    it('should allow ACTIVE user to send messages', async () => {
      const response = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeUserToken}`,
        },
        body: JSON.stringify({ content: 'Test message from active user' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should block SUSPENDED user from sending messages', async () => {
      const response = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
        body: JSON.stringify({ content: 'Test message from suspended user' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Pitches', () => {
    it('should allow ACTIVE user to create pitches', async () => {
      const response = await fetch(`${API_BASE}/api/pitches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeUserToken}`,
        },
        body: JSON.stringify({
          bookTitle: 'Test Book',
          bookBlurb: 'A test book for integration testing',
          authorBio: 'Test author bio',
          targetGenres: ['FICTION'],
          whyGoodFit: 'Because it tests well',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should block SUSPENDED user from creating pitches', async () => {
      const response = await fetch(`${API_BASE}/api/pitches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
        body: JSON.stringify({
          bookTitle: 'Test Book',
          bookBlurb: 'A test book for integration testing',
          authorBio: 'Test author bio',
          targetGenres: ['FICTION'],
          whyGoodFit: 'Because it tests well',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Clubs', () => {
    it('should allow ACTIVE user to create clubs', async () => {
      const response = await fetch(`${API_BASE}/api/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeUserToken}`,
        },
        body: JSON.stringify({
          name: 'Test Club for Active User',
          description: 'A test club',
          preferredGenres: ['FICTION'],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should block SUSPENDED user from creating clubs', async () => {
      const response = await fetch(`${API_BASE}/api/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
        body: JSON.stringify({
          name: 'Test Club for Suspended User',
          description: 'A test club',
          preferredGenres: ['FICTION'],
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Swaps', () => {
    it('should allow ACTIVE user to create swaps', async () => {
      const response = await fetch(`${API_BASE}/api/swaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeUserToken}`,
        },
        body: JSON.stringify({
          recipientId: suspendedUserId,
          bookTitle: 'Test Book for Swap',
          message: 'Would you like to swap?',
        }),
      });

      // May fail due to business logic (e.g., recipient suspended), but should not fail with 403
      expect(response.status).not.toBe(403);
    });

    it('should block SUSPENDED user from creating swaps', async () => {
      const response = await fetch(`${API_BASE}/api/swaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
        body: JSON.stringify({
          recipientId: activeUserId,
          bookTitle: 'Test Book for Swap',
          message: 'Would you like to swap?',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Rewards', () => {
    let rewardItemId: string;

    beforeAll(async () => {
      // Create a test reward item
      const reward = await createTestRewardItem({
        name: 'Test Reward',
        pointsCost: 100,
        copiesAvailable: 10,
      });
      rewardItemId = reward.id;

      // Give active user enough points
      await prisma.user.update({
        where: { id: activeUserId },
        data: { points: 200 },
      });

      // Give suspended user enough points
      await prisma.user.update({
        where: { id: suspendedUserId },
        data: { points: 200 },
      });
    });

    it('should allow ACTIVE user to redeem rewards', async () => {
      const response = await fetch(`${API_BASE}/api/redemptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeUserToken}`,
        },
        body: JSON.stringify({
          rewardItemId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should block SUSPENDED user from redeeming rewards', async () => {
      const response = await fetch(`${API_BASE}/api/redemptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
        body: JSON.stringify({
          rewardItemId,
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('GET requests (read operations)', () => {
    it('should allow SUSPENDED user to read data (GET requests)', async () => {
      const response = await fetch(`${API_BASE}/api/user/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.accountStatus).toBe('SUSPENDED');
    });
  });

  describe('Account recovery flows', () => {
    let disabledUserId: string;
    let disabledUserToken: string;

    beforeAll(async () => {
      // Generate unique email for test repeatability
      const testRunId = Date.now();
      
      // Create a disabled user
      const disabledUser = await createTestUser({
        email: `disabled-recovery-${testRunId}@test.com`,
        name: 'Disabled Test User',
        roles: ['READER'],
        tier: 'FREE',
        accountStatus: 'DISABLED',
      });
      disabledUserId = disabledUser.user.id;
      disabledUserToken = disabledUser.token;

      // Update with disabled metadata
      await prisma.user.update({
        where: { id: disabledUserId },
        data: { disabledAt: new Date() },
      });
    });

    afterAll(async () => {
      await deleteTestUser(disabledUserId);
    });

    it('should allow DISABLED user to reactivate their account', async () => {
      const response = await fetch(`${API_BASE}/api/me/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${disabledUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('reactivated');
    });

    it('should block DISABLED user from other mutating operations', async () => {
      // First disable the user again
      await prisma.user.update({
        where: { id: disabledUserId },
        data: { accountStatus: 'DISABLED', disabledAt: new Date() },
      });

      // Try to create a club (should be blocked)
      const response = await fetch(`${API_BASE}/api/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${disabledUserToken}`,
        },
        body: JSON.stringify({
          name: 'Test Club for Disabled User',
          description: 'Should not be created',
          preferredGenres: ['FICTION'],
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_DISABLED');
    });

    it('should block SUSPENDED user from reactivating (only admins can unsuspend)', async () => {
      const response = await fetch(`${API_BASE}/api/me/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${suspendedUserToken}`,
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('ACCOUNT_SUSPENDED');
    });
  });
});
