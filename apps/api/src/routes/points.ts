import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { getUserPointHistory, getUserPoints } from '../lib/points.js';
import { getUserBadges } from '../lib/badges.js';

export default async function pointsRoutes(app: FastifyInstance) {
  // Get current user's points and ledger
  app.get('/api/points/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const [points, ledger] = await Promise.all([
        getUserPoints(userId),
        getUserPointHistory(userId, 50),
      ]);

      return reply.send({
        success: true,
        data: {
          points,
          ledger,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch points',
      });
    }
  });

  // Get current user's badges
  app.get('/api/badges/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const badges = await getUserBadges(userId);

      return reply.send({
        success: true,
        data: {
          badges,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch badges',
      });
    }
  });
}
