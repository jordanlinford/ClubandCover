import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

function requireStaff(request: any, reply: any): boolean {
  if (!request.user || request.user.role !== 'STAFF') {
    reply.code(403).send({
      success: false,
      error: 'Access denied. STAFF only.',
    });
    return false;
  }
  return true;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Get platform stats
  fastify.get('/stats', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;
    
    try {
      const [totalUsers, totalClubs, totalPitches, activeSwaps] = await Promise.all([
        prisma.user.count(),
        prisma.club.count(),
        prisma.pitch.count(),
        prisma.swap.count({
          where: {
            status: {
              in: ['REQUESTED', 'ACCEPTED', 'DELIVERED'],
            },
          },
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          totalUsers,
          totalClubs,
          totalPitches,
          activeSwaps,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get stats',
      });
    }
  });

  // Get all users with details
  fastify.get('/users', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          points: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: {
              pitches: true,
              memberships: true,
              swapsRequested: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const usersWithBadges = await Promise.all(
        users.map(async (user) => {
          const badges = await prisma.userBadge.findMany({
            where: { userId: user.id },
            select: { code: true, awardedAt: true },
          });
          return { ...user, badges };
        })
      );

      return reply.send({
        success: true,
        data: usersWithBadges,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get users',
      });
    }
  });

  // Change user role
  fastify.patch<{
    Params: { userId: string };
  }>('/users/:userId/role', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const schema = z.object({
        role: z.enum(['READER', 'AUTHOR', 'CLUB_ADMIN', 'STAFF']),
      });
      const { role } = schema.parse(request.body);

      const user = await prisma.user.update({
        where: { id: request.params.userId },
        data: { role },
      });

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to update role',
      });
    }
  });

  // Change user tier
  fastify.patch<{
    Params: { userId: string };
  }>('/users/:userId/tier', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const schema = z.object({
        tier: z.enum(['FREE', 'PRO_AUTHOR', 'PRO_CLUB', 'PUBLISHER']),
      });
      const { tier } = schema.parse(request.body);

      const user = await prisma.user.update({
        where: { id: request.params.userId },
        data: { tier },
      });

      // Sync authorTier on all user's pitches for visibility boost algorithm
      await prisma.pitch.updateMany({
        where: { authorId: request.params.userId },
        data: { authorTier: tier },
      });

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to update tier',
      });
    }
  });

  // Get all clubs with details
  fastify.get('/clubs', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const clubs = await prisma.club.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          createdAt: true,
          _count: {
            select: {
              memberships: {
                where: { status: 'ACTIVE' },
              },
              pitches: true,
              polls: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const clubsWithPolls = await Promise.all(
        clubs.map(async (club) => {
          const activePolls = await prisma.poll.findMany({
            where: {
              clubId: club.id,
              status: 'OPEN',
            },
            select: {
              id: true,
              type: true,
              createdAt: true,
              votes: {
                select: { id: true },
              },
            },
          });

          return {
            ...club,
            memberCount: club._count.memberships,
            activePolls: activePolls.map((poll) => ({
              id: poll.id,
              type: poll.type,
              createdAt: poll.createdAt,
              voteCount: poll.votes.length,
              title: `${poll.type} Poll`,
            })),
          };
        })
      );

      return reply.send({
        success: true,
        data: clubsWithPolls,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get clubs',
      });
    }
  });

  // Get all pitches with details
  fastify.get('/pitches', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const pitches = await prisma.pitch.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          impressions: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const pitchesWithPromotion = await Promise.all(
        pitches.map(async (pitch) => {
          const sponsoredPitch = await prisma.sponsoredPitch.findFirst({
            where: {
              pitchId: pitch.id,
              isActive: true,
              endDate: { gte: new Date() },
            },
          });

          return {
            ...pitch,
            isSponsored: !!sponsoredPitch,
          };
        })
      );

      return reply.send({
        success: true,
        data: pitchesWithPromotion,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get pitches',
      });
    }
  });

  // Close a poll (admin override)
  fastify.post<{
    Params: { pollId: string };
  }>('/polls/:pollId/close', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const poll = await prisma.poll.update({
        where: { id: request.params.pollId },
        data: { status: 'CLOSED' },
      });

      return reply.send({
        success: true,
        data: poll,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to close poll',
      });
    }
  });

  // Revoke a badge from a user
  fastify.post('/badges/revoke', { onRequest: [requireAuth] }, async (request, reply) => {
    if (!requireStaff(request, reply)) return;

    try {
      const schema = z.object({
        userId: z.string().uuid(),
        badgeCode: z.string(),
      });
      const { userId, badgeCode } = schema.parse(request.body);

      await prisma.userBadge.deleteMany({
        where: {
          userId,
          code: badgeCode,
        },
      });

      return reply.send({
        success: true,
        message: 'Badge revoked',
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to revoke badge',
      });
    }
  });
}
