import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

const RATE_LIMITS = {
  FREE: 10,
  PRO_AUTHOR: 50,
  PRO_CLUB: 50,
  PUBLISHER: 999,
};

export async function aiRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user?.id;

  if (!userId) {
    return reply.code(401).send({
      success: false,
      error: 'Authentication required for AI features',
    });
  }

  // Get user with tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      aiCallsToday: true,
      aiCallsResetAt: true,
    },
  });

  if (!user) {
    return reply.code(404).send({
      success: false,
      error: 'User not found',
    });
  }

  // Check if we need to reset the counter (daily reset)
  const now = new Date();
  const resetAt = new Date(user.aiCallsResetAt);
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  let callsToday = user.aiCallsToday;

  if (hoursSinceReset >= 24) {
    // Reset counter
    callsToday = 0;
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiCallsToday: 0,
        aiCallsResetAt: now,
      },
    });
  }

  // Check limit
  const limit = RATE_LIMITS[user.tier];

  if (callsToday >= limit) {
    return reply.code(429).send({
      success: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: `You have reached your daily AI limit for the ${user.tier} tier`,
        limit,
        used: callsToday,
        requiredTier: user.tier === 'FREE' ? 'PRO_AUTHOR' : user.tier,
        resetsAt: new Date(resetAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  }

  // Increment counter
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiCallsToday: callsToday + 1,
    },
  });
}
