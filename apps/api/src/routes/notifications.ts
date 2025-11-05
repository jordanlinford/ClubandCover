import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import {
  getUnreadNotifications,
  getUserNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '../lib/notifications.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  // Get unread notifications
  fastify.get('/api/notifications/unread', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const notifications = await getUnreadNotifications(userId);

      return reply.send({
        success: true,
        data: notifications,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get unread notifications',
      });
    }
  });

  // Get unread count
  fastify.get('/api/notifications/unread/count', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const count = await getUnreadCount(userId);

      return reply.send({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get unread count',
      });
    }
  });

  // Get all notifications (paginated)
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>('/api/notifications', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const result = await getUserNotifications(userId, limit, offset);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get notifications',
      });
    }
  });

  // Mark notifications as read
  fastify.post<{
    Body: { notificationIds: string[] };
  }>('/api/notifications/read', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { notificationIds } = request.body;

      if (!Array.isArray(notificationIds)) {
        return reply.status(400).send({
          success: false,
          error: 'notificationIds must be an array',
        });
      }

      const count = await markNotificationsRead(userId, notificationIds);

      return reply.send({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to mark notifications as read',
      });
    }
  });

  // Mark all notifications as read
  fastify.post('/api/notifications/read-all', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const count = await markAllNotificationsRead(userId);

      return reply.send({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to mark all notifications as read',
      });
    }
  });
}
