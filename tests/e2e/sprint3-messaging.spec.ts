import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000';

// Test user credentials
const users = {
  user1: {
    email: 'test-user1@example.com',
    password: 'TestPass123!',
    name: 'Test User 1',
    tier: 'FREE',
  },
  user2: {
    email: 'test-user2@example.com',
    password: 'TestPass123!',
    name: 'Test User 2',
    tier: 'FREE',
  },
  staff: {
    email: 'test-staff@example.com',
    password: 'TestPass123!',
    name: 'Staff User',
    tier: 'STAFF',
  },
};

// Helper: Create or get test user
async function getOrCreateTestUser(userData: typeof users.user1) {
  const user = await prisma.user.upsert({
    where: { email: userData.email },
    update: {
      name: userData.name,
      tier: userData.tier,
    },
    create: {
      id: `test-${Date.now()}-${Math.random()}`,
      email: userData.email,
      name: userData.name,
      tier: userData.tier,
      aiCallsToday: 0,
      aiCallsResetAt: new Date(),
    },
  });
  return user;
}

// Helper: Get mock auth token
function getMockToken(userId: string): string {
  return `test-token-${userId}`;
}

// Helper: Make authenticated API request
async function apiRequest(
  path: string,
  options: { method?: string; body?: any; token?: string } = {}
) {
  const { method = 'GET', body, token } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return { response, data, status: response.status };
}

// Cleanup before tests
test.beforeAll(async () => {
  console.log('🧹 Cleaning up test data...');
  
  // Delete test data in correct order (respecting foreign keys)
  await prisma.moderationReport.deleteMany({
    where: {
      reporter: {
        email: {
          contains: 'test-',
        },
      },
    },
  });
  
  await prisma.message.deleteMany({
    where: {
      sender: {
        email: {
          contains: 'test-',
        },
      },
    },
  });
  
  await prisma.threadMember.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test-',
        },
      },
    },
  });
  
  await prisma.messageThread.deleteMany({});
  
  console.log('✅ Cleanup complete');
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ============================================================================
// SCENARIO 1: Direct Message Thread Creation and Messaging
// ============================================================================
test.describe('Sprint-3 Scenario 1: DM Thread Creation', () => {
  test('should create DM thread and exchange messages', async () => {
    console.log('\n📝 Scenario 1: Direct Message Thread Creation and Messaging');
    
    // Setup users
    const user1 = await getOrCreateTestUser(users.user1);
    const user2 = await getOrCreateTestUser(users.user2);
    const token1 = getMockToken(user1.id);
    const token2 = getMockToken(user2.id);
    
    console.log(`  Created users: ${user1.id}, ${user2.id}`);
    
    // Step 1: Create DM thread
    const { data: threadData, status: createStatus } = await apiRequest('/api/threads', {
      method: 'POST',
      token: token1,
      body: {
        type: 'DIRECT',
        memberIds: [user2.id],
      },
    });
    
    console.log(`  Step 1: Create thread - Status ${createStatus}`);
    expect(createStatus).toBe(200);
    expect(threadData.success).toBe(true);
    expect(threadData.data.type).toBe('DIRECT');
    
    const threadId = threadData.data.id;
    
    // Step 2: Send message from user1
    const { data: msgData, status: sendStatus } = await apiRequest(
      `/api/threads/${threadId}/messages`,
      {
        method: 'POST',
        token: token1,
        body: { content: 'Hello from user1!' },
      }
    );
    
    console.log(`  Step 2: Send message - Status ${sendStatus}`);
    expect(sendStatus).toBe(200);
    expect(msgData.success).toBe(true);
    
    // Step 3: User1 checks threads (should have unreadCount=0)
    const { data: user1Threads } = await apiRequest('/api/threads/mine', { token: token1 });
    
    console.log(`  Step 3: User1 threads - ${user1Threads.data.length} threads`);
    const user1Thread = user1Threads.data.find((t: any) => t.id === threadId);
    expect(user1Thread).toBeDefined();
    expect(user1Thread.unreadCount).toBe(0);
    
    // Step 4: User2 checks threads (should have unreadCount=1)
    const { data: user2Threads } = await apiRequest('/api/threads/mine', { token: token2 });
    
    const user2Thread = user2Threads.data.find((t: any) => t.id === threadId);
    console.log(`  Step 4: User2 unread count - ${user2Thread?.unreadCount}`);
    expect(user2Thread.unreadCount).toBe(1);
    
    // Step 5: User2 reads messages
    const { data: messages } = await apiRequest(`/api/threads/${threadId}/messages`, {
      token: token2,
    });
    
    console.log(`  Step 5: Read messages - ${messages.data.messages.length} messages`);
    expect(messages.data.messages[0].content).toBe('Hello from user1!');
    
    // Step 6: User2 replies
    await apiRequest(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      token: token2,
      body: { content: 'Hi back!' },
    });
    
    // Step 7: User2 marks as read
    await apiRequest(`/api/threads/${threadId}/read`, {
      method: 'POST',
      token: token2,
    });
    
    // Step 8: Verify unread count is 0
    const { data: user2ThreadsAfter } = await apiRequest('/api/threads/mine', { token: token2 });
    const user2ThreadAfter = user2ThreadsAfter.data.find((t: any) => t.id === threadId);
    
    console.log(`  Step 8: After mark read - unread count ${user2ThreadAfter.unreadCount}`);
    expect(user2ThreadAfter.unreadCount).toBe(0);
    
    console.log('  ✅ Scenario 1 PASSED\n');
  });
});

// ============================================================================
// SCENARIO 3: Rate Limiting (31st Message Blocked)
// ============================================================================
test.describe('Sprint-3 Scenario 3: Rate Limiting', () => {
  test('should block 31st message with 429', async () => {
    console.log('\n📝 Scenario 3: Rate Limiting (31st Message Blocked)');
    
    const user1 = await getOrCreateTestUser(users.user1);
    const user2 = await getOrCreateTestUser(users.user2);
    const token1 = getMockToken(user1.id);
    
    // Create thread
    const { data: threadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: token1,
      body: { type: 'DIRECT', memberIds: [user2.id] },
    });
    const threadId = threadData.data.id;
    
    console.log(`  Created thread ${threadId}`);
    console.log('  Sending 30 messages rapidly...');
    
    // Send 30 messages
    for (let i = 1; i <= 30; i++) {
      const { status } = await apiRequest(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        token: token1,
        body: { content: `Message ${i}` },
      });
      
      if (status !== 200) {
        console.error(`  ❌ FAILED: Message ${i} returned status ${status} (expected 200)`);
        throw new Error(`Message ${i} failed with status ${status}`);
      }
    }
    
    console.log('  ✅ All 30 messages sent successfully');
    
    // Try 31st message
    console.log('  Attempting 31st message...');
    const { data: rateLimitData, status: rateLimitStatus } = await apiRequest(
      `/api/threads/${threadId}/messages`,
      {
        method: 'POST',
        token: token1,
        body: { content: 'Message 31 - should be blocked' },
      }
    );
    
    console.log(`  31st message status: ${rateLimitStatus}`);
    console.log(`  Response:`, JSON.stringify(rateLimitData, null, 2));
    
    expect(rateLimitStatus).toBe(429);
    expect(rateLimitData.code).toBe('MESSAGE_RATE_LIMIT');
    expect(rateLimitData.error).toContain('Rate limit exceeded');
    expect(rateLimitData.retryAfter).toBeGreaterThan(0);
    
    console.log('  ✅ Scenario 3 PASSED\n');
  });
});

// ============================================================================
// SCENARIO 4: Profanity Filter Rejection
// ============================================================================
test.describe('Sprint-3 Scenario 4: Profanity Filter', () => {
  test('should reject messages with profanity', async () => {
    console.log('\n📝 Scenario 4: Profanity Filter Rejection');
    
    const user1 = await getOrCreateTestUser(users.user1);
    const user2 = await getOrCreateTestUser(users.user2);
    const token1 = getMockToken(user1.id);
    
    // Create thread
    const { data: threadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: token1,
      body: { type: 'DIRECT', memberIds: [user2.id] },
    });
    const threadId = threadData.data.id;
    
    // Clean message should work
    console.log('  Sending clean message...');
    const { status: cleanStatus } = await apiRequest(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      token: token1,
      body: { content: 'This is a clean message' },
    });
    
    console.log(`  Clean message status: ${cleanStatus}`);
    expect(cleanStatus).toBe(200);
    
    // Profane message should be blocked
    console.log('  Sending profane message...');
    const { data: profaneData, status: profaneStatus } = await apiRequest(
      `/api/threads/${threadId}/messages`,
      {
        method: 'POST',
        token: token1,
        body: { content: 'This message contains fuck word' },
      }
    );
    
    console.log(`  Profane message status: ${profaneStatus}`);
    console.log(`  Response:`, JSON.stringify(profaneData, null, 2));
    
    expect(profaneStatus).toBe(400);
    expect(profaneData.code).toBe('MESSAGE_PROFANITY');
    expect(profaneData.error).toContain('inappropriate content');
    
    // Verify profane message not saved
    const { data: messages } = await apiRequest(`/api/threads/${threadId}/messages`, {
      token: token1,
    });
    
    const messageContents = messages.data.messages.map((m: any) => m.content);
    console.log(`  Messages in thread: ${messageContents.length}`);
    expect(messageContents).not.toContain('This message contains fuck word');
    
    console.log('  ✅ Scenario 4 PASSED\n');
  });
});

// ============================================================================
// SCENARIO 6: Message Reporting Workflow
// ============================================================================
test.describe('Sprint-3 Scenario 6: Message Reporting', () => {
  test('should allow users to report messages', async () => {
    console.log('\n📝 Scenario 6: Message Reporting Workflow');
    
    const user1 = await getOrCreateTestUser(users.user1);
    const user2 = await getOrCreateTestUser(users.user2);
    const token1 = getMockToken(user1.id);
    const token2 = getMockToken(user2.id);
    
    // Create thread and send message
    const { data: threadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: token1,
      body: { type: 'DIRECT', memberIds: [user2.id] },
    });
    const threadId = threadData.data.id;
    
    const { data: msgData } = await apiRequest(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      token: token1,
      body: { content: 'Inappropriate but passes filters' },
    });
    const messageId = msgData.data.id;
    
    console.log(`  Created message ${messageId}`);
    
    // User2 reports message
    console.log('  User2 reporting message...');
    const { data: reportData, status: reportStatus } = await apiRequest(
      `/api/messages/${messageId}/report`,
      {
        method: 'POST',
        token: token2,
        body: { reason: 'This is spam and misleading content that violates standards' },
      }
    );
    
    console.log(`  Report status: ${reportStatus}`);
    expect(reportStatus).toBe(200);
    expect(reportData.success).toBe(true);
    expect(reportData.data.status).toBe('PENDING');
    
    // Try duplicate report
    console.log('  Attempting duplicate report...');
    const { status: duplicateStatus } = await apiRequest(`/api/messages/${messageId}/report`, {
      method: 'POST',
      token: token2,
      body: { reason: 'Duplicate report' },
    });
    
    console.log(`  Duplicate report status: ${duplicateStatus}`);
    expect(duplicateStatus).toBe(400);
    
    // Verify message still visible and not flagged
    const { data: messages } = await apiRequest(`/api/threads/${threadId}/messages`, {
      token: token1,
    });
    
    const reportedMsg = messages.data.messages.find((m: any) => m.id === messageId);
    console.log(`  Message flagged: ${!!reportedMsg.flaggedAt}`);
    expect(reportedMsg.flaggedAt).toBeNull();
    
    console.log('  ✅ Scenario 6 PASSED\n');
  });
});

// ============================================================================
// SCENARIO 7: STAFF Moderation Review Actions
// ============================================================================
test.describe('Sprint-3 Scenario 7: STAFF Moderation', () => {
  test('should allow STAFF to review reports and flag messages', async () => {
    console.log('\n📝 Scenario 7: STAFF Moderation Review Actions');
    
    const user1 = await getOrCreateTestUser(users.user1);
    const user2 = await getOrCreateTestUser(users.user2);
    const staff = await getOrCreateTestUser(users.staff);
    const token1 = getMockToken(user1.id);
    const token2 = getMockToken(user2.id);
    const tokenStaff = getMockToken(staff.id);
    
    // Create thread, message, and report
    const { data: threadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: token1,
      body: { type: 'DIRECT', memberIds: [user2.id] },
    });
    const threadId = threadData.data.id;
    
    const { data: msgData } = await apiRequest(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      token: token1,
      body: { content: 'Message to be reported and flagged' },
    });
    const messageId = msgData.data.id;
    
    await apiRequest(`/api/messages/${messageId}/report`, {
      method: 'POST',
      token: token2,
      body: { reason: 'This violates community guidelines' },
    });
    
    console.log('  Created report for testing');
    
    // Non-STAFF cannot access queue
    console.log('  Testing non-STAFF access...');
    const { status: user1QueueStatus } = await apiRequest('/api/moderation/queue', {
      token: token1,
    });
    
    console.log(`  Non-STAFF queue access status: ${user1QueueStatus}`);
    expect(user1QueueStatus).toBe(403);
    
    // STAFF can access queue
    console.log('  STAFF accessing queue...');
    const { data: queueData, status: queueStatus } = await apiRequest('/api/moderation/queue', {
      token: tokenStaff,
    });
    
    console.log(`  STAFF queue status: ${queueStatus}`);
    console.log(`  Queue size: ${queueData.data.length}`);
    expect(queueStatus).toBe(200);
    expect(queueData.data.length).toBeGreaterThan(0);
    
    const report = queueData.data[0];
    expect(report.status).toBe('PENDING');
    expect(report.message.content).toBe('Message to be reported and flagged');
    
    // STAFF flags message
    console.log('  STAFF flagging message...');
    const { status: flagStatus } = await apiRequest('/api/moderation/review', {
      method: 'POST',
      token: tokenStaff,
      body: {
        reportId: report.id,
        action: 'FLAG',
      },
    });
    
    console.log(`  Flag action status: ${flagStatus}`);
    expect(flagStatus).toBe(200);
    
    // Verify message is flagged
    const { data: messages } = await apiRequest(`/api/threads/${threadId}/messages`, {
      token: token1,
    });
    
    const flaggedMsg = messages.data.messages.find((m: any) => m.id === messageId);
    console.log(`  Message flaggedAt: ${!!flaggedMsg.flaggedAt}`);
    expect(flaggedMsg.flaggedAt).not.toBeNull();
    
    // Verify report no longer in queue
    const { data: queueAfter } = await apiRequest('/api/moderation/queue', { token: tokenStaff });
    const stillInQueue = queueAfter.data.find((r: any) => r.id === report.id);
    console.log(`  Report still in queue: ${!!stillInQueue}`);
    expect(stillInQueue).toBeUndefined();
    
    console.log('  ✅ Scenario 7 PASSED\n');
  });
});

console.log('\n🧪 Sprint-3 E2E Test Suite Ready\n');
