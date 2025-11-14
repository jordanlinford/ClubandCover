import { prisma } from './prisma.js';
import type { NotificationType } from '@prisma/client';
import { sendNotificationEmail, emailTemplates } from './email.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  data: any;
}

// Strongly typed notification payloads
export type NotificationPayload = 
  | { type: 'NEW_SWAP_REQUEST'; swapId: string; requesterName: string; requesterId: string; bookOfferedTitle: string; bookRequestedTitle: string }
  | { type: 'SWAP_ACCEPTED'; swapId: string; responderName: string; responderId: string; bookTitle: string }
  | { type: 'SWAP_DECLINED'; swapId: string; responderName: string; responderId: string; bookTitle: string }
  | { type: 'SWAP_DELIVERED'; swapId: string; deliverable: string }
  | { type: 'SWAP_VERIFIED'; swapId: string }
  | { type: 'SWAP_REVIEW_REMINDER'; swapId: string; bookTitle: string; partnerName: string; daysWaiting: number }
  | { type: 'REVIEW_SUBMITTED'; reviewId: string; reviewerName: string; reviewerId: string; bookTitle: string; platform: string }
  | { type: 'NEW_CLUB_INVITE'; clubId: string; clubName: string; inviterName: string; inviterId: string }
  | { type: 'CLUB_MENTION'; clubId: string; clubName: string; messageId: string; mentionerName: string; mentionerId: string; messagePreview: string }
  | { type: 'POLL_CREATED'; pollId: string; clubName: string; pollTitle: string }
  | { type: 'POLL_CLOSING'; pollId: string; clubName: string; pollTitle: string; hoursLeft: number }
  | { type: 'PITCH_ACCEPTED'; pitchId: string; pitchTitle: string; clubName: string }
  | { type: 'PITCH_REJECTED'; pitchId: string; pitchTitle: string }
  | { type: 'AUTHOR_NEW_PITCH'; pitchId: string; authorName: string; authorId: string; pitchTitle: string }
  | { type: 'REFERRAL_ACTIVATED'; points: number; referralCode: string }
  | { type: 'POINTS_AWARDED'; points: number; reason: string }
  | { type: 'MEMBERSHIP_APPROVED'; clubId: string; clubName: string }
  | { type: 'NEW_MESSAGE'; threadId: string; senderName: string; senderId: string; messagePreview: string };

/**
 * Unified notification dispatch service
 * Creates in-app notification and sends email if user preferences allow
 */
export async function dispatchNotification(
  userId: string,
  payload: NotificationPayload,
  logger?: any
): Promise<void> {
  try {
    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        data: payload,
      },
    });

    // Send email based on notification type and user preferences
    const emailType = getEmailType(payload.type);
    if (emailType) {
      const emailData = buildEmailData(payload);
      if (emailData) {
        await sendNotificationEmail(userId, emailType, emailData);
      }
    }
  } catch (error) {
    // Log error but don't throw to avoid blocking the request
    if (logger) {
      logger.error(error, `Failed to dispatch notification type=${payload.type} userId=${userId}`);
    } else {
      console.error('Failed to dispatch notification:', error);
    }
  }
}

/**
 * Map notification type to email type for preference checking
 */
function getEmailType(type: NotificationType): string | null {
  const mapping: Record<NotificationType, string | null> = {
    NEW_SWAP_REQUEST: 'swap_update',
    SWAP_ACCEPTED: 'swap_update',
    SWAP_DECLINED: 'swap_update',
    SWAP_DELIVERED: 'swap_update',
    SWAP_VERIFIED: 'swap_update',
    SWAP_REVIEW_REMINDER: 'swap_update',
    REVIEW_SUBMITTED: 'review_update',
    NEW_CLUB_INVITE: 'club_invite',
    CLUB_MENTION: 'club_mention',
    POLL_CREATED: 'poll_reminder',
    POLL_CLOSING: 'poll_reminder',
    PITCH_ACCEPTED: null, // No email for now
    PITCH_REJECTED: null,
    AUTHOR_NEW_PITCH: null,
    REFERRAL_ACTIVATED: 'points_update',
    POINTS_AWARDED: 'points_update',
    MEMBERSHIP_APPROVED: null,
    NEW_MESSAGE: null,
  };
  return mapping[type];
}

/**
 * Build email template data from notification payload
 */
function buildEmailData(payload: NotificationPayload): { subject: string; html: string } | null {
  switch (payload.type) {
    case 'NEW_SWAP_REQUEST':
      return emailTemplates.newSwapRequest(payload.requesterName, payload.bookRequestedTitle, payload.bookOfferedTitle);
    case 'SWAP_ACCEPTED':
      return emailTemplates.swapAccepted(payload.responderName, payload.bookTitle);
    case 'SWAP_DECLINED':
      return emailTemplates.swapDeclined(payload.responderName, payload.bookTitle);
    case 'SWAP_REVIEW_REMINDER':
      return emailTemplates.swapReviewReminder(payload.bookTitle, payload.partnerName, payload.daysWaiting);
    case 'REVIEW_SUBMITTED':
      return emailTemplates.reviewSubmitted(payload.reviewerName, payload.bookTitle, payload.platform);
    case 'NEW_CLUB_INVITE':
      return emailTemplates.clubInvite(payload.clubName, payload.inviterName);
    case 'CLUB_MENTION':
      return emailTemplates.clubMention(payload.mentionerName, payload.clubName, payload.messagePreview);
    case 'POLL_CLOSING':
      return emailTemplates.pollClosingSoon(payload.clubName, payload.pollTitle, payload.hoursLeft);
    case 'REFERRAL_ACTIVATED':
      return emailTemplates.referralActivated(payload.points, payload.referralCode);
    default:
      return null;
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use dispatchNotification instead
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  data: any
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        data,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      readAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });
}

/**
 * Get all notifications for a user (paginated)
 */
export async function getUserNotifications(
  userId: string,
  limit = 20,
  offset = 0
) {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({
      where: { userId },
    }),
  ]);

  return {
    notifications,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(
  userId: string,
  notificationIds: string[]
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId, // Security: ensure user owns these notifications
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Delete old notifications (cleanup job)
 * Removes notifications older than 90 days
 */
export async function deleteOldNotifications(): Promise<number> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  return result.count;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}
