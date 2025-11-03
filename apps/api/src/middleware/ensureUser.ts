import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export async function ensureUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return;
  }

  try {
    await prisma.user.upsert({
      where: { id: request.user.id },
      update: {
        email: request.user.email || '',
      },
      create: {
        id: request.user.id,
        email: request.user.email || '',
        name: request.user.email?.split('@')[0] || 'User',
      },
    });
  } catch (error) {
    request.log.error('Failed to ensure user:', error);
  }
}
