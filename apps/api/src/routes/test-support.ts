import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Test Support Routes
 * 
 * These routes are ONLY available when NODE_ENV === 'test'
 * They provide test authentication capabilities for automated testing
 */
export async function testSupportRoutes(app: FastifyInstance) {
  // Guard: Only enable in test environment
  if (process.env.NODE_ENV !== 'test') {
    app.log.info('[TEST] Test support routes disabled (not in test environment)');
    return;
  }

  app.log.info('[TEST] Test support routes enabled');

  /**
   * POST /test/auth/create-session
   * 
   * Creates a test user and returns a mock session token for testing
   * This bypasses Supabase authentication entirely for test purposes
   */
  app.post('/test/auth/create-session', async (request, reply) => {
    const { email, name, tier } = request.body as {
      email?: string;
      name?: string;
      tier?: 'FREE' | 'PRO_AUTHOR' | 'PRO_CLUB' | 'PUBLISHER';
    };

    // Generate unique test email if not provided
    const testEmail = email || `test_${Date.now()}@example.com`;
    const testName = name || 'Test User';
    const testTier = tier || 'FREE';

    try {
      // Create or update test user in database
      const user = await prisma.user.upsert({
        where: { email: testEmail },
        update: {
          name: testName,
          tier: testTier,
          aiCallsToday: 0,
          aiCallsResetAt: new Date(),
        },
        create: {
          id: `test-user-${Date.now()}`,
          email: testEmail,
          name: testName,
          tier: testTier,
          aiCallsToday: 0,
          aiCallsResetAt: new Date(),
        },
      });

      // Create a mock JWT token for testing
      // In a real scenario, this would be a proper JWT, but for testing
      // we can use a simple format that our middleware will recognize
      const mockToken = `test-token-${user.id}`;

      // Return session info
      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            tier: user.tier,
          },
          token: mockToken,
          message: 'Test session created - use this token in Authorization header',
        },
      });
    } catch (error) {
      app.log.error({ error }, '[TEST] Failed to create test session');
      return reply.status(500).send({
        success: false,
        error: 'Failed to create test session',
      });
    }
  });

  /**
   * POST /test/auth/cleanup
   * 
   * Removes all test users from the database
   * Useful for cleaning up after test runs
   */
  app.post('/test/auth/cleanup', async (request, reply) => {
    try {
      // Delete all users with test emails
      const result = await prisma.user.deleteMany({
        where: {
          OR: [
            { email: { startsWith: 'test_' } },
            { email: { endsWith: '@example.com' } },
            { id: { startsWith: 'test-user-' } },
          ],
        },
      });

      return reply.send({
        success: true,
        data: {
          deleted: result.count,
          message: `Cleaned up ${result.count} test users`,
        },
      });
    } catch (error) {
      app.log.error({ error }, '[TEST] Failed to cleanup test users');
      return reply.status(500).send({
        success: false,
        error: 'Failed to cleanup test users',
      });
    }
  });

  /**
   * GET /test/auth/status
   * 
   * Returns the current test authentication status
   */
  app.get('/test/auth/status', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        enabled: true,
        environment: process.env.NODE_ENV,
        message: 'Test authentication is available',
      },
    });
  });
}
