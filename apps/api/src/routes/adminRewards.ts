import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export async function adminRewardRoutes(fastify: FastifyInstance) {
  // Middleware: Check STAFF role for all routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return reply.send({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { roles: true },
    });

    if (!user || !user.roles.includes('STAFF')) {
      reply.code(403);
      return reply.send({ success: false, error: 'Admin access required' });
    }
  });

  // GET /api/admin/rewards - List all rewards (including inactive)
  fastify.get('/rewards', async (request, reply) => {
    try {
      const rewards = await prisma.rewardItem.findMany({
        orderBy: [
          { isActive: 'desc' },
          { sortOrder: 'asc' },
        ],
        include: {
          contributor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
      });

      return { success: true, data: rewards };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rewards',
      };
    }
  });

  // POST /api/admin/rewards - Create new reward
  fastify.post('/rewards', async (request, reply) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        pointsCost: z.number().int().positive(),
        rewardType: z.enum(['PLATFORM', 'AUTHOR_CONTRIBUTED', 'FEATURE', 'DIGITAL']),
        contributorId: z.string().uuid().optional(),
        copiesAvailable: z.number().int().positive().optional(),
        imageUrl: z.string().url().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      });
      const validated = schema.parse(request.body);

      const reward = await prisma.rewardItem.create({
        data: validated,
        include: {
          contributor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      reply.code(201);
      return { success: true, data: reward };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create reward',
      };
    }
  });

  // PATCH /api/admin/rewards/:id - Update reward
  fastify.patch('/rewards/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        pointsCost: z.number().int().positive().optional(),
        rewardType: z.enum(['PLATFORM', 'AUTHOR_CONTRIBUTED', 'FEATURE', 'DIGITAL']).optional(),
        contributorId: z.string().uuid().nullable().optional(),
        copiesAvailable: z.number().int().positive().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      });
      const validated = schema.parse(request.body);

      // Filter out undefined values to avoid Prisma errors
      const updateData: any = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.pointsCost !== undefined) updateData.pointsCost = validated.pointsCost;
      if (validated.rewardType !== undefined) updateData.rewardType = validated.rewardType;
      if (validated.contributorId !== undefined) updateData.contributorId = validated.contributorId;
      if (validated.copiesAvailable !== undefined) updateData.copiesAvailable = validated.copiesAvailable;
      if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
      if (validated.sortOrder !== undefined) updateData.sortOrder = validated.sortOrder;

      const reward = await prisma.rewardItem.update({
        where: { id },
        data: updateData,
        include: {
          contributor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return { success: true, data: reward };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reward',
      };
    }
  });

  // DELETE /api/admin/rewards/:id - Delete reward (soft delete by setting inactive)
  fastify.delete('/rewards/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const reward = await prisma.rewardItem.update({
        where: { id },
        data: { isActive: false },
      });

      return { success: true, data: reward };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete reward',
      };
    }
  });

  // GET /api/admin/redemptions - List all redemption requests
  fastify.get('/redemptions', async (request, reply) => {
    try {
      const schema = z.object({
        status: z.enum(['PENDING', 'APPROVED', 'DECLINED', 'FULFILLED', 'CANCELLED']).optional(),
      });
      const query = schema.parse(request.query);

      const redemptions = await prisma.redemptionRequest.findMany({
        where: query.status ? { status: query.status } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              points: true,
            },
          },
          rewardItem: {
            select: {
              id: true,
              name: true,
              description: true,
              pointsCost: true,
              rewardType: true,
              imageUrl: true,
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
        error: error instanceof Error ? error.message : 'Failed to fetch redemptions',
      };
    }
  });

  // PATCH /api/admin/redemptions/:id - Approve/Decline/Fulfill redemption
  fastify.patch('/redemptions/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        status: z.enum(['APPROVED', 'DECLINED', 'FULFILLED', 'CANCELLED']),
        rejectionReason: z.string().optional(),
        notes: z.string().optional(),
      });
      const validated = schema.parse(request.body);

      // Get current redemption
      const currentRedemption = await prisma.redemptionRequest.findUnique({
        where: { id },
        include: { rewardItem: true, user: true },
      });

      if (!currentRedemption) {
        reply.code(404);
        return { success: false, error: 'Redemption not found' };
      }

      if (currentRedemption.status !== 'PENDING' && currentRedemption.status !== 'APPROVED') {
        reply.code(400);
        return { success: false, error: 'Cannot modify this redemption' };
      }

      // Handle status changes in a transaction
      const redemption = await prisma.$transaction(async (tx) => {
        // If declining, refund points
        if (validated.status === 'DECLINED' && currentRedemption.status === 'PENDING') {
          await tx.user.update({
            where: { id: currentRedemption.userId },
            data: {
              points: { increment: currentRedemption.pointsSpent },
            },
          });

          // Create refund ledger entry
          await tx.pointLedger.create({
            data: {
              userId: currentRedemption.userId,
              type: 'REWARD_REFUNDED',
              amount: currentRedemption.pointsSpent,
              refType: 'REDEMPTION',
              refId: currentRedemption.id,
            },
          });
        }

        // If approving or fulfilling, increment copiesRedeemed
        if ((validated.status === 'APPROVED' || validated.status === 'FULFILLED') && 
            currentRedemption.status === 'PENDING') {
          await tx.rewardItem.update({
            where: { id: currentRedemption.rewardItemId },
            data: { copiesRedeemed: { increment: 1 } },
          });
        }

        // Update redemption
        return await tx.redemptionRequest.update({
          where: { id },
          data: {
            status: validated.status,
            reviewedBy: request.user!.id,
            reviewedAt: new Date(),
            rejectionReason: validated.rejectionReason,
            notes: validated.notes,
            fulfilledAt: validated.status === 'FULFILLED' ? new Date() : undefined,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                points: true,
              },
            },
            rewardItem: true,
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });

      return { success: true, data: redemption };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update redemption',
      };
    }
  });
}
