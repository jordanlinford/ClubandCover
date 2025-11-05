import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { isAIEnabled, generateEmbedding, getEmbeddingText } from '../lib/ai.js';

export async function clubRoutes(fastify: FastifyInstance) {
  // List all clubs (public only for non-members)
  fastify.get('/', async (request, reply) => {
    try {
      const clubs = await prisma.club.findMany({
        where: { isPublic: true },
        include: {
          createdBy: { select: { id: true, name: true } },
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

  // Get single club
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const club = await prisma.club.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true } },
          memberships: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      });

      if (!club) {
        reply.code(404);
        return { success: false, error: 'Club not found' };
      }

      return { success: true, data: club };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch club',
      };
    }
  });

  // Create club
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        isPublic: z.boolean().default(true),
        genres: z.array(z.string()).optional(),
        joinRules: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']).optional(),
      });
      const validated = schema.parse(request.body);
      
      const club = await prisma.club.create({
        data: {
          name: validated.name,
          description: validated.description,
          isPublic: validated.isPublic,
          genres: validated.genres || [],
          joinRules: validated.joinRules || 'APPROVAL',
          createdById: request.user.id,
          memberships: {
            create: {
              userId: request.user.id,
              role: 'OWNER',
              status: 'ACTIVE',
            },
          },
        },
        include: { memberships: true },
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
