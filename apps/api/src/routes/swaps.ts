import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateSwapSchema, UpdateSwapSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';
import { notify } from '../lib/mail';
import { hasRole } from '../middleware/auth.js';

export async function swapRoutes(fastify: FastifyInstance) {
  // Get user's swaps (sent and received)
  fastify.get('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const swaps = await prisma.swap.findMany({
        where: {
          OR: [
            { requesterId: request.user.id },
            { responderId: request.user.id },
          ],
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          responder: { select: { id: true, name: true, email: true } },
          bookOffered: true,
          bookRequested: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: swaps } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch swaps',
      } as ApiResponse;
    }
  });

  // Create swap request
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const validated = CreateSwapSchema.parse(request.body);

      // Get user with tier information
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { tier: true },
      });

      if (!user) {
        reply.code(401);
        return { success: false, error: 'User not found' } as ApiResponse;
      }

      // Enforce tier limits
      const pendingCount = await prisma.swap.count({
        where: {
          requesterId: request.user.id,
          status: { in: ['REQUESTED', 'ACCEPTED'] },
        },
      });

      const tierLimits: Record<string, number> = {
        FREE: 3,
        PRO_AUTHOR: 10,
        PRO_CLUB: 10,
        PUBLISHER: 999,
      };

      const limit = tierLimits[user.tier] || 3;

      if (pendingCount >= limit) {
        reply.code(403);
        return {
          success: false,
          error: 'You have reached your swap limit',
          code: 'SWAP_LIMIT',
          requiredTier: user.tier === 'FREE' ? 'PRO_AUTHOR' : undefined,
        } as any;
      }

      // Verify requester ≠ responder
      if (request.user.id === validated.responderId) {
        reply.code(400);
        return {
          success: false,
          error: 'Cannot swap with yourself',
        } as ApiResponse;
      }

      // Verify requester owns the offered book
      const offeredBook = await prisma.book.findUnique({
        where: { id: validated.bookOfferedId },
      });

      if (!offeredBook || offeredBook.ownerId !== request.user.id) {
        reply.code(400);
        return {
          success: false,
          error: 'You can only offer books you own',
        } as ApiResponse;
      }

      // Verify requested book exists and is available
      const requestedBook = await prisma.book.findUnique({
        where: { id: validated.bookRequestedId },
        include: { owner: true },
      });

      if (!requestedBook || !requestedBook.isAvailable) {
        reply.code(400);
        return {
          success: false,
          error: 'Requested book is not available',
        } as ApiResponse;
      }

      if (requestedBook.ownerId !== validated.responderId) {
        reply.code(400);
        return {
          success: false,
          error: 'Book does not belong to specified responder',
        } as ApiResponse;
      }

      // Detect if this is an AuthorSwap (both parties are authors)
      const requesterRoles = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { roles: true },
      });
      const responderRoles = await prisma.user.findUnique({
        where: { id: validated.responderId },
        select: { roles: true },
      });

      const isAuthorSwap = 
        requesterRoles?.roles.includes('AUTHOR') &&
        responderRoles?.roles.includes('AUTHOR');

      const swap = await prisma.swap.create({
        data: {
          requesterId: request.user.id,
          responderId: validated.responderId,
          bookOfferedId: validated.bookOfferedId,
          bookRequestedId: validated.bookRequestedId,
          message: validated.message,
          status: 'REQUESTED',
          isAuthorSwap,
        },
        include: {
          bookOffered: true,
          bookRequested: true,
          requester: { select: { id: true, name: true } },
          responder: { select: { id: true, name: true, email: true } },
        },
      });

      // Send notification to responder
      if (swap.responder.email) {
        await notify({
          event: 'swap_requested',
          recipientEmail: swap.responder.email,
          recipientName: swap.responder.name,
          data: {
            swapId: swap.id,
            bookTitle: requestedBook.title,
            requesterName: request.user.email?.split('@')[0] || 'Someone',
          },
        });
      }

      reply.code(201);
      return { success: true, data: swap } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create swap',
      } as ApiResponse;
    }
  });

  // Update swap status (with state machine + notifications)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };
      const validated = UpdateSwapSchema.parse(request.body);

      const swap = await prisma.swap.findUnique({
        where: { id },
        include: {
          bookOffered: true,
          bookRequested: true,
          requester: { select: { id: true, name: true, email: true } },
          responder: { select: { id: true, name: true, email: true } },
        },
      });

      if (!swap) {
        reply.code(404);
        return { success: false, error: 'Swap not found' } as ApiResponse;
      }

      // Check authorization (involved parties or STAFF)
      const isInvolved =
        swap.requesterId === request.user.id || swap.responderId === request.user.id;

      const isStaff = hasRole(request.user, 'STAFF');

      if (!isInvolved && !isStaff) {
        reply.code(403);
        return { success: false, error: 'Not authorized to update this swap' } as ApiResponse;
      }

      // State machine validation
      const validTransitions: Record<string, string[]> = {
        REQUESTED: ['ACCEPTED', 'DECLINED'],
        ACCEPTED: ['DELIVERED', 'DECLINED'],
        DECLINED: [],
        DELIVERED: ['VERIFIED'],
        VERIFIED: [],
      };

      if (validated.status && !validTransitions[swap.status]?.includes(validated.status)) {
        reply.code(400);
        return {
          success: false,
          error: `Cannot transition from ${swap.status} to ${validated.status}`,
        } as ApiResponse;
      }

      // Build update data
      const updateData: any = {};
      if (validated.status) updateData.status = validated.status;
      if (validated.dueDate) updateData.dueDate = new Date(validated.dueDate);
      if (validated.deliverable) updateData.deliverable = validated.deliverable;
      
      // Populate timestamps for review reminder tracking
      if (validated.status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      } else if (validated.status === 'VERIFIED') {
        updateData.verifiedAt = new Date();
      }

      const updated = await prisma.swap.update({
        where: { id },
        data: updateData,
        include: {
          bookOffered: true,
          bookRequested: true,
          requester: { select: { id: true, name: true, email: true } },
          responder: { select: { id: true, name: true, email: true } },
        },
      });

      // Send notifications based on status
      if (validated.status === 'ACCEPTED' && swap.requester.email) {
        await notify({
          event: 'swap_accepted',
          recipientEmail: swap.requester.email,
          recipientName: swap.requester.name,
          data: {
            swapId: swap.id,
            responderName: swap.responder.name,
          },
        });
      } else if (validated.status === 'DELIVERED' && swap.requester.email) {
        await notify({
          event: 'swap_delivered',
          recipientEmail: swap.requester.email,
          recipientName: swap.requester.name,
          data: {
            swapId: swap.id,
            deliverable: validated.deliverable,
          },
        });
      } else if (validated.status === 'VERIFIED') {
        // Create verified review
        await prisma.review.create({
          data: {
            reviewerId: swap.requesterId,
            revieweeId: swap.responderId,
            swapId: swap.id,
            bookId: swap.bookRequestedId,
            rating: 5, // Default verified swap rating
            comment: 'Verified book swap completed successfully',
            verifiedSwap: true,
          },
        });

        // Notify both parties
        if (swap.responder.email) {
          await notify({
            event: 'swap_verified',
            recipientEmail: swap.responder.email,
            recipientName: swap.responder.name,
            data: { swapId: swap.id },
          });
        }
        if (swap.requester.email) {
          await notify({
            event: 'swap_verified',
            recipientEmail: swap.requester.email,
            recipientName: swap.requester.name,
            data: { swapId: swap.id },
          });
        }
      } else if (validated.status === 'DECLINED' && swap.requester.email) {
        await notify({
          event: 'swap_declined',
          recipientEmail: swap.requester.email,
          recipientName: swap.requester.name,
          data: { swapId: swap.id },
        });
      }

      return { success: true, data: updated } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update swap',
      } as ApiResponse;
    }
  });

  // Submit rating for swap partner
  fastify.post('/:id/rate', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    const { id } = request.params as { id: string };
    const { overallRating, onTime, bookCondition, communication, comment } = request.body as {
      overallRating: number;
      onTime: boolean;
      bookCondition: number;
      communication: number;
      comment?: string;
    };

    try {
      // Validate ratings are 1-5
      if (
        overallRating < 1 || overallRating > 5 ||
        bookCondition < 1 || bookCondition > 5 ||
        communication < 1 || communication > 5
      ) {
        reply.code(400);
        return { success: false, error: 'Ratings must be between 1 and 5' } as ApiResponse;
      }

      // Get swap with participants
      const swap = await prisma.swap.findUnique({
        where: { id },
        include: {
          requester: { select: { id: true, name: true } },
          responder: { select: { id: true, name: true } },
        },
      });

      if (!swap) {
        reply.code(404);
        return { success: false, error: 'Swap not found' } as ApiResponse;
      }

      // Verify user is part of the swap
      const isRequester = swap.requesterId === request.user.id;
      const isResponder = swap.responderId === request.user.id;

      if (!isRequester && !isResponder) {
        reply.code(403);
        return { success: false, error: 'Not authorized to rate this swap' } as ApiResponse;
      }

      // Swap must be VERIFIED before rating
      if (swap.status !== 'VERIFIED') {
        reply.code(400);
        return { success: false, error: 'Can only rate verified swaps' } as ApiResponse;
      }

      // Determine who is being rated
      const ratedUserId = isRequester ? swap.responderId : swap.requesterId;

      // Check if user already rated this swap
      const existingRating = await prisma.swapRating.findUnique({
        where: {
          swapId_raterId: {
            swapId: id,
            raterId: request.user.id,
          },
        },
      });

      if (existingRating) {
        reply.code(409);
        return { success: false, error: 'You have already rated this swap' } as ApiResponse;
      }

      // Create the rating
      const rating = await prisma.swapRating.create({
        data: {
          swapId: id,
          raterId: request.user.id,
          ratedUserId,
          overallRating,
          onTime,
          bookCondition,
          communication,
          comment: comment || null,
        },
      });

      // Recalculate reputation for the rated user
      const allRatings = await prisma.swapRating.findMany({
        where: { ratedUserId },
        select: { overallRating: true },
      });

      const avgRating = allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length;

      await prisma.user.update({
        where: { id: ratedUserId },
        data: {
          reputationScore: avgRating,
          reputationCount: allRatings.length,
        },
      });

      return { success: true, data: rating } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit rating',
      } as ApiResponse;
    }
  });

  // Get ratings for a swap
  fastify.get('/:id/ratings', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const ratings = await prisma.swapRating.findMany({
        where: { swapId: id },
        include: {
          rater: { select: { id: true, name: true } },
          ratedUser: { select: { id: true, name: true } },
        },
      });

      return { success: true, data: ratings } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ratings',
      } as ApiResponse;
    }
  });
}
