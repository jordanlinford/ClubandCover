import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { reviewActionSchema, ModerationQueueItem } from '@repo/types';

export default async function moderationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/moderation/queue - Get pending moderation reports (STAFF only)
   */
  fastify.get('/queue', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    // Only STAFF can access moderation queue
    if (request.user.role !== 'STAFF') {
      return reply.code(403).send({ success: false, error: 'Access denied. STAFF only.' });
    }

    // Get all pending reports
    const reports = await prisma.moderationReport.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        message: {
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
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const queue: ModerationQueueItem[] = reports.map((r) => ({
      id: r.id,
      messageId: r.messageId,
      reporterId: r.reporterId,
      reason: r.reason,
      status: r.status,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
      message: {
        id: r.message.id,
        threadId: r.message.threadId,
        senderId: r.message.senderId,
        content: r.message.content,
        createdAt: r.message.createdAt,
        deletedAt: r.message.deletedAt,
        flaggedAt: r.message.flaggedAt,
        reviewedBy: r.message.reviewedBy,
        reviewedAt: r.message.reviewedAt,
        sender: r.message.sender,
      },
      reporter: r.reporter,
    }));

    return reply.send({ success: true, data: queue });
  });

  /**
   * POST /api/moderation/review - Review a moderation report (STAFF only)
   * Actions: FLAG (hide message), CLEAR (mark as safe), DISMISS (reject report)
   */
  fastify.post('/review', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    // Only STAFF can review reports
    if (request.user.role !== 'STAFF') {
      return reply.code(403).send({ success: false, error: 'Access denied. STAFF only.' });
    }

    const body = reviewActionSchema.parse(request.body);
    const { reportId } = request.body as { reportId: string };
    const userId = request.user.id;

    if (!reportId) {
      return reply.code(400).send({ success: false, error: 'reportId is required' });
    }

    // Get the report
    const report = await prisma.moderationReport.findUnique({
      where: { id: reportId },
      include: {
        message: true,
      },
    });

    if (!report) {
      return reply.code(404).send({ success: false, error: 'Report not found' });
    }

    // Perform action
    if (body.action === 'FLAG') {
      // Flag the message (hide from users, mark sender)
      await prisma.message.update({
        where: { id: report.messageId },
        data: {
          flaggedAt: new Date(),
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      // Mark all reports for this message as reviewed
      await prisma.moderationReport.updateMany({
        where: { messageId: report.messageId },
        data: {
          status: 'REVIEWED',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      request.log.info(
        { reportId, messageId: report.messageId },
        'Message flagged by STAFF'
      );

      return reply.send({
        success: true,
        data: {
          action: 'FLAG',
          messageId: report.messageId,
          reportId,
        },
      });
    } else if (body.action === 'CLEAR') {
      // Mark message as reviewed but safe
      await prisma.message.update({
        where: { id: report.messageId },
        data: {
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      // Mark all reports for this message as reviewed
      await prisma.moderationReport.updateMany({
        where: { messageId: report.messageId },
        data: {
          status: 'REVIEWED',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      request.log.info(
        { reportId, messageId: report.messageId },
        'Message cleared by STAFF'
      );

      return reply.send({
        success: true,
        data: {
          action: 'CLEAR',
          messageId: report.messageId,
          reportId,
        },
      });
    } else if (body.action === 'DISMISS') {
      // Dismiss this specific report without affecting the message
      await prisma.moderationReport.update({
        where: { id: reportId },
        data: {
          status: 'DISMISSED',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      request.log.info({ reportId }, 'Report dismissed by STAFF');

      return reply.send({
        success: true,
        data: {
          action: 'DISMISS',
          reportId,
        },
      });
    }

    return reply.code(400).send({ success: false, error: 'Invalid action' });
  });
}
