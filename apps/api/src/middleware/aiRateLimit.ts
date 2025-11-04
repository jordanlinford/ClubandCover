import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

const RATE_LIMITS = {
  FREE: 10,
  PRO_AUTHOR: 50,
  PRO_CLUB: 50,
  PUBLISHER: 999,
  ANONYMOUS: 3, // Low limit for unauthenticated requests
};

// In-memory store for anonymous IP-based rate limiting
// Format: { ip: { count: number, resetAt: Date } }
const anonymousRateLimits: Map<string, { count: number; resetAt: Date }> = new Map();

export async function aiRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const now = new Date();

  // Authenticated user flow
  if (userId) {
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

    return; // Continue to route handler
  }

  // Anonymous user flow (IP-based rate limiting)
  const ip = request.ip || 'unknown';
  const limit = RATE_LIMITS.ANONYMOUS;

  // Get or create rate limit entry for this IP
  let ipLimit = anonymousRateLimits.get(ip);

  if (!ipLimit) {
    ipLimit = { count: 0, resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
    anonymousRateLimits.set(ip, ipLimit);
  }

  // Check if we need to reset (24 hours passed)
  if (now >= ipLimit.resetAt) {
    ipLimit.count = 0;
    ipLimit.resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // Check limit
  if (ipLimit.count >= limit) {
    return reply.code(429).send({
      success: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: `You have reached your daily AI limit. Sign in for higher limits.`,
        limit,
        used: ipLimit.count,
        requiredTier: 'FREE',
        resetsAt: ipLimit.resetAt.toISOString(),
      },
    });
  }

  // Increment counter
  ipLimit.count++;

  // Continue to route handler
}
