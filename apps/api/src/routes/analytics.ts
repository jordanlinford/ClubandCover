import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Get author analytics
  fastify.get('/api/analytics/author', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      // Get pitch stats
      const [totalPitches, acceptedPitches, totalImpressions, recentPitches] = await Promise.all([
        prisma.pitch.count({
          where: { authorId: userId },
        }),
        prisma.pitch.count({
          where: {
            authorId: userId,
            status: 'ACCEPTED',
          },
        }),
        prisma.pitch.aggregate({
          where: { authorId: userId },
          _sum: {
            impressions: true,
          },
        }),
        prisma.pitch.findMany({
          where: { authorId: userId },
          include: {
            book: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
            targetClub: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      // Get poll stats (how many times author's books were in polls)
      const pollOptionsCount = await prisma.pollOption.count({
        where: {
          pitch: {
            authorId: userId,
          },
        },
      });

      // Get vote stats (how many votes author's pitches received)
      const votesReceived = await prisma.vote.count({
        where: {
          option: {
            pitch: {
              authorId: userId,
            },
          },
        },
      });

      // Get points earned from pitches
      const pitchPoints = await prisma.pointLedger.aggregate({
        where: {
          userId,
          type: 'PITCH_SELECTED',
        },
        _sum: {
          amount: true,
        },
      });

      // Calculate metrics
      const acceptanceRate =
        totalPitches > 0 ? Math.round((acceptedPitches / totalPitches) * 100) : 0;

      const avgImpressions =
        totalPitches > 0
          ? Math.round((totalImpressions._sum.impressions || 0) / totalPitches)
          : 0;

      return reply.send({
        success: true,
        data: {
          overview: {
            totalPitches,
            acceptedPitches,
            acceptanceRate,
            totalImpressions: totalImpressions._sum.impressions || 0,
            avgImpressions,
            pollAppearances: pollOptionsCount,
            votesReceived,
            pointsEarned: pitchPoints._sum.amount || 0,
          },
          recentPitches,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get author analytics',
      });
    }
  });

  // Get pitch detail analytics
  fastify.get<{
    Params: { id: string };
  }>('/api/analytics/pitches/:id', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const pitchId = request.params.id;

      // Get pitch with details
      const pitch = await prisma.pitch.findUnique({
        where: { id: pitchId },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              author: true,
            },
          },
          targetClub: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!pitch) {
        return reply.status(404).send({
          success: false,
          error: 'Pitch not found',
        });
      }

      // Security: ensure user owns this pitch
      if (pitch.authorId !== userId) {
        return reply.status(403).send({
          success: false,
          error: 'You do not own this pitch',
        });
      }

      // Get poll appearances
      const pollOptions = await prisma.pollOption.findMany({
        where: { pitchId },
        include: {
          poll: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              club: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              votes: true,
            },
          },
        },
      });

      // Calculate total votes across all polls
      const totalVotes = pollOptions.reduce((sum, opt) => sum + opt._count.votes, 0);

      return reply.send({
        success: true,
        data: {
          pitch,
          analytics: {
            impressions: pitch.impressions,
            pollAppearances: pollOptions.length,
            totalVotes,
            pollHistory: pollOptions.map((opt) => ({
              pollId: opt.poll.id,
              pollTitle: opt.poll.title,
              pollStatus: opt.poll.status,
              clubName: opt.poll.club.name,
              votesReceived: opt._count.votes,
              createdAt: opt.poll.createdAt,
            })),
          },
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get pitch analytics',
      });
    }
  });

  // Get club analytics (for club owners)
  fastify.get<{
    Params: { id: string };
  }>('/api/analytics/clubs/:id', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const clubId = request.params.id;

      // Get club
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
          _count: {
            select: {
              memberships: true,
              pitches: true,
              polls: true,
            },
          },
        },
      });

      if (!club) {
        return reply.status(404).send({
          success: false,
          error: 'Club not found',
        });
      }

      // Security: ensure user is club owner
      if (club.createdById !== userId) {
        return reply.status(403).send({
          success: false,
          error: 'You do not own this club',
        });
      }

      // Get member activity stats
      const activeMemberships = await prisma.membership.count({
        where: {
          clubId,
          status: 'ACTIVE',
        },
      });

      // Get recent poll engagement
      const recentPolls = await prisma.poll.findMany({
        where: { clubId },
        include: {
          _count: {
            select: {
              options: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Calculate total votes across recent polls
      const pollVoteStats = await Promise.all(
        recentPolls.map(async (poll) => {
          const voteCount = await prisma.vote.count({
            where: {
              poll: {
                id: poll.id,
              },
            },
          });

          return {
            pollId: poll.id,
            title: poll.title,
            status: poll.status,
            optionsCount: poll._count.options,
            votesCount: voteCount,
            participationRate:
              activeMemberships > 0
                ? Math.round((voteCount / activeMemberships) * 100)
                : 0,
          };
        })
      );

      return reply.send({
        success: true,
        data: {
          club: {
            id: club.id,
            name: club.name,
          },
          overview: {
            totalMembers: club._count.memberships,
            activeMembers: activeMemberships,
            totalPitches: club._count.pitches,
            totalPolls: club._count.polls,
          },
          recentPolls: pollVoteStats,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get club analytics',
      });
    }
  });
}
