import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { isAIEnabled, generateEmbedding, getEmbeddingText } from '../lib/ai.js';

export async function clubRoutes(fastify: FastifyInstance) {
  // Search clubs with filters (Sprint-6)
  fastify.get('/search', async (request, reply) => {
    try {
      const querySchema = z.object({
        q: z.string().optional(),
        genres: z.array(z.string()).optional(),
        frequency: z.coerce.number().min(1).max(12).optional(),
        minPoints: z.coerce.number().min(0).optional(),
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(50).default(20),
      });

      const query = querySchema.parse(request.query);
      const skip = (query.page - 1) * query.limit;

      // Build where clause
      const where: any = { isPublic: true };

      // Text search (name, description, about)
      if (query.q) {
        where.OR = [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          { about: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      // Genre filter (array overlap)
      if (query.genres && query.genres.length > 0) {
        where.preferredGenres = { hasSome: query.genres };
      }

      // Frequency filter
      if (query.frequency) {
        where.frequency = { lte: query.frequency };
      }

      // Min points filter (clubs with minPointsToJoin <= user's filter value)
      if (query.minPoints !== undefined) {
        where.minPointsToJoin = { lte: query.minPoints };
      }

      const [clubs, total] = await Promise.all([
        prisma.club.findMany({
          where,
          include: {
            createdBy: { select: { id: true, name: true, avatarUrl: true } },
            _count: { select: { memberships: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        prisma.club.count({ where }),
      ]);

      return {
        success: true,
        data: {
          clubs,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { success: false, error: 'Invalid query parameters', details: error.errors };
      }
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search clubs',
      };
    }
  });

  // List all clubs (public only for non-members)
  fastify.get('/', async (request, reply) => {
    try {
      const clubs = await prisma.club.findMany({
        where: { isPublic: true },
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: clubs };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch clubs',
      };
    }
  });

  // Get single club (enhanced for Sprint-6)
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const club = await prisma.club.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          memberships: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
          _count: { select: { memberships: true } },
        },
      });

      if (!club) {
        reply.code(404);
        return { success: false, error: 'Club not found' };
      }

      // Get co-hosts (ADMIN role members)
      const coHosts = club.memberships
        .filter((m) => m.role === 'ADMIN')
        .map((m) => m.user);

      // Get current OPEN poll
      const currentPoll = await prisma.poll.findFirst({
        where: { clubId: id, status: 'OPEN' },
        include: { _count: { select: { votes: true } } },
        orderBy: { createdAt: 'desc' },
      });

      // Get last 3 selected books from CLOSED polls
      const closedPolls = await prisma.poll.findMany({
        where: { clubId: id, status: 'CLOSED' },
        include: {
          options: {
            include: {
              book: { select: { title: true, author: true } },
              votes: true,
            },
          },
        },
        orderBy: { closesAt: 'desc' },
        take: 3,
      });

      const lastBooks = closedPolls
        .map((poll) => {
          // Find winning option (most votes)
          const winningOption = poll.options.reduce((max, opt) =>
            opt.votes.length > max.votes.length ? opt : max
          );
          return {
            title: winningOption.book?.title || winningOption.label,
            author: winningOption.book?.author || 'Unknown',
            selectedAt: poll.closesAt?.toISOString() || poll.updatedAt.toISOString(),
          };
        })
        .filter((b) => b.title);

      const enhancedClub = {
        ...club,
        owner: club.createdBy,
        coHosts,
        currentPoll: currentPoll
          ? {
              id: currentPoll.id,
              type: currentPoll.type,
              closesAt: currentPoll.closesAt?.toISOString(),
              _count: currentPoll._count,
            }
          : null,
        lastBooks,
      };

      return { success: true, data: enhancedClub };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch club',
      };
    }
  });

  // Get current user's membership in a club
  fastify.get('/:id/my-membership', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId: id,
            userId: request.user.id,
          },
        },
      });

      if (!membership) {
        return reply.status(404).send({
          success: false,
          error: 'Not a member of this club',
        });
      }

      return { success: true, data: membership };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch membership',
      };
    }
  });

  // Get club members (for management - owner/admin only)
  fastify.get('/:id/members', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Check if requester is owner/admin of the club
      const requesterMembership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId: id,
            userId: request.user.id,
          },
        },
      });

      if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Only club owners and admins can view member list',
        });
      }

      // Get all memberships for the club
      const memberships = await prisma.membership.findMany({
        where: { clubId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' }, // OWNER first, then ADMIN, MEMBER, etc.
          { joinedAt: 'asc' },
        ],
      });

      return { success: true, data: memberships };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch members',
      };
    }
  });

  // Create club (any authenticated user can create a club)
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        about: z.string().optional(),
        preferredGenres: z.array(z.string()).min(1),
        frequency: z.number().min(1).max(12).optional(),
        coverImageUrl: z.string().url().optional(),
        isPublic: z.boolean().default(true),
        minPointsToJoin: z.number().min(0).optional(),
        joinRules: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']).optional(),
      });
      const validated = schema.parse(request.body);
      
      // Get current user to check if they need CLUB_ADMIN role
      const currentUser = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { roles: true },
      });
      
      const club = await prisma.$transaction(async (tx) => {
        // Create the club
        const newClub = await tx.club.create({
          data: {
            name: validated.name,
            description: validated.description,
            about: validated.about,
            preferredGenres: validated.preferredGenres,
            frequency: validated.frequency,
            coverImageUrl: validated.coverImageUrl,
            isPublic: validated.isPublic,
            minPointsToJoin: validated.minPointsToJoin || 0,
            joinRules: validated.joinRules || 'APPROVAL',
            createdById: request.user!.id,
            memberships: {
              create: {
                userId: request.user!.id,
                role: 'OWNER',
                status: 'ACTIVE',
              },
            },
          },
          include: { memberships: true },
        });
        
        // Add CLUB_ADMIN role if user doesn't have it yet
        if (currentUser && !currentUser.roles.includes('CLUB_ADMIN')) {
          await tx.user.update({
            where: { id: request.user!.id },
            data: {
              roles: {
                push: 'CLUB_ADMIN',
              },
            },
          });
        }
        
        return newClub;
      });

      // Award HOST_STARTER badge for first club created
      const { maybeAwardHostStarter } = await import('../lib/award.js');
      await maybeAwardHostStarter(request.user.id).catch(err => {
        fastify.log.error(err, 'Failed to check HOST_STARTER badge');
      });

      // Auto-index embedding if AI is enabled
      if (isAIEnabled()) {
        try {
          const embeddingText = getEmbeddingText(club);
          const vector = await generateEmbedding(embeddingText);
          await prisma.embedding.create({
            data: {
              entityType: 'CLUB',
              clubId: club.id,
              embedding: JSON.stringify(vector),
            },
          });
        } catch (error) {
          // Log error but don't fail club creation
          fastify.log.error({ error }, 'Failed to generate embedding for club');
        }
      }

      reply.code(201);
      return { success: true, data: club };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create club',
      };
    }
  });

  // Update club (owner/admin only)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        genres: z.array(z.string()).optional(),
        joinRules: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']).optional(),
      });
      const validated = schema.parse(request.body);

      // Check permissions
      const membership = await prisma.membership.findUnique({
        where: { clubId_userId: { clubId: id, userId: request.user.id } },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        reply.code(403);
        return { success: false, error: 'Not authorized to update this club' };
      }

      const updated = await prisma.club.update({
        where: { id },
        data: validated,
      });

      return { success: true, data: updated };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update club',
      };
    }
  });

  // Get club's selected books with review counts
  fastify.get('/:clubId/books', async (request, reply) => {
    try {
      const { clubId } = request.params as { clubId: string };

      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { id: true, name: true },
      });

      if (!club) {
        reply.code(404);
        return { success: false, error: 'Club not found' };
      }

      // Get all club books with review counts
      const clubBooks = await prisma.clubBook.findMany({
        where: { clubId },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              subtitle: true,
              author: true,
              genres: true,
              imageUrl: true,
              description: true,
            },
          },
          poll: {
            select: {
              id: true,
              closesAt: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy: { selectedAt: 'desc' },
      });

      // Transform to include review count at the top level
      const booksWithReviewCounts = clubBooks.map((cb) => ({
        id: cb.id,
        clubId: cb.clubId,
        bookId: cb.bookId,
        selectedAt: cb.selectedAt.toISOString(),
        book: cb.book,
        poll: cb.poll,
        reviewCount: cb._count.reviews,
      }));

      return {
        success: true,
        data: booksWithReviewCounts,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch club books',
      };
    }
  });

  // Choose a book for the club (from pitch selection) - owner/admin only
  fastify.post('/:clubId/choose-book', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const { clubId } = request.params as { clubId: string };
      const { pitchId } = request.body as { pitchId: string };

      // Check permissions
      const membership = await prisma.membership.findUnique({
        where: { clubId_userId: { clubId, userId: request.user.id } },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        reply.code(403);
        return { success: false, error: 'Not authorized to choose book for this club' };
      }

      // Get the pitch
      const pitch = await prisma.pitch.findUnique({
        where: { id: pitchId },
        include: { book: true },
      });

      if (!pitch) {
        reply.code(404);
        return { success: false, error: 'Pitch not found' };
      }

      // Update club's chosen book and pitch status
      const [updatedClub] = await prisma.$transaction([
        prisma.club.update({
          where: { id: clubId },
          data: { chosenBookId: pitch.bookId },
        }),
        prisma.pitch.update({
          where: { id: pitchId },
          data: { status: 'ACCEPTED' },
        }),
      ]);

      // Award points to the pitch author
      const { awardPoints, POINT_VALUES } = await import('../lib/points.js');
      await awardPoints(
        pitch.authorId,
        'PITCH_SELECTED',
        POINT_VALUES.PITCH_SELECTED,
        'PITCH',
        pitchId
      );

      return { success: true, data: updatedClub };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to choose book',
      };
    }
  });
}
