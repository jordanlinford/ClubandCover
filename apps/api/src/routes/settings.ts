import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get user settings
  fastify.get('/api/settings', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      let settings = await prisma.userSetting.findUnique({
        where: { userId },
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.userSetting.create({
          data: {
            userId,
            emailOptIn: true,
            emailPollReminders: true,
            emailSwapUpdates: true,
            emailPointsUpdates: false,
          },
        });
      }

      return reply.send({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get settings',
      });
    }
  });

  // Update user settings
  fastify.patch<{
    Body: {
      emailOptIn?: boolean;
      emailPollReminders?: boolean;
      emailSwapUpdates?: boolean;
      emailPointsUpdates?: boolean;
    };
  }>('/api/settings', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const updates = request.body;

      // Validate that at least one field is being updated
      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No settings provided to update',
        });
      }

      // Validate fields
      const validFields = [
        'emailOptIn',
        'emailPollReminders',
        'emailSwapUpdates',
        'emailPointsUpdates',
      ];

      for (const key of Object.keys(updates)) {
        if (!validFields.includes(key)) {
          return reply.status(400).send({
            success: false,
            error: `Invalid field: ${key}`,
          });
        }

        if (typeof updates[key as keyof typeof updates] !== 'boolean') {
          return reply.status(400).send({
            success: false,
            error: `Field ${key} must be a boolean`,
          });
        }
      }

      // Update or create settings
      const settings = await prisma.userSetting.upsert({
        where: { userId },
        update: updates,
        create: {
          userId,
          emailOptIn: updates.emailOptIn ?? true,
          emailPollReminders: updates.emailPollReminders ?? true,
          emailSwapUpdates: updates.emailSwapUpdates ?? true,
          emailPointsUpdates: updates.emailPointsUpdates ?? false,
        },
      });

      return reply.send({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to update settings',
      });
    }
  });
}
