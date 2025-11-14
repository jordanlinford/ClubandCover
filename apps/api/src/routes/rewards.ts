import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

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

      // Check if reward is in stock
      if (reward.copiesAvailable && reward.copiesRedeemed >= reward.copiesAvailable) {
        reply.code(400);
        return { success: false, error: 'This reward is out of stock' };
      }

      // Get user's current points
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { points: true },
      });

      if (!user || user.points < reward.pointsCost) {
        reply.code(400);
        return { success: false, error: 'Insufficient points' };
      }

      // Create redemption request and deduct points in a transaction
      const redemption = await prisma.$transaction(async (tx) => {
        // Deduct points immediately
        await tx.user.update({
          where: { id: request.user!.id },
          data: {
            points: { decrement: reward.pointsCost },
          },
        });

        // Create point ledger entry
        await tx.pointLedger.create({
          data: {
            userId: request.user!.id,
            type: 'REWARD_REDEEMED',
            amount: -reward.pointsCost,
            refType: 'REWARD',
            refId: reward.id,
          },
        });

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
