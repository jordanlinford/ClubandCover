import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient, PollType, PollStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { requireCoHost, requireClubMember } from '../middleware/permissions.js';
import { awardPoints, POINT_VALUES } from '../lib/points.js';

const prisma = new PrismaClient();

/**
 * Poll routes for club voting
 */
export default async function pollsRoutes(app: FastifyInstance) {
  // Create a new poll (co-hosts only)
  app.post(
    '/api/clubs/:clubId/polls',
    { preHandler: [requireAuth, requireCoHost] },
    async (request, reply) => {
      const userId = request.user!.id;
      const { clubId } = request.params as { clubId: string };

      const schema = z.object({
        type: z.enum(['PITCH', 'BOOK']),
        opensAt: z.string().datetime().optional(),
        closesAt: z.string().datetime().optional(),
      });

      const body = schema.parse(request.body);

      // Validate dates if provided
      if (body.opensAt && body.closesAt) {
        const opensAt = new Date(body.opensAt);
        const closesAt = new Date(body.closesAt);
        if (closesAt <= opensAt) {
          return reply.code(400).send({
            success: false,
            error: 'Close date must be after open date',
          });
        }
      }

      // Create the poll
      const poll = await prisma.poll.create({
        data: {
          clubId,
          type: body.type,
          status: 'DRAFT',
          opensAt: body.opensAt ? new Date(body.opensAt) : null,
          closesAt: body.closesAt ? new Date(body.closesAt) : null,
          createdBy: userId,
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: poll,
      });
    }
  );

  // Add options to a poll (co-hosts only)
  app.post(
    '/api/polls/:id/options',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: pollId } = request.params as { id: string };

      const schema = z.object({
        options: z.array(
          z.object({
            pitchId: z.string().uuid().optional(),
            bookId: z.string().uuid().optional(),
            label: z.string().min(1).max(200),
          })
        ).min(1),
      });

      const body = schema.parse(request.body);

      // Get the poll
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
      });

      if (!poll) {
        return reply.code(404).send({
          success: false,
          error: 'Poll not found',
        });
      }

      // Check if user is co-host
      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            userId,
            clubId: poll.clubId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return reply.code(403).send({
          success: false,
          error: 'Only club owners and admins can add poll options',
        });
      }

      // Verify poll is in DRAFT status
      if (poll.status !== 'DRAFT') {
        return reply.code(400).send({
          success: false,
          error: 'Can only add options to draft polls',
        });
      }

      // Create all options
      const createdOptions = await Promise.all(
        body.options.map((opt) =>
          prisma.pollOption.create({
            data: {
              pollId,
              pitchId: opt.pitchId || null,
              bookId: opt.bookId || null,
              label: opt.label,
            },
            include: {
              pitch: {
                include: {
                  book: true,
                  author: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              book: true,
            },
          })
        )
      );

      return reply.send({
        success: true,
        data: createdOptions,
      });
    }
  );

  // Update poll (status, dates) - co-hosts only
  app.patch(
    '/api/polls/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: pollId } = request.params as { id: string };

      const schema = z.object({
        status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).optional(),
        opensAt: z.string().datetime().optional(),
        closesAt: z.string().datetime().optional(),
      });

      const body = schema.parse(request.body);

      // Get the poll
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
      });

      if (!poll) {
        return reply.code(404).send({
          success: false,
          error: 'Poll not found',
        });
      }

      // Check if user is co-host
      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            userId,
            clubId: poll.clubId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return reply.code(403).send({
          success: false,
          error: 'Only club owners and admins can update polls',
        });
      }

      // Build update data
      const updateData: any = {};

      if (body.status) {
        updateData.status = body.status;
      }

      if (body.opensAt !== undefined) {
        updateData.opensAt = body.opensAt ? new Date(body.opensAt) : null;
      }

      if (body.closesAt !== undefined) {
        updateData.closesAt = body.closesAt ? new Date(body.closesAt) : null;
      }

      // Update the poll
      const updatedPoll = await prisma.poll.update({
        where: { id: pollId },
        data: updateData,
        include: {
          club: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          options: {
            include: {
              pitch: {
                include: {
                  book: true,
                  author: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              book: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: updatedPoll,
      });
    }
  );

  // Get poll details
  app.get('/api/polls/:id', async (request, reply) => {
    const { id: pollId } = request.params as { id: string };

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        options: {
          include: {
            pitch: {
              include: {
                book: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            book: true,
          },
        },
      },
    });

    if (!poll) {
      return reply.code(404).send({
        success: false,
        error: 'Poll not found',
      });
    }

    return reply.send({
      success: true,
      data: poll,
    });
  });

  // Cast a vote (club members only)
  app.post(
    '/api/polls/:id/votes',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: pollId } = request.params as { id: string };

      const schema = z.object({
        optionId: z.string().uuid(),
      });

      const body = schema.parse(request.body);

      // Get the poll
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: true,
        },
      });

      if (!poll) {
        return reply.code(404).send({
          success: false,
          error: 'Poll not found',
        });
      }

      // Check if poll is open
      if (poll.status !== 'OPEN') {
        return reply.code(400).send({
          success: false,
          error: 'Poll is not open for voting',
        });
      }

      // Check if user is an active member of the club
      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            userId,
            clubId: poll.clubId,
          },
        },
      });

      if (!membership || membership.status !== 'ACTIVE') {
        return reply.code(403).send({
          success: false,
          error: 'Only active club members can vote',
        });
      }

      // Verify option belongs to this poll
      const option = poll.options.find((opt) => opt.id === body.optionId);
      if (!option) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid poll option',
        });
      }

      // Check if user already voted (idempotency)
      const existingVote = await prisma.vote.findFirst({
        where: {
          pollId,
          userId,
        },
      });

      if (existingVote) {
        // Update the vote to the new option
        const updatedVote = await prisma.vote.update({
          where: { id: existingVote.id },
          data: {
            optionId: body.optionId,
          },
        });

        return reply.send({
          success: true,
          data: updatedVote,
          message: 'Vote updated',
        });
      }

      // Create new vote and award points
      const vote = await prisma.vote.create({
        data: {
          pollId,
          userId,
          optionId: body.optionId,
        },
      });

      // Award points for vote participation
      await awardPoints(
        userId,
        'VOTE_PARTICIPATION',
        POINT_VALUES.VOTE_PARTICIPATION,
        'POLL',
        pollId
      );

      return reply.send({
        success: true,
        data: vote,
      });
    }
  );

  // Get poll results with vote counts
  app.get('/api/polls/:id/results', async (request, reply) => {
    const { id: pollId } = request.params as { id: string };

    // Get poll with all details
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        options: {
          include: {
            pitch: {
              include: {
                book: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            book: true,
          },
        },
      },
    });

    if (!poll) {
      return reply.code(404).send({
        success: false,
        error: 'Poll not found',
      });
    }

    // Get vote counts for each option
    const results = await Promise.all(
      poll.options.map(async (option) => {
        const voteCount = await prisma.vote.count({
          where: {
            pollId,
            optionId: option.id,
          },
        });

        return {
          ...option,
          voteCount,
        };
      })
    );

    // Get total votes
    const totalVotes = await prisma.vote.count({
      where: { pollId },
    });

    return reply.send({
      success: true,
      data: {
        poll,
        results: results.sort((a, b) => b.voteCount - a.voteCount),
        totalVotes,
      },
    });
  });
}
