import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

// Import to ensure FastifyRequest type augmentation is loaded
import '../middleware/auth.js';

/**
 * Middleware that requires email verification
 * Should be used after requireAuth middleware
 * Returns 403 if email is not verified
 * 
 * Example usage:
 *   app.post('/api/books', { preHandler: [requireAuth, requireEmailVerified] }, handler)
 */
export async function requireEmailVerified(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user?.id) {
    return reply.code(401).send({
      success: false,
      error: 'Authentication required',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    return reply.code(403).send({
      success: false,
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
}
