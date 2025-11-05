import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// Validation schema for full poll creation
const createPollFullSchema = z.object({
  clubId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['PITCH', 'BOOK']),
  closesAt: z.string().datetime().optional(),
  options: z
    .array(
      z.object({
        pitchId: z.string().uuid().optional(),
        bookId: z.string().uuid().optional(),
      })
    )
    .min(2)
    .max(10),
});

export async function pollsFullRoutes(fastify: FastifyInstance) {
  // Create poll with options in one request
  fastify.post<{
    Body: z.infer<typeof createPollFullSchema>;
  }>('/api/polls/full', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      // Validate request body
      const validation = createPollFullSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        });
      }

      const { clubId, title, description, type, closesAt, options } = validation.data;

      // Verify club exists and user is owner/admin
      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
        include: {
          club: true,
        },
      });

      if (!membership) {
        return reply.status(404).send({
          success: false,
          error: 'Club not found or you are not a member',
        });
      }

      if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only club owners and admins can create polls',
        });
      }

      // Validate options based on poll type
      if (type === 'PITCH') {
        const hasInvalidOption = options.some((opt) => !opt.pitchId || opt.bookId);
        if (hasInvalidOption) {
          return reply.status(400).send({
            success: false,
            error: 'PITCH polls must have pitchId for each option, not bookId',
          });
        }
      } else if (type === 'BOOK') {
        const hasInvalidOption = options.some((opt) => !opt.bookId || opt.pitchId);
        if (hasInvalidOption) {
          return reply.status(400).send({
            success: false,
            error: 'BOOK polls must have bookId for each option, not pitchId',
          });
        }
      }

      // Create poll with options in a transaction
      const poll = await prisma.$transaction(async (tx) => {
        // Create the poll
        const newPoll = await tx.poll.create({
          data: {
            clubId,
            createdBy: userId,
            title,
            description: description || null,
            type,
            status: 'OPEN',
            closesAt: closesAt ? new Date(closesAt) : null,
          },
        });

        // Create poll options
        const createdOptions = await Promise.all(
          options.map((opt, index) =>
            tx.pollOption.create({
              data: {
                pollId: newPoll.id,
                pitchId: opt.pitchId || null,
                bookId: opt.bookId || null,
                displayOrder: index,
              },
            })
          )
        );

        return {
          ...newPoll,
          options: createdOptions,
        };
      });

      // Fetch full poll with relations
      const fullPoll = await prisma.poll.findUnique({
        where: { id: poll.id },
        include: {
          options: {
            include: {
              pitch: {
                select: {
                  id: true,
                  title: true,
                  book: {
                    select: {
                      id: true,
                      title: true,
                      author: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              book: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                  imageUrl: true,
                },
              },
              _count: {
                select: {
                  votes: true,
                },
              },
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
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
            },
          },
          _count: {
            select: {
              options: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: fullPoll,
      });
    } catch (error: any) {
      console.error('Error creating full poll:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to create poll',
      });
    }
  });
}
