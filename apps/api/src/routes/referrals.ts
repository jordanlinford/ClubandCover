import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import {
  createReferralCode,
  activateReferralCode,
  getReferralStats,
  getUserReferrals,
} from '../lib/referrals.js';

export async function referralsRoutes(fastify: FastifyInstance) {
  // Generate a new referral code
  fastify.post(
    '/api/referrals/generate',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const result = await createReferralCode(userId);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to generate referral code',
        });
      }
    }
  );

  // Activate a referral code (for new users during signup)
  fastify.post<{
    Body: { code: string };
  }>('/api/referrals/activate', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { code } = request.body;

      if (!code || typeof code !== 'string') {
        return reply.status(400).send({
          success: false,
          error: 'Referral code is required',
        });
      }

      const result = await activateReferralCode(code.toUpperCase(), userId);

      if (!result.success) {
        if (result.alreadyActivated) {
          return reply.status(400).send({
            success: false,
            error: 'You have already used this referral code',
          });
        }

        if (result.limitReached) {
          return reply.status(400).send({
            success: false,
            error: 'This referral code has reached its activation limit for today',
          });
        }

        return reply.status(404).send({
          success: false,
          error: 'Invalid or expired referral code',
        });
      }

      return reply.send({
        success: true,
        data: {
          referrerId: result.referrerId,
          refereeId: result.refereeId,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to activate referral code',
      });
    }
  });

  // Get referral stats for current user
  fastify.get('/api/referrals/stats', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const stats = await getReferralStats(userId);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get referral stats',
      });
    }
  });

  // Get all referrals for current user
  fastify.get('/api/referrals', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const referrals = await getUserReferrals(userId);

      return reply.send({
        success: true,
        data: referrals,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get referrals',
      });
    }
  });
}
