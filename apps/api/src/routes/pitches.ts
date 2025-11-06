import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient, PitchStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * Pitch routes for author book pitches
 */
export default async function pitchesRoutes(app: FastifyInstance) {
  // Create a new pitch
  app.post('/api/pitches', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // Validate request body
    const schema = z.object({
      bookId: z.string().uuid(),
      targetClubId: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      synopsis: z.string().optional(),
      sampleUrl: z.string().url().optional(),
    });

    const body = schema.parse(request.body);

    // Verify the book exists and belongs to the user
    const book = await prisma.book.findUnique({
      where: { id: body.bookId },
    });

    if (!book) {
      return reply.code(404).send({
        success: false,
        error: 'Book not found',
      });
    }

    if (book.ownerId !== userId) {
      return reply.code(403).send({
        success: false,
        error: 'You can only pitch your own books',
      });
    }

    // If targetClubId is provided, verify the club exists
    if (body.targetClubId) {
      const club = await prisma.club.findUnique({
        where: { id: body.targetClubId },
      });

      if (!club) {
        return reply.code(404).send({
          success: false,
          error: 'Target club not found',
        });
      }
    }

    // Enforce tier-based pitch limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      return reply.code(401).send({
        success: false,
        error: 'User not found',
      });
    }

    // Count active pitches (not archived)
    const activePitchCount = await prisma.pitch.count({
      where: {
        authorId: userId,
        status: { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED'] },
      },
    });

    // Tier limits for active pitches
    const tierLimits: Record<string, number> = {
      FREE: 1,
      PRO_AUTHOR: 5,
      PRO_CLUB: 5,
      PUBLISHER: 999, // Essentially unlimited
    };

    const limit = tierLimits[user.tier] || 1;

    if (activePitchCount >= limit) {
      return reply.code(403).send({
        success: false,
        error: `You have reached your pitch limit (${limit} active pitches)`,
        code: 'PITCH_LIMIT_REACHED',
        currentCount: activePitchCount,
        limit: limit,
        requiredTier: user.tier === 'FREE' ? 'PRO_AUTHOR' : undefined,
      } as any);
    }

    // Create the pitch
    const pitch = await prisma.pitch.create({
      data: {
        authorId: userId,
        bookId: body.bookId,
        targetClubId: body.targetClubId || null,
        title: body.title,
        synopsis: body.synopsis || null,
        sampleUrl: body.sampleUrl || null,
        status: 'SUBMITTED',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        book: true,
        targetClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Award PITCH_CREATED points
    const { awardPoints } = await import('../lib/points.js');
    const { maybeAwardAuthorLaunch } = await import('../lib/award.js');
    
    await awardPoints(userId, 'PITCH_CREATED', undefined, 'PITCH', pitch.id).catch(err => {
      request.log.error(err, 'Failed to award PITCH_CREATED points');
    });
    
    // Check for AUTHOR_LAUNCH badge (first pitch)
    await maybeAwardAuthorLaunch(userId).catch(err => {
      request.log.error(err, 'Failed to check AUTHOR_LAUNCH badge');
    });

    return reply.send({
      success: true,
      data: pitch,
    });
  });

  // List pitches with filters
  app.get('/api/pitches', async (request, reply) => {
    const schema = z.object({
      status: z.enum(['SUBMITTED', 'ACCEPTED', 'REJECTED', 'ARCHIVED']).optional(),
      authorId: z.string().uuid().optional(),
      targetClubId: z.string().uuid().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = schema.parse(request.query);

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.targetClubId) {
      where.targetClubId = query.targetClubId;
    }

    const [pitches, total] = await Promise.all([
      prisma.pitch.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          book: true,
          targetClub: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.pitch.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        pitches,
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  });

  // Get a single pitch by ID
  app.get('/api/pitches/:id', async (request, reply) => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    const params = schema.parse(request.params);

    const pitch = await prisma.pitch.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        book: true,
        targetClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!pitch) {
      return reply.code(404).send({
        success: false,
        error: 'Pitch not found',
      });
    }

    return reply.send({
      success: true,
      data: pitch,
    });
  });

  // Update pitch status (club hosts only for ACCEPTED/REJECTED)
  app.patch('/api/pitches/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      status: z.enum(['ACCEPTED', 'REJECTED', 'ARCHIVED']),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    // Get the pitch
    const pitch = await prisma.pitch.findUnique({
      where: { id: params.id },
      include: {
        targetClub: true,
      },
    });

    if (!pitch) {
      return reply.code(404).send({
        success: false,
        error: 'Pitch not found',
      });
    }

    // Check permissions
    if (body.status === 'ACCEPTED' || body.status === 'REJECTED') {
      // Only club co-hosts can accept/reject pitches
      if (!pitch.targetClubId) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot accept/reject a pitch without a target club',
        });
      }

      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            userId,
            clubId: pitch.targetClubId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return reply.code(403).send({
          success: false,
          error: 'Only club owners and admins can accept or reject pitches',
        });
      }
    }

    // Update the pitch
    const updatedPitch = await prisma.pitch.update({
      where: { id: params.id },
      data: {
        status: body.status,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        book: true,
        targetClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: updatedPitch,
    });
  });
}
