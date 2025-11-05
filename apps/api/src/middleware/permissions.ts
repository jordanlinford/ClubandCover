import { FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if the authenticated user is a co-host (OWNER or ADMIN) of a club
 * 
 * Usage:
 *   app.post('/api/clubs/:clubId/polls', { preHandler: [requireAuth, requireCoHost] }, handler)
 */
export async function requireCoHost(
  request: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const clubId = request.params.clubId;

  if (!userId) {
    return reply.code(401).send({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!clubId) {
    return reply.code(400).send({
      success: false,
      error: 'Club ID required',
    });
  }

  // Check membership
  const membership = await prisma.membership.findUnique({
    where: {
      clubId_userId: {
        userId,
        clubId,
      },
    },
  });

  if (!membership) {
    return reply.code(403).send({
      success: false,
      error: 'You are not a member of this club',
    });
  }

  if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
    return reply.code(403).send({
      success: false,
      error: 'Only club owners and admins can perform this action',
    });
  }

  // Attach club info to request for use in handler
  request.clubMembership = membership;
}

/**
 * Middleware to check if the authenticated user is the owner of a club
 */
export async function requireClubOwner(
  request: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const clubId = request.params.clubId;

  if (!userId) {
    return reply.code(401).send({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!clubId) {
    return reply.code(400).send({
      success: false,
      error: 'Club ID required',
    });
  }

  // Check membership
  const membership = await prisma.membership.findUnique({
    where: {
      clubId_userId: {
        userId,
        clubId,
      },
    },
  });

  if (!membership || membership.role !== 'OWNER') {
    return reply.code(403).send({
      success: false,
      error: 'Only the club owner can perform this action',
    });
  }

  // Attach club info to request for use in handler
  request.clubMembership = membership;
}

/**
 * Middleware to check if the authenticated user is a member of a club
 */
export async function requireClubMember(
  request: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const clubId = request.params.clubId;

  if (!userId) {
    return reply.code(401).send({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!clubId) {
    return reply.code(400).send({
      success: false,
      error: 'Club ID required',
    });
  }

  // Check membership
  const membership = await prisma.membership.findUnique({
    where: {
      clubId_userId: {
        userId,
        clubId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    return reply.code(403).send({
      success: false,
      error: 'You must be an active member of this club',
    });
  }

  // Attach club info to request for use in handler
  request.clubMembership = membership;
}

// Extend FastifyRequest type to include clubMembership
declare module 'fastify' {
  interface FastifyRequest {
    clubMembership?: any;
  }
}
