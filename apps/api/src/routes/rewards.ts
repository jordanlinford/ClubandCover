import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { spendPoints } from '../lib/points.js';

export async function rewardRoutes(fastify: FastifyInstance) {
  // GET /api/rewards - List active rewards (public)
  fastify.get('/', async (request, reply) => {
    try {
      const rewards = await prisma.rewardItem.findMany({
        where: { isActive: true },
        orderBy: [
          { sortOrder: 'asc' },
          { pointsCost: 'asc' },
        ],
        include: {
          contributor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              redemptions: {
                where: {
                  status: { in: ['APPROVED', 'FULFILLED'] },
                },
              },
            },
          },
        },
      });

      // Calculate availability for each reward
      const rewardsWithAvailability = rewards.map(reward => ({
        ...reward,
        isAvailable: reward.copiesAvailable 
          ? reward.copiesRedeemed < reward.copiesAvailable
          : true,
        remainingCopies: reward.copiesAvailable
          ? reward.copiesAvailable - reward.copiesRedeemed
          : null,
      }));

      return { success: true, data: rewardsWithAvailability };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rewards',
      };
    }
  });

  // POST /api/redemptions - Redeem a reward
  fastify.post('/redemptions', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const schema = z.object({
        rewardItemId: z.string().uuid(),
      });
      const validated = schema.parse(request.body);

      // Get reward details
      const reward = await prisma.rewardItem.findUnique({
        where: { id: validated.rewardItemId },
      });

      if (!reward) {
        reply.code(404);
        return { success: false, error: 'Reward not found' };
      }

      if (!reward.isActive) {
        reply.code(400);
        return { success: false, error: 'This reward is no longer available' };
      }

      // Atomically reserve inventory and deduct points in a single transaction
      const redemption = await prisma.$transaction(async (tx) => {
        // Reserve inventory if limited (using updateMany for atomic check-and-update)
        if (reward.copiesAvailable !== null) {
          const reserveResult = await tx.rewardItem.updateMany({
            where: {
              id: reward.id,
              copiesAvailable: { not: null },
              copiesRedeemed: { lt: reward.copiesAvailable },
            },
            data: {
              copiesRedeemed: { increment: 1 },
            },
          });

          // If no rows were updated, stock is exhausted
          if (reserveResult.count === 0) {
            throw new Error('This reward is out of stock');
          }
        }

        // Spend points using the shared points service
        const spendResult = await spendPoints(
          request.user!.id,
          reward.pointsCost,
          'REWARD_REDEEMED',
          'REWARD',
          reward.id,
          tx
        );

        if (!spendResult.ok) {
          if (spendResult.reason === 'INSUFFICIENT_POINTS') {
            throw new Error('Insufficient points');
          }
          throw new Error('Failed to deduct points');
        }

        // Create redemption request
        return await tx.redemptionRequest.create({
          data: {
            userId: request.user!.id,
            rewardItemId: reward.id,
            pointsSpent: reward.pointsCost,
            status: 'PENDING',
          },
          include: {
            rewardItem: true,
          },
        });
      });

      reply.code(201);
      return { success: true, data: redemption };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'This reward is out of stock') {
          reply.code(400);
          return { success: false, error: error.message };
        }
        if (error.message === 'Insufficient points') {
          reply.code(400);
          return { success: false, error: error.message };
        }
      }

      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redeem reward',
      };
    }
  });

  // GET /api/redemptions/me - Get user's redemption history
  fastify.get('/redemptions/me', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const redemptions = await prisma.redemptionRequest.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          rewardItem: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              rewardType: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return { success: true, data: redemptions };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch redemption history',
      };
    }
  });
}
