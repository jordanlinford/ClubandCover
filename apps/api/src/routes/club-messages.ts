import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ensureUser } from '../middleware/ensureUser.js';

export default async function clubMessagesRoutes(app: FastifyInstance) {
  // Get club messages (paginated, newest first) - member-only
  app.get(
    '/api/clubs/:clubId/messages',
    { preHandler: [ensureUser] },
    async (request, reply) => {
      try {
        const { clubId } = request.params as { clubId: string };
        const querySchema = z.object({
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(50),
        });
        const query = querySchema.parse(request.query);
        const userId = (request as any).user.id;

        // Check membership
        const membership = await prisma.membership.findUnique({
          where: { clubId_userId: { clubId, userId } },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          return reply.status(403).send({
            success: false,
            error: 'You must be an active member to view club messages',
          });
        }

        const skip = (query.page - 1) * query.limit;

        const [messages, total] = await Promise.all([
          prisma.clubMessage.findMany({
            where: { clubId },
            include: {
              author: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
          }),
          prisma.clubMessage.count({ where: { clubId } }),
        ]);

        return reply.send({
          success: true,
          data: {
            messages,
            pagination: {
              page: query.page,
              limit: query.limit,
              total,
              totalPages: Math.ceil(total / query.limit),
            },
          },
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid query parameters',
            details: error.errors,
          });
        }
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch club messages',
        });
      }
    }
  );

  // Post message to club feed - member-only with rate limiting
  app.post(
    '/api/clubs/:clubId/messages',
    { preHandler: [ensureUser] },
    async (request, reply) => {
      try {
        const { clubId } = request.params as { clubId: string };
        const bodySchema = z.object({
          body: z.string().min(1).max(2000),
        });
        const { body } = bodySchema.parse(request.body);
        const userId = (request as any).user.id;

        // Check membership
        const membership = await prisma.membership.findUnique({
          where: { clubId_userId: { clubId, userId } },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          return reply.status(403).send({
            success: false,
            error: 'You must be an active member to post messages',
          });
        }

        // Simple rate limiting: check last message from user in this club
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentMessages = await prisma.clubMessage.count({
          where: {
            clubId,
            userId,
            createdAt: { gte: oneHourAgo },
          },
        });

        if (recentMessages >= 60) {
          return reply.status(429).send({
            success: false,
            error: 'Rate limit exceeded. Maximum 60 messages per hour.',
          });
        }

        // Create message
        const message = await prisma.clubMessage.create({
          data: {
            clubId,
            userId,
            body: body.trim(),
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        return reply.status(201).send({
          success: true,
          data: message,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to post message',
        });
      }
    }
  );
}
