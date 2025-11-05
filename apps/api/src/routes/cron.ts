import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { deleteOldNotifications } from '../lib/notifications.js';
import { sendNotificationEmail, emailTemplates } from '../lib/email.js';
import { createNotification } from '../lib/notifications.js';

const CRON_KEY = process.env.CRON_KEY || '';

/**
 * Middleware to verify cron job requests
 */
function verifyCronKey(request: any, reply: any, done: any) {
  const authHeader = request.headers.authorization;

  if (!CRON_KEY) {
    return reply.status(503).send({
      success: false,
      error: 'Cron jobs not configured',
    });
  }

  if (authHeader !== `Bearer ${CRON_KEY}`) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
    });
  }

  done();
}

export async function cronRoutes(fastify: FastifyInstance) {
  // Clean up old notifications (runs daily)
  fastify.post('/api/cron/cleanup-notifications', { onRequest: [verifyCronKey] }, async (request, reply) => {
    try {
      const count = await deleteOldNotifications();

      return reply.send({
        success: true,
        data: {
          deletedCount: count,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to cleanup notifications',
      });
    }
  });

  // Send poll closing reminders (runs hourly)
  fastify.post('/api/cron/poll-reminders', { onRequest: [verifyCronKey] }, async (request, reply) => {
    try {
      // Find polls closing in the next 24 hours
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date();

      const closingPolls = await prisma.poll.findMany({
        where: {
          status: 'OPEN',
          closesAt: {
            gte: now,
            lte: twentyFourHoursFromNow,
          },
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let notificationsSent = 0;
      let emailsSent = 0;

      for (const poll of closingPolls) {
        // Get club members
        const memberships = await prisma.membership.findMany({
          where: {
            clubId: poll.clubId,
            status: 'ACTIVE',
          },
          select: {
            userId: true,
          },
        });

        const hoursLeft = Math.round(
          (poll.closesAt!.getTime() - Date.now()) / (1000 * 60 * 60)
        );

        for (const membership of memberships) {
          // Create notification
          await createNotification(membership.userId, 'POLL_CLOSING', {
            pollId: poll.id,
            pollTitle: poll.title,
            clubName: poll.club.name,
            hoursLeft,
          });
          notificationsSent++;

          // Send email reminder
          const emailTemplate = emailTemplates.pollClosingSoon(
            poll.club.name,
            poll.title,
            hoursLeft
          );

          const emailSent = await sendNotificationEmail(
            membership.userId,
            'poll_reminder',
            emailTemplate
          );

          if (emailSent) {
            emailsSent++;
          }
        }
      }

      return reply.send({
        success: true,
        data: {
          pollsFound: closingPolls.length,
          notificationsSent,
          emailsSent,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to send poll reminders',
      });
    }
  });

  // Reset AI call limits (runs daily)
  fastify.post('/api/cron/reset-ai-limits', { onRequest: [verifyCronKey] }, async (request, reply) => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await prisma.user.updateMany({
        where: {
          aiCallsResetAt: {
            lt: twentyFourHoursAgo,
          },
        },
        data: {
          aiCallsToday: 0,
          aiCallsResetAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        data: {
          usersReset: result.count,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to reset AI limits',
      });
    }
  });

  // Health check endpoint
  fastify.get('/api/cron/health', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  });
}
