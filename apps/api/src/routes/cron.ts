import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { deleteOldNotifications } from '../lib/notifications.js';
import { sendNotificationEmail, emailTemplates } from '../lib/email.js';
import { createNotification } from '../lib/notifications.js';

/**
 * Lightweight guard to verify cron job requests
 * Checks query param ?key=... or header x-cron-key
 */
function requireCronKey(req: any, reply: any): boolean {
  const key = req.query?.key || req.headers['x-cron-key'];
  if (!process.env.CRON_KEY || !key || key !== process.env.CRON_KEY) {
    reply.code(403).send({ error: 'Forbidden' });
    return true; // blocked
  }
  return false; // allowed
}

export async function cronRoutes(fastify: FastifyInstance) {
  // Clean up old notifications (runs daily)
  fastify.post('/cron/cleanup-notifications', async (request, reply) => {
    if (requireCronKey(request, reply)) return;
    
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
  fastify.post('/cron/poll-reminders', async (request, reply) => {
    if (requireCronKey(request, reply)) return;
    
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
            pollTitle: `Poll in ${poll.club.name}`,
            clubName: poll.club.name,
            hoursLeft,
          });
          notificationsSent++;

          // Send email reminder
          const emailTemplate = emailTemplates.pollClosingSoon(
            poll.club.name,
            `Poll in ${poll.club.name}`,
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
  fastify.post('/cron/reset-ai-limits', async (request, reply) => {
    if (requireCronKey(request, reply)) return;
    
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

  // Send swap review reminders (runs daily)
  fastify.post('/cron/swap-review-reminders', async (request, reply) => {
    if (requireCronKey(request, reply)) return;

    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Find swaps in DELIVERED or VERIFIED status with timestamps
      const eligibleSwaps = await prisma.swap.findMany({
        where: {
          status: { in: ['DELIVERED', 'VERIFIED'] },
          OR: [
            { deliveredAt: { lte: threeDaysAgo } },
            { verifiedAt: { lte: threeDaysAgo } },
          ],
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          responder: { select: { id: true, name: true, email: true } },
          bookOffered: { select: { title: true } },
          bookRequested: { select: { title: true } },
          reviews: { select: { reviewerId: true } },
        },
      });

      let remindersSent = 0;
      let emailsSent = 0;

      for (const swap of eligibleSwaps) {
        // Determine reference timestamp (use earliest available)
        const refTimestamp = swap.deliveredAt || swap.verifiedAt;
        if (!refTimestamp) continue; // Skip swaps without timestamps

        const daysWaiting = Math.floor(
          (now.getTime() - refTimestamp.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if both reviews are complete
        const requesterReviewed = swap.reviews.some(r => r.reviewerId === swap.requesterId);
        const responderReviewed = swap.reviews.some(r => r.reviewerId === swap.responderId);

        if (requesterReviewed && responderReviewed) {
          continue; // Both reviewed - skip
        }

        // Process each participant who hasn't reviewed
        const participantsToRemind = [];

        if (!requesterReviewed) {
          participantsToRemind.push({
            userId: swap.requesterId,
            userName: swap.requester.name,
            userEmail: swap.requester.email,
            bookTitle: swap.bookRequested.title,
            partnerName: swap.responder.name,
          });
        }

        if (!responderReviewed) {
          participantsToRemind.push({
            userId: swap.responderId,
            userName: swap.responder.name,
            userEmail: swap.responder.email,
            bookTitle: swap.bookOffered.title,
            partnerName: swap.requester.name,
          });
        }

        for (const participant of participantsToRemind) {
          // Check prior reminders to enforce max 2 attempts and 48h cooldown
          const priorReminders = await prisma.notification.findMany({
            where: {
              userId: participant.userId,
              type: 'SWAP_REVIEW_REMINDER',
              metadata: {
                path: ['swapId'],
                equals: swap.id,
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          // Get highest attempt count from metadata (in case old notifications were deleted)
          let maxAttempt = 0;
          for (const reminder of priorReminders) {
            const attempt = (reminder.metadata as any)?.attempt || 0;
            if (attempt > maxAttempt) maxAttempt = attempt;
          }

          // Enforce max 2 reminders
          if (maxAttempt >= 2) {
            continue; // Already sent 2 reminders
          }

          // Enforce 48h cooldown between reminders
          if (priorReminders.length > 0) {
            const lastReminder = priorReminders[0];
            if (lastReminder.createdAt > fortyEightHoursAgo) {
              continue; // Too soon since last reminder
            }
          }

          // Send reminder only at EXACT 3-day and 7-day marks (not daily)
          const shouldSendFirstReminder = daysWaiting === 3 && maxAttempt === 0;
          const shouldSendSecondReminder = daysWaiting === 7 && maxAttempt === 1;

          if (!shouldSendFirstReminder && !shouldSendSecondReminder) {
            continue; // Not at a reminder milestone
          }

          // Determine attempt number (1 or 2)
          const attemptNumber = maxAttempt + 1;

          // Create notification with attempt tracking
          await createNotification(participant.userId, 'SWAP_REVIEW_REMINDER', {
            swapId: swap.id,
            bookTitle: participant.bookTitle,
            partnerName: participant.partnerName,
            daysWaiting,
            attempt: attemptNumber,
          });
          remindersSent++;

          // Send email reminder
          const emailTemplate = emailTemplates.swapReviewReminder(
            participant.bookTitle,
            participant.partnerName,
            daysWaiting
          );

          const emailSent = await sendNotificationEmail(
            participant.userId,
            'swap_review_reminder',
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
          swapsChecked: eligibleSwaps.length,
          remindersSent,
          emailsSent,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to send swap review reminders',
      });
    }
  });

  // Health check endpoint
  fastify.get('/cron/health', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  });
}
