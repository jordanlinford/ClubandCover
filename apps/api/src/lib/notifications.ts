import { prisma } from './prisma.js';
import type { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  data: any;
}

/**
 * Create a notification for a user
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
