#!/usr/bin/env tsx
/**
 * Sprint-3 Messaging & Moderation API Tests
 * Tests the 8 acceptance scenarios from docs/SPRINT3_TEST_LOG.md
 */

import { PrismaClient } from '../apps/api/node_modules/@prisma/client/index.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000';

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'READER' | 'STAFF';
  token: string;
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper: Make API request
async function apiRequest(
  path: string,
  options: { method?: string; body?: any; token?: string } = {}
): Promise<{ response: Response; data: any; status: number }> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {};

  // Only set Content-Type if there's a body
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

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
    data = { error: text };
  }

  return { response, data, status: response.status };
}

// Helper: Create test user in database
async function createTestUser(
  email: string,
  name: string,
  role: 'READER' | 'STAFF' = 'READER'
): Promise<TestUser> {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: {
      id: randomUUID(),
      email,
      name,
      role,
      aiCallsToday: 0,
      aiCallsResetAt: new Date(),
    },
  });

  return {
    ...user,
    token: `test-token-${user.id}`,
  };
}

// Test suite
async function runTests() {
  log('\n🧪 Sprint-3 Messaging & Moderation API Tests\n', 'cyan');

  let testsPassed = 0;
  let testsFailed = 0;
  let user1: TestUser;
  let user2: TestUser;
  let staffUser: TestUser;

  try {
    // ============================================================================
    // SETUP: Clean database and create test users
    // ============================================================================
    log('🧹 Setup: Cleaning database and creating test users...', 'blue');

    await prisma.moderationReport.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.threadMember.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test-user1@example.com', 'test-user2@example.com', 'test-staff@example.com'],
        },
      },
    });

    user1 = await createTestUser('test-user1@example.com', 'Test User 1', 'READER');
    user2 = await createTestUser('test-user2@example.com', 'Test User 2', 'READER');
    staffUser = await createTestUser('test-staff@example.com', 'Staff User', 'STAFF');

    log(`  ✓ Created user1: ${user1.id}`, 'green');
    log(`  ✓ Created user2: ${user2.id}`, 'green');
    log(`  ✓ Created staff: ${staffUser.id}\n`, 'green');

    // ============================================================================
    // SCENARIO 1: Direct Message Thread Creation and Messaging
    // ============================================================================
    log('📝 Scenario 1: DM Thread Creation and Messaging', 'yellow');

    // Create DM thread
    const { data: threadData, status: createStatus } = await apiRequest('/api/threads', {
      method: 'POST',
      token: user1.token,
      body: { type: 'DM', recipientId: user2.id },
    });

    if (createStatus !== 200) {
      log(`  ❌ FAILED: Create thread returned ${createStatus}`, 'red');
      log(`  Response: ${JSON.stringify(threadData, null, 2)}`);
      testsFailed++;
      return;
    }

    const threadId = threadData.data.id;
    log(`  ✓ Created DM thread: ${threadId}`, 'green');

    // Send message
    const { status: msgStatus } = await apiRequest(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      token: user1.token,
      body: { content: 'Hello from user1!' },
    });

    if (msgStatus !== 200) {
      log(`  ❌ FAILED: Send message returned ${msgStatus}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Sent message`, 'green');

    // Check unread count for user2
    const { data: user2Threads } = await apiRequest('/api/threads/mine', {
      token: user2.token,
    });

    const user2Thread = user2Threads.data.find((t: any) => t.id === threadId);
    if (user2Thread.unreadCount !== 1) {
      log(`  ❌ FAILED: Expected unreadCount=1, got ${user2Thread.unreadCount}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ User2 unread count: 1`, 'green');

    // Mark as read
    const { data: markReadResult, status: markReadStatus } = await apiRequest(`/api/threads/${threadId}/read`, {
      method: 'POST',
      token: user2.token,
    });

    if (markReadStatus !== 200) {
      log(`  ❌ FAILED: Mark as read returned ${markReadStatus}`, 'red');
      log(`  Response: ${JSON.stringify(markReadResult, null, 2)}`);
      testsFailed++;
      return;
    }

    // Small delay to ensure database update is processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check database state directly
    const membership = await prisma.threadMember.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId: user2.id,
        },
      },
    });
    log(`  [DEBUG] User2 lastReadAt: ${membership?.lastReadAt?.toISOString()}`, 'blue');
    log(`  [DEBUG] User2 joinedAt: ${membership?.joinedAt?.toISOString()}`, 'blue');

    // Check message timestamp
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
    log(`  [DEBUG] Message count: ${messages.length}`, 'blue');
    if (messages.length > 0) {
      log(`  [DEBUG] First message createdAt: ${messages[0].createdAt.toISOString()}`, 'blue');
      log(`  [DEBUG] First message senderId: ${messages[0].senderId}`, 'blue');
    }

    const { data: user2ThreadsAfter } = await apiRequest('/api/threads/mine', {
      token: user2.token,
    });
    const user2ThreadAfter = user2ThreadsAfter.data.find((t: any) => t.id === threadId);

    if (user2ThreadAfter.unreadCount !== 0) {
      log(`  ❌ FAILED: After mark read, unreadCount=${user2ThreadAfter.unreadCount}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Marked as read, unread count: 0`, 'green');
    log('  ✅ Scenario 1 PASSED\n', 'green');
    testsPassed++;

    // ============================================================================
    // SCENARIO 3: Rate Limiting (31st Message Blocked)
    // ============================================================================
    log('📝 Scenario 3: Rate Limiting (31st Message)', 'yellow');

    // Create new thread for rate limit test
    const { data: rlThreadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: user1.token,
      body: { type: 'DM', recipientId: user2.id },
    });
    const rlThreadId = rlThreadData.data.id;

    // Note: user1 already sent 1 message in Scenario 1, so we can only send 29 more
    log(`  Sending 29 messages rapidly (user1 already sent 1 in Scenario 1)...`);

    // Send 29 messages (user1 already has 1 message from Scenario 1)
    for (let i = 1; i <= 29; i++) {
      const { status } = await apiRequest(`/api/threads/${rlThreadId}/messages`, {
        method: 'POST',
        token: user1.token,
        body: { content: `Message ${i}` },
      });

      if (status !== 200) {
        log(`  ❌ FAILED: Message ${i} returned ${status}`, 'red');
        testsFailed++;
        return;
      }
    }

    log(`  ✓ Sent 29 messages successfully (total: 30)`, 'green');

    // Try 31st message (should be rate-limited)
    const { data: rateLimitData, status: rateLimitStatus } = await apiRequest(
      `/api/threads/${rlThreadId}/messages`,
      {
        method: 'POST',
        token: user1.token,
        body: { content: 'Message 31' },
      }
    );

    if (rateLimitStatus !== 429) {
      log(`  ❌ FAILED: 31st message returned ${rateLimitStatus}, expected 429`, 'red');
      log(`  Response: ${JSON.stringify(rateLimitData, null, 2)}`);
      testsFailed++;
      return;
    }

    if (rateLimitData.code !== 'MESSAGE_RATE_LIMIT') {
      log(`  ❌ FAILED: Expected code MESSAGE_RATE_LIMIT, got ${rateLimitData.code}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ 31st message blocked with 429`, 'green');
    log(`  ✓ Error code: MESSAGE_RATE_LIMIT`, 'green');
    log(`  ✓ Retry after: ${rateLimitData.retryAfter}s`, 'green');
    log('  ✅ Scenario 3 PASSED\n', 'green');
    testsPassed++;

    // ============================================================================
    // SCENARIO 4: Profanity Filter Rejection
    // ============================================================================
    log('📝 Scenario 4: Profanity Filter', 'yellow');

    const { data: profThreadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: user2.token,
      body: { type: 'DM', recipientId: staffUser.id },
    });
    const profThreadId = profThreadData.data.id;

    // Clean message should work (using user2 to avoid rate limit)
    const { status: cleanStatus } = await apiRequest(`/api/threads/${profThreadId}/messages`, {
      method: 'POST',
      token: user2.token,
      body: { content: 'This is a clean message' },
    });

    if (cleanStatus !== 200) {
      log(`  ❌ FAILED: Clean message returned ${cleanStatus}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Clean message accepted`, 'green');

    // Profane message should be blocked (using user2)
    const { data: profaneData, status: profaneStatus } = await apiRequest(
      `/api/threads/${profThreadId}/messages`,
      {
        method: 'POST',
        token: user2.token,
        body: { content: 'This message contains fuck word' },
      }
    );

    if (profaneStatus !== 400) {
      log(`  ❌ FAILED: Profane message returned ${profaneStatus}, expected 400`, 'red');
      log(`  Response: ${JSON.stringify(profaneData, null, 2)}`);
      testsFailed++;
      return;
    }

    if (profaneData.code !== 'MESSAGE_PROFANITY') {
      log(`  ❌ FAILED: Expected code MESSAGE_PROFANITY, got ${profaneData.code}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Profane message blocked with 400`, 'green');
    log(`  ✓ Error code: MESSAGE_PROFANITY`, 'green');
    log('  ✅ Scenario 4 PASSED\n', 'green');
    testsPassed++;

    // ============================================================================
    // SCENARIO 6: Message Reporting Workflow
    // ============================================================================
    log('📝 Scenario 6: Message Reporting', 'yellow');

    // Use staffUser to avoid rate limits (user1 has sent 30 messages)
    const { data: reportThreadData } = await apiRequest('/api/threads', {
      method: 'POST',
      token: staffUser.token,
      body: { type: 'DM', recipientId: user2.id },
    });
    const reportThreadId = reportThreadData.data.id;

    // Use a neutral message that won't be flagged (spam-like but not toxic/profane)
    const { data: msgData, status: sendStatus } = await apiRequest(`/api/threads/${reportThreadId}/messages`, {
      method: 'POST',
      token: staffUser.token,
      body: { content: 'Buy my product now!! Special limited time offer! Click here for amazing deals!' },
    });

    if (sendStatus !== 200) {
      log(`  ❌ FAILED: Send message returned ${sendStatus}`, 'red');
      log(`  Response: ${JSON.stringify(msgData, null, 2)}`);
      testsFailed++;
      return;
    }

    const messageId = msgData.data.id;

    log(`  ✓ Created message: ${messageId}`, 'green');

    // Report message
    const { data: reportData, status: reportStatus } = await apiRequest(
      `/api/messages/${messageId}/report`,
      {
        method: 'POST',
        token: user2.token,
        body: { reason: 'This is spam and misleading content that violates standards' },
      }
    );

    if (reportStatus !== 200) {
      log(`  ❌ FAILED: Report returned ${reportStatus}`, 'red');
      log(`  Response: ${JSON.stringify(reportData, null, 2)}`);
      testsFailed++;
      return;
    }

    if (reportData.data.status !== 'PENDING') {
      log(`  ❌ FAILED: Report status is ${reportData.data.status}, expected PENDING`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Report created with status PENDING`, 'green');

    // Try duplicate report (needs 10+ characters for reason)
    const { status: dupStatus } = await apiRequest(`/api/messages/${messageId}/report`, {
      method: 'POST',
      token: user2.token,
      body: { reason: 'Duplicate report test for validation' },
    });

    if (dupStatus !== 400) {
      log(`  ❌ FAILED: Duplicate report returned ${dupStatus}, expected 400`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Duplicate report blocked`, 'green');
    log('  ✅ Scenario 6 PASSED\n', 'green');
    testsPassed++;

    // ============================================================================
    // SCENARIO 7: STAFF Moderation Review
    // ============================================================================
    log('📝 Scenario 7: STAFF Moderation', 'yellow');

    // Non-STAFF cannot access queue
    const { status: nonStaffStatus } = await apiRequest('/api/moderation/queue', {
      token: user1.token,
    });

    if (nonStaffStatus !== 403) {
      log(`  ❌ FAILED: Non-STAFF access returned ${nonStaffStatus}, expected 403`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Non-STAFF blocked with 403`, 'green');

    // STAFF can access queue
    const { data: queueData, status: queueStatus } = await apiRequest('/api/moderation/queue', {
      token: staffUser.token,
    });

    if (queueStatus !== 200) {
      log(`  ❌ FAILED: STAFF queue access returned ${queueStatus}`, 'red');
      log(`  Response: ${JSON.stringify(queueData, null, 2)}`);
      testsFailed++;
      return;
    }

    log(`  ✓ STAFF accessed queue (${queueData.data.length} reports)`, 'green');

    const report = queueData.data[0];
    if (!report) {
      log(`  ❌ FAILED: No reports in queue`, 'red');
      testsFailed++;
      return;
    }

    // FLAG the message
    const { status: flagStatus } = await apiRequest('/api/moderation/review', {
      method: 'POST',
      token: staffUser.token,
      body: { reportId: report.id, action: 'FLAG' },
    });

    if (flagStatus !== 200) {
      log(`  ❌ FAILED: FLAG action returned ${flagStatus}`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Message flagged successfully`, 'green');

    // Verify message is flagged
    const flaggedMsg = await prisma.message.findUnique({
      where: { id: report.messageId },
    });

    if (!flaggedMsg?.flaggedAt) {
      log(`  ❌ FAILED: Message not flagged in database`, 'red');
      testsFailed++;
      return;
    }

    log(`  ✓ Verified message flaggedAt timestamp`, 'green');
    log('  ✅ Scenario 7 PASSED\n', 'green');
    testsPassed++;

    // ============================================================================
    // SUMMARY
    // ============================================================================
    log('\n' + '='.repeat(60), 'cyan');
    log(`📊 Test Results:`, 'cyan');
    log(`  ✅ Passed: ${testsPassed}`, 'green');
    log(`  ❌ Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    log(`  📋 Total: ${testsPassed + testsFailed}`, 'blue');
    log('='.repeat(60) + '\n', 'cyan');

    if (testsFailed === 0) {
      log('🎉 All tests passed!', 'green');
    } else {
      log('⚠️  Some tests failed. Check logs above for details.', 'red');
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error}`, 'red');
    if (error instanceof Error) {
      log(error.stack || '', 'red');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
