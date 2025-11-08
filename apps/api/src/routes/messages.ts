import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createMessageSchema, createReportSchema, MessagePage } from '@repo/types';
import { sendRateLimit } from '../middleware/sendRateLimit.js';
import { moderationFilter } from '../middleware/moderationFilter.js';
import { notify } from '../lib/mail.js';
import { hasRole } from '../middleware/auth.js';

export default async function messageRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/threads/:id/messages - Send a message
   * Rate limited: 30 messages per 10 minutes
   * Moderation filtered: Profanity + optional AI toxicity
   */
  fastify.post(
    '/threads/:id/messages',
    {
      preHandler: [sendRateLimit, moderationFilter],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { id: threadId } = request.params as { id: string };
      const body = createMessageSchema.parse(request.body);
      const userId = request.user.id;

      // Check if user is a member of this thread
      const membership = await prisma.threadMember.findUnique({
        where: {
          threadId_userId: {
            threadId,
            userId,
          },
        },
      });

      if (!membership) {
        return reply.code(403).send({ success: false, error: 'You are not a member of this thread' });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          threadId,
          senderId: userId,
          content: body.content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      request.log.info({ messageId: message.id, threadId }, 'Message sent');

      // Notify other thread members (not the sender)
      const otherMembers = await prisma.threadMember.findMany({
        where: {
          threadId,
          userId: {
            not: userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Send notifications asynchronously (don't await)
      otherMembers.forEach((member) => {
        notify({
          event: 'message_received',
          recipientEmail: member.user.email,
          recipientName: member.user.name,
          data: {
            senderName: request.user!.name,
            threadId,
            messagePreview: body.content.substring(0, 100),
          },
        }).catch((error) => {
          request.log.error({ error, userId: member.userId }, 'Failed to send message notification');
        });
      });

      return reply.send({ success: true, data: message });
    }
  );

  /**
   * GET /api/threads/:id/messages - Get paginated messages
   * Query params: before (cursor for pagination)
   * Returns 50 messages per page
   */
  fastify.get('/threads/:id/messages', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const { id: threadId } = request.params as { id: string };
    const query = request.query as { before?: string };
    const userId = request.user.id;
    const PAGE_SIZE = 50;

    // Check if user is a member of this thread (or STAFF)
    const membership = await prisma.threadMember.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId,
        },
      },
    });

    if (!membership && !hasRole(request.user, 'STAFF')) {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    // Build where clause
    const where: any = {
      threadId,
      flaggedAt: null, // Don't show flagged messages to regular users
      deletedAt: null, // Don't show deleted messages
    };

    // If STAFF, show flagged messages too
    if (hasRole(request.user, 'STAFF')) {
      delete where.flaggedAt;
    }

    // Cursor-based pagination
    if (query.before) {
      const beforeMessage = await prisma.message.findUnique({
        where: { id: query.before },
        select: { createdAt: true },
      });

      if (beforeMessage) {
        where.createdAt = {
          lt: beforeMessage.createdAt,
        };
      }
    }

    // Fetch messages (newest first)
    const messages = await prisma.message.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: PAGE_SIZE + 1, // Fetch one extra to check if there are more
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = messages.length > PAGE_SIZE;
    const pageMessages = messages.slice(0, PAGE_SIZE);
    const nextCursor = hasMore ? pageMessages[pageMessages.length - 1].id : null;

    const result: MessagePage = {
      messages: pageMessages,
      hasMore,
      nextCursor,
    };

    return reply.send({ success: true, data: result });
  });

  /**
   * POST /api/messages/:id/report - Report a message for moderation
   */
  fastify.post('/messages/:id/report', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const { id: messageId } = request.params as { id: string };
    const body = createReportSchema.parse(request.body);
    const userId = request.user.id;

    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        threadId: true,
      },
    });

    if (!message) {
      return reply.code(404).send({ success: false, error: 'Message not found' });
    }

    // Can't report your own message
    if (message.senderId === userId) {
      return reply.code(400).send({ success: false, error: 'Cannot report your own message' });
    }

    // Check if user is a member of the thread
    const membership = await prisma.threadMember.findUnique({
      where: {
        threadId_userId: {
          threadId: message.threadId,
          userId,
        },
      },
    });

    if (!membership) {
      return reply.code(403).send({ success: false, error: 'You are not a member of this thread' });
    }

    // Check if user already reported this message
    const existingReport = await prisma.moderationReport.findFirst({
      where: {
        messageId,
        reporterId: userId,
      },
    });

    if (existingReport) {
      return reply.code(400).send({ success: false, error: 'You have already reported this message' });
    }

    // Create report
    const report = await prisma.moderationReport.create({
      data: {
        messageId,
        reporterId: userId,
        reason: body.reason,
        status: 'PENDING',
      },
    });

    request.log.info({ reportId: report.id, messageId }, 'Message reported');

    return reply.send({ success: true, data: report });
  });
}
