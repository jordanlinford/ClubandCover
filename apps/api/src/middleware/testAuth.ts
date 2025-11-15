import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Test-only authentication middleware
 * Accepts tokens in format: `test-token-${userId}`
 * Only used in test environment - never in production
 */
export async function testAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    // No auth header - continue as unauthenticated request
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  // Check if it's a test token
  if (token.startsWith('test-token-')) {
    const userId = token.replace('test-token-', '');

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          tier: true,
          accountStatus: true,
        },
      });

      if (user) {
        // Attach user to request
        (request as any).user = user;
        (request as any).userId = user.id;
      }
    } catch (error) {
      // Invalid token - continue as unauthenticated
      return;
    }
  }
}

/**
 * Test-only middleware to require active account
 * Simplified version of production requireActiveAccount
 */
export async function testRequireActiveAccount(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;

  if (user && user.accountStatus && !['ACTIVE', 'DISABLED'].includes(user.accountStatus)) {
    reply.code(403).send({
      success: false,
      error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' },
    });
  }
}
