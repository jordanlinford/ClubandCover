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
        
        // Define allowed image MIME types
        const ALLOWED_IMAGE_TYPES = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        
        const bodySchema = z.object({
          body: z.string().min(1).max(2000),
          attachmentUrl: z.string().optional().refine(
            (url) => {
              if (!url) return true;
              // Must be a data URL with allowed image type
              return url.startsWith('data:image/') && 
                     ALLOWED_IMAGE_TYPES.some(type => url.startsWith(`data:${type};base64,`));
            },
            { message: 'Attachment must be a valid image data URL (JPEG, PNG, GIF, or WebP)' }
          ),
          attachmentType: z.string().optional().refine(
            (type) => {
              if (!type) return true;
              return ALLOWED_IMAGE_TYPES.includes(type);
            },
            { message: 'Invalid attachment type' }
          ),
          attachmentName: z.string().max(255).optional(),
        });
        const { body, attachmentUrl, attachmentType, attachmentName } = bodySchema.parse(request.body);
        const userId = (request as any).user.id;

        // Validate attachment size (base64 data URLs should be < 2MB)
        if (attachmentUrl && attachmentUrl.length > 2.5 * 1024 * 1024) {
          return reply.status(400).send({
            success: false,
            error: 'Attachment too large. Maximum size is 2MB.',
          });
        }

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
            attachmentUrl: attachmentUrl || null,
            attachmentType: attachmentType || null,
            attachmentName: attachmentName || null,
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        // Award MESSAGE_POSTED points if message is >= 10 characters
        if (body.trim().length >= 10) {
          const { awardPoints } = await import('../lib/points.js');
          const { maybeAwardSociable } = await import('../lib/award.js');
          
          await awardPoints(userId, 'MESSAGE_POSTED', undefined, 'MESSAGE', message.id).catch(err => {
            request.log.error(err, 'Failed to award MESSAGE_POSTED points');
          });
          
          // Check for SOCIABLE badge (20 messages ≥10 chars)
          await maybeAwardSociable(userId).catch(err => {
            request.log.error(err, 'Failed to check SOCIABLE badge');
          });
        }

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

  // Delete club message - author or club admin/host only
  app.delete(
    '/api/clubs/:clubId/messages/:messageId',
    { preHandler: [ensureUser] },
    async (request, reply) => {
      try {
        const { clubId, messageId } = request.params as { clubId: string; messageId: string };
        const userId = (request as any).user.id;

        // Get the message
        const message = await prisma.clubMessage.findUnique({
          where: { id: messageId },
        });

        if (!message || message.clubId !== clubId) {
          return reply.status(404).send({
            success: false,
            error: 'Message not found',
          });
        }

        // Check if user can delete this message
        // 1. Message author can delete their own message
        // 2. Club admin/owner can delete any message
        const membership = await prisma.membership.findUnique({
          where: { clubId_userId: { clubId, userId } },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          return reply.status(403).send({
            success: false,
            error: 'You must be an active member',
          });
        }

        const canDelete = 
          message.userId === userId || 
          ['ADMIN', 'OWNER'].includes(membership.role);

        if (!canDelete) {
          return reply.status(403).send({
            success: false,
            error: 'You do not have permission to delete this message',
          });
        }

        // Delete the message
        await prisma.clubMessage.delete({
          where: { id: messageId },
        });

        return reply.send({
          success: true,
          data: { id: messageId },
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete message',
        });
      }
    }
  );
}
