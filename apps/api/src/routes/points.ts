import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { getUserPointHistory, getUserPoints } from '../lib/points.js';
import { getUserBadges, getBadgeProgress, BADGE_CATALOG } from '../lib/badges.js';

export default async function pointsRoutes(app: FastifyInstance) {
  // Get current user's points and ledger
  app.get('/points/me', { preHandler: [requireAuth] }, async (request, reply) => {
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
  app.get('/badges/me', { preHandler: [requireAuth] }, async (request, reply) => {
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

  // Get badge progress (all badges with earned status and progress tracking)
  app.get('/badges/progress', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const [userBadges, progressData] = await Promise.all([
        getUserBadges(userId),
        getBadgeProgress(userId),
      ]);

      // Create a set of earned badge codes
      const earnedBadgeCodes = new Set(userBadges.map((ub) => ub.code));

      // Map all badges from catalog with earned status and progress
      const allBadges = Object.entries(BADGE_CATALOG).map(([code, badge]) => {
        const isEarned = earnedBadgeCodes.has(code);
        const userBadge = userBadges.find((ub) => ub.code === code);
        const progress = progressData[code as keyof typeof progressData];

        return {
          code,
          ...badge,
          isEarned,
          earnedAt: userBadge?.awardedAt || null,
          progress: typeof progress === 'boolean' 
            ? { complete: progress } 
            : progress || { complete: false },
        };
      });

      // Calculate statistics
      const totalBadges = allBadges.length;
      const earnedCount = allBadges.filter((b) => b.isEarned).length;
      const categories = {
        READER: allBadges.filter((b) => b.category === 'READER'),
        AUTHOR: allBadges.filter((b) => b.category === 'AUTHOR'),
        HOST: allBadges.filter((b) => b.category === 'HOST'),
      };

      return reply.send({
        success: true,
        data: {
          badges: allBadges,
          stats: {
            total: totalBadges,
            earned: earnedCount,
            progress: Math.round((earnedCount / totalBadges) * 100),
            byCategory: {
              READER: {
                total: categories.READER.length,
                earned: categories.READER.filter((b) => b.isEarned).length,
              },
              AUTHOR: {
                total: categories.AUTHOR.length,
                earned: categories.AUTHOR.filter((b) => b.isEarned).length,
              },
              HOST: {
                total: categories.HOST.length,
                earned: categories.HOST.filter((b) => b.isEarned).length,
              },
            },
          },
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch badge progress',
      });
    }
  });
}
