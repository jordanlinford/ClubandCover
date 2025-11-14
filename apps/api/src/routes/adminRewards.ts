import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { refundPoints } from '../lib/points.js';
import { dispatchNotification } from '../lib/notifications.js';

// Metadata validators by reward type - aligned with seed data and runtime behavior
const FeatureMetadataSchema = z.object({
  // Badge grants
  badgeCode: z.string().optional(),
  
  // Pitch boosting
  boostDays: z.number().int().positive().optional(),
  boostCount: z.number().int().positive().optional(),
  
  // Tier upgrades
  durationDays: z.number().int().positive().optional(),
  tier: z.enum(['PRO', 'PUBLISHER']).optional(),
  
  // Custom features
  feature: z.string().optional(),
});

const AuthorContributedMetadataSchema = z.object({
  // Delivery configuration
  deliveryMethod: z.enum(['PHYSICAL_MAIL', 'EMAIL_CODE', 'DIGITAL_DOWNLOAD']).optional(),
  estimatedDays: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  
  // Contact info (legacy)
  deliveryInfo: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

const DigitalMetadataSchema = z.object({
  deliveryMethod: z.enum(['EMAIL_CODE', 'DIGITAL_DOWNLOAD']).optional(),
  instructions: z.string().optional(),
});

const RewardMetadataSchema = z.union([
  FeatureMetadataSchema,
  AuthorContributedMetadataSchema,
  DigitalMetadataSchema,
  z.object({}), // Empty metadata is valid for PLATFORM rewards
]);

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
        metadata: z.any().optional(), // Will be validated below
      });
      const validated = schema.parse(request.body);

      // Validate metadata if provided - must match reward type
      if (validated.metadata) {
        if (validated.rewardType === 'FEATURE') {
          const validation = FeatureMetadataSchema.safeParse(validated.metadata);
          if (!validation.success) {
            reply.code(400);
            return {
              success: false,
              error: 'Invalid FEATURE metadata: ' + validation.error.message,
            };
          }
        } else if (validated.rewardType === 'AUTHOR_CONTRIBUTED') {
          const validation = AuthorContributedMetadataSchema.safeParse(validated.metadata);
          if (!validation.success) {
            reply.code(400);
            return {
              success: false,
              error: 'Invalid AUTHOR_CONTRIBUTED metadata: ' + validation.error.message,
            };
          }
        } else if (validated.rewardType === 'DIGITAL') {
          const validation = DigitalMetadataSchema.safeParse(validated.metadata);
          if (!validation.success) {
            reply.code(400);
            return {
              success: false,
              error: 'Invalid DIGITAL metadata: ' + validation.error.message,
            };
          }
        } else if (validated.rewardType === 'PLATFORM' && Object.keys(validated.metadata).length > 0) {
          reply.code(400);
          return {
            success: false,
            error: 'Reward type PLATFORM does not support metadata',
          };
        }
      }

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
        metadata: z.any().optional(),
      });
      const validated = schema.parse(request.body);

      // Get current reward to validate metadata against type
      const currentReward = await prisma.rewardItem.findUnique({
        where: { id },
      });

      if (!currentReward) {
        reply.code(404);
        return { success: false, error: 'Reward not found' };
      }

      // Validate metadata if provided - must match reward type
      if (validated.metadata !== undefined) {
        const rewardType = validated.rewardType || currentReward.rewardType;
        if (rewardType === 'FEATURE') {
          const validation = FeatureMetadataSchema.safeParse(validated.metadata);
          if (!validation.success) {
            reply.code(400);
            return {
              success: false,
              error: 'Invalid FEATURE metadata: ' + validation.error.message,
            };
          }
        } else if (rewardType === 'AUTHOR_CONTRIBUTED') {
          const validation = AuthorContributedMetadataSchema.safeParse(validated.metadata);
          if (!validation.success) {
            reply.code(400);
            return {
              success: false,
              error: 'Invalid AUTHOR_CONTRIBUTED metadata: ' + validation.error.message,
            };
          }
        } else if (rewardType === 'DIGITAL') {
          const validation = DigitalMetadataSchema.safeParse(validated.metadata);
          if (!validation.success) {
            reply.code(400);
            return {
              success: false,
              error: 'Invalid DIGITAL metadata: ' + validation.error.message,
            };
          }
        } else if (rewardType === 'PLATFORM' && validated.metadata !== null && Object.keys(validated.metadata).length > 0) {
          reply.code(400);
          return {
            success: false,
            error: 'Reward type PLATFORM does not support metadata',
          };
        }
      }

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
      if (validated.metadata !== undefined) updateData.metadata = validated.metadata;

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

      // Handle status changes in an atomic transaction
      const redemption = await prisma.$transaction(async (tx) => {
        // Re-fetch the redemption inside the transaction to get fresh state
        // This prevents stale reads during concurrent admin operations
        const freshRedemption = await tx.redemptionRequest.findUnique({
          where: { id },
          include: {
            rewardItem: true,
            user: true,
          },
        });

        if (!freshRedemption) {
          throw new Error('Redemption not found');
        }

        // For declines/cancellations, atomically transition status and handle refunds
        if (validated.status === 'DECLINED' || validated.status === 'CANCELLED') {
          // Atomically update status from PENDING or APPROVED to prevent concurrent double-refunds
          const statusUpdate = await tx.redemptionRequest.updateMany({
            where: {
              id,
              status: { in: ['PENDING', 'APPROVED'] }, // Only transition from these states
            },
            data: {
              status: validated.status,
              reviewedBy: request.user!.id,
              reviewedAt: new Date(),
              rejectionReason: validated.rejectionReason,
              notes: validated.notes,
            },
          });

          // If no rows were updated, the redemption was already processed
          if (statusUpdate.count === 0) {
            throw new Error('Redemption has already been processed');
          }

          // Release inventory using fresh data (decrement copiesRedeemed since it was incremented at creation)
          if (freshRedemption.rewardItem.copiesAvailable !== null) {
            const releaseResult = await tx.rewardItem.updateMany({
              where: {
                id: freshRedemption.rewardItemId,
                copiesRedeemed: { gt: 0 }, // Ensure we don't go negative
              },
              data: {
                copiesRedeemed: { decrement: 1 },
              },
            });

            if (releaseResult.count === 0) {
              throw new Error('Failed to release inventory - may already be released');
            }
          }

          // Refund points using the shared points service
          const refundResult = await refundPoints(
            freshRedemption.userId,
            freshRedemption.pointsSpent,
            'REWARD_REFUNDED',
            'REDEMPTION',
            freshRedemption.id,
            tx
          );

          if (!refundResult.ok) {
            throw new Error('Failed to refund points');
          }

          // Create audit log entry
          await tx.redemptionAuditLog.create({
            data: {
              redemptionId: id,
              actionType: 'STATUS_CHANGE',
              oldStatus: freshRedemption.status,
              newStatus: validated.status,
              changedBy: request.user!.id,
              reason: validated.rejectionReason || validated.notes || `Status changed to ${validated.status}`,
              metadata: {
                pointsRefunded: freshRedemption.pointsSpent,
                inventoryReleased: freshRedemption.rewardItem.copiesAvailable !== null,
              },
            },
          });

          // Fetch and return the updated redemption
          const updated = await tx.redemptionRequest.findUnique({
            where: { id },
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

          if (!updated) {
            throw new Error('Redemption not found after update');
          }

          return updated;
        }

        // For approvals/fulfillments, atomically transition status
        // Note: Inventory was already reserved at creation, points already deducted
        const statusUpdate = await tx.redemptionRequest.updateMany({
          where: {
            id,
            status: { in: ['PENDING', 'APPROVED'] }, // Only transition from these states
          },
          data: {
            status: validated.status,
            reviewedBy: request.user!.id,
            reviewedAt: new Date(),
            notes: validated.notes,
            fulfilledAt: validated.status === 'FULFILLED' ? new Date() : undefined,
          },
        });

        // If no rows were updated, the redemption was already processed
        if (statusUpdate.count === 0) {
          throw new Error('Redemption has already been processed');
        }

        // Create audit log entry
        await tx.redemptionAuditLog.create({
          data: {
            redemptionId: id,
            actionType: 'STATUS_CHANGE',
            oldStatus: freshRedemption.status,
            newStatus: validated.status,
            changedBy: request.user!.id,
            reason: validated.notes || `Status changed to ${validated.status}`,
            metadata: {
              reviewedAt: new Date().toISOString(),
            },
          },
        });

        // Fetch and return the updated redemption
        const updated = await tx.redemptionRequest.findUnique({
          where: { id },
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

        if (!updated) {
          throw new Error('Redemption not found after update');
        }

        return updated;
      });

      // Send notification for status change
      const notificationPayload = (() => {
        const baseData = {
          redemptionId: redemption.id,
          rewardName: redemption.rewardItem.name,
          pointsSpent: redemption.pointsSpent,
          status: validated.status,
          note: validated.notes || validated.rejectionReason,
        };
        
        switch (validated.status) {
          case 'APPROVED':
            return { type: 'REDEMPTION_APPROVED' as const, ...baseData };
          case 'DECLINED':
            return { type: 'REDEMPTION_DECLINED' as const, ...baseData };
          case 'FULFILLED':
            return { type: 'REDEMPTION_FULFILLED' as const, ...baseData };
          case 'CANCELLED':
            return { type: 'REDEMPTION_CANCELLED' as const, ...baseData };
          default:
            return null;
        }
      })();

      if (notificationPayload) {
        void dispatchNotification(
          redemption.userId,
          notificationPayload,
          request.log
        ).catch((err) => request.log.error(err, 'Failed to dispatch redemption notification'));
      }

      // Trigger platform behavior on APPROVED status
      if (validated.status === 'APPROVED' && redemption.rewardItem.rewardType === 'FEATURE') {
        try {
          // Validate and parse metadata with runtime guards
          const metadataValidation = FeatureMetadataSchema.safeParse(redemption.rewardItem.metadata);
          
          if (!metadataValidation.success) {
            request.log.warn(
              { rewardId: redemption.rewardItemId, error: metadataValidation.error },
              'Reward metadata validation failed - skipping platform behavior'
            );
          } else {
            const metadata = metadataValidation.data;
            
            // Grant badge if badgeCode is specified
            if (metadata.badgeCode) {
              const badgeResult = await prisma.userBadge.upsert({
                where: {
                  userId_code: {
                    userId: redemption.userId,
                    code: metadata.badgeCode,
                  },
                },
                create: {
                  userId: redemption.userId,
                  code: metadata.badgeCode,
                },
                update: {}, // Badge already exists, no-op
              });
              
              // Log badge grant in audit trail
              await prisma.redemptionAuditLog.create({
                data: {
                  redemptionId: redemption.id,
                  actionType: 'BADGE_GRANT',
                  changedBy: request.user!.id,
                  reason: `Badge ${metadata.badgeCode} granted via reward approval`,
                  metadata: {
                    badgeCode: metadata.badgeCode,
                    userId: redemption.userId,
                  },
                },
              });
              
              request.log.info(`Granted badge ${metadata.badgeCode} to user ${redemption.userId}`);
            }
            
            // Boost pitch if boostDays is specified (requires pitch selection by user)
            // TODO: Add RedemptionRequest.pitchId field to track which pitch to boost
            // For now, this is logged and would require manual follow-up
            if (metadata.boostDays) {
              request.log.info(
                { userId: redemption.userId, boostDays: metadata.boostDays, redemptionId: redemption.id },
                'Pitch boost redemption approved - awaiting pitch selection implementation'
              );
            }
          }
        } catch (error) {
          request.log.error(error, 'Failed to apply reward platform behavior');
        }
      }

      return { success: true, data: redemption };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update redemption',
      };
    }
  });

  // POST /api/admin/rewards/badges/grant - Manually grant a badge to a user
  fastify.post('/rewards/badges/grant', async (request, reply) => {
    try {
      const schema = z.object({
        userId: z.string().uuid(),
        badgeCode: z.string().min(1),
        reason: z.string().optional(),
      });
      const validated = schema.parse(request.body);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: validated.userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' };
      }

      // Grant badge (upsert to handle duplicates gracefully)
      const badge = await prisma.userBadge.upsert({
        where: {
          userId_code: {
            userId: validated.userId,
            code: validated.badgeCode,
          },
        },
        create: {
          userId: validated.userId,
          code: validated.badgeCode,
        },
        update: {}, // Badge already exists, no-op
      });

      request.log.info(
        { userId: validated.userId, badgeCode: validated.badgeCode, adminId: request.user!.id },
        'Badge manually granted by admin'
      );

      return {
        success: true,
        data: {
          badge,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grant badge',
      };
    }
  });

  // PATCH /api/admin/users/:id/points - Manually adjust user points
  fastify.patch('/users/:id/points', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        amount: z.number().int(),
        reason: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      });
      const validated = schema.parse(request.body);

      // Perform adjustment in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get current user
        const user = await tx.user.findUnique({
          where: { id },
          select: { id: true, name: true, email: true, points: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Prevent negative points
        const newPoints = user.points + validated.amount;
        if (newPoints < 0) {
          throw new Error(`Cannot reduce points below zero. User has ${user.points} points, adjustment is ${validated.amount}`);
        }

        // Update user points
        const updatedUser = await tx.user.update({
          where: { id },
          data: { points: newPoints },
          select: { id: true, name: true, email: true, points: true },
        });

        // Create audit log
        await tx.pointsAdjustmentLog.create({
          data: {
            userId: id,
            amount: validated.amount,
            reason: validated.reason,
            adjustedBy: request.user!.id,
            metadata: validated.metadata,
          },
        });

        // Create point ledger entry for tracking
        await tx.pointLedger.create({
          data: {
            userId: id,
            type: validated.amount > 0 ? 'EARNED' : 'SPENT',
            amount: Math.abs(validated.amount),
            refType: 'ADMIN_ADJUSTMENT',
            refId: request.user!.id,
          },
        });

        return updatedUser;
      });

      request.log.info(
        {
          userId: id,
          amount: validated.amount,
          newBalance: result.points,
          adminId: request.user!.id,
          reason: validated.reason,
        },
        'Points manually adjusted by admin'
      );

      return { success: true, data: result };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust points',
      };
    }
  });

  // POST /api/admin/rewards/grant - Directly grant a reward to a user (bypass redemption)
  fastify.post('/rewards/grant', async (request, reply) => {
    try {
      const schema = z.object({
        userId: z.string().uuid(),
        rewardItemId: z.string().uuid(),
        reason: z.string().min(1),
        skipNotification: z.boolean().optional().default(false),
      });
      const validated = schema.parse(request.body);

      // Verify user and reward exist
      const [user, reward] = await Promise.all([
        prisma.user.findUnique({
          where: { id: validated.userId },
          select: { id: true, name: true, email: true, points: true },
        }),
        prisma.rewardItem.findUnique({
          where: { id: validated.rewardItemId },
        }),
      ]);

      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' };
      }

      if (!reward) {
        reply.code(404);
        return { success: false, error: 'Reward not found' };
      }

      // Create a redemption record marked as fulfilled, with zero points cost
      const redemption = await prisma.$transaction(async (tx) => {
        const created = await tx.redemptionRequest.create({
          data: {
            userId: validated.userId,
            rewardItemId: validated.rewardItemId,
            pointsSpent: 0, // Admin grants are free
            status: 'FULFILLED',
            reviewedBy: request.user!.id,
            reviewedAt: new Date(),
            fulfilledAt: new Date(),
            notes: `Admin grant: ${validated.reason}`,
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
          },
        });

        // Create audit log
        await tx.redemptionAuditLog.create({
          data: {
            redemptionId: created.id,
            actionType: 'MANUAL_GRANT',
            newStatus: 'FULFILLED',
            changedBy: request.user!.id,
            reason: validated.reason,
            metadata: {
              grantedByAdmin: true,
              adminId: request.user!.id,
              skipNotification: validated.skipNotification,
            },
          },
        });

        return created;
      });

      // Send notification unless skipped
      if (!validated.skipNotification) {
        void dispatchNotification(
          validated.userId,
          {
            type: 'REDEMPTION_FULFILLED',
            redemptionId: redemption.id,
            rewardName: reward.name,
            pointsSpent: 0,
            status: 'FULFILLED',
            note: 'Congratulations! This reward was granted to you by an administrator.',
          },
          request.log
        ).catch((err) => request.log.error(err, 'Failed to dispatch grant notification'));
      }

      request.log.info(
        {
          userId: validated.userId,
          rewardId: validated.rewardItemId,
          rewardName: reward.name,
          adminId: request.user!.id,
          reason: validated.reason,
        },
        'Reward manually granted by admin'
      );

      return { success: true, data: redemption };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grant reward',
      };
    }
  });

  // GET /api/admin/redemptions/:id/audit - Get audit log for a redemption
  fastify.get('/redemptions/:id/audit', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const logs = await prisma.redemptionAuditLog.findMany({
        where: { redemptionId: id },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return { success: true, data: logs };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
      };
    }
  });

  // GET /api/admin/users/:id/points/history - Get points adjustment history for a user
  fastify.get('/users/:id/points/history', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const logs = await prisma.pointsAdjustmentLog.findMany({
        where: { userId: id },
        include: {
          adjuster: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to last 100 adjustments
      });

      return { success: true, data: logs };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch points history',
      };
    }
  });
}
