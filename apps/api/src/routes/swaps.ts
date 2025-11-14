import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateSwapSchema, UpdateSwapSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';
import { hasRole, requireAuth, requireNotSuspended } from '../middleware/auth.js';
import { z } from 'zod';
import { dispatchNotification } from '../lib/notifications.js';

// Helper to check author verification status
async function checkAuthorVerification(userId: string): Promise<{ verified: boolean; error?: string; code?: string }> {
  const authorProfile = await prisma.authorProfile.findUnique({
    where: { userId },
    select: { verificationStatus: true },
  });

  if (!authorProfile) {
    return {
      verified: false,
      error: 'Please create an author profile first',
      code: 'AUTHOR_PROFILE_REQUIRED',
    };
  }

  if (authorProfile.verificationStatus === 'UNVERIFIED') {
    return {
      verified: false,
      error: 'Please submit your author profile for verification',
      code: 'VERIFICATION_NOT_SUBMITTED',
    };
  }

  if (authorProfile.verificationStatus === 'PENDING') {
    return {
      verified: false,
      error: 'Your author verification is pending review',
      code: 'VERIFICATION_PENDING',
    };
  }

  if (authorProfile.verificationStatus === 'REJECTED') {
    return {
      verified: false,
      error: 'Your author verification was rejected. Please submit new proof.',
      code: 'VERIFICATION_REJECTED',
    };
  }

  if (authorProfile.verificationStatus !== 'VERIFIED') {
    return {
      verified: false,
      error: 'Verified author status required',
      code: 'NOT_VERIFIED',
    };
  }

  return { verified: true };
}

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
  fastify.post('/', { preHandler: [requireAuth, requireNotSuspended] }, async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    // Check if user is an author - if so, they must be verified
    if (hasRole(request.user, 'AUTHOR')) {
      const verificationStatus = await checkAuthorVerification(request.user.id);
      if (!verificationStatus.verified) {
        reply.code(403);
        return {
          success: false,
          error: verificationStatus.error,
          code: verificationStatus.code,
        } as any;
      }
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

      // Send notification to responder (in-app + email)
      void dispatchNotification(
        validated.responderId,
        {
          type: 'NEW_SWAP_REQUEST',
          swapId: swap.id,
          requesterName: swap.requester.name,
          requesterId: request.user.id,
          bookOfferedTitle: swap.bookOffered.title,
          bookRequestedTitle: requestedBook.title,
        },
        request.log
      ).catch((err) => request.log.error(err, 'Failed to dispatch NEW_SWAP_REQUEST notification'));

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

    // Check if user is an author - if so, they must be verified
    if (hasRole(request.user, 'AUTHOR')) {
      const verificationStatus = await checkAuthorVerification(request.user.id);
      if (!verificationStatus.verified) {
        reply.code(403);
        return {
          success: false,
          error: verificationStatus.error,
          code: verificationStatus.code,
        } as any;
      }
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
      if (validated.status === 'ACCEPTED') {
        void dispatchNotification(
          swap.requesterId,
          {
            type: 'SWAP_ACCEPTED',
            swapId: swap.id,
            responderName: swap.responder.name,
            responderId: swap.responderId,
            bookTitle: swap.bookRequested.title,
          },
          request.log
        ).catch((err) => request.log.error(err, 'Failed to dispatch SWAP_ACCEPTED notification'));
      } else if (validated.status === 'DELIVERED') {
        void dispatchNotification(
          swap.requesterId,
          {
            type: 'SWAP_DELIVERED',
            swapId: swap.id,
            deliverable: validated.deliverable || 'Book delivery confirmed',
          },
          request.log
        ).catch((err) => request.log.error(err, 'Failed to dispatch SWAP_DELIVERED notification'));
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
        void Promise.all([
          dispatchNotification(
            swap.responderId,
            { type: 'SWAP_VERIFIED', swapId: swap.id },
            request.log
          ),
          dispatchNotification(
            swap.requesterId,
            { type: 'SWAP_VERIFIED', swapId: swap.id },
            request.log
          ),
        ]).catch((err) => request.log.error(err, 'Failed to dispatch SWAP_VERIFIED notifications'));
      } else if (validated.status === 'DECLINED') {
        void dispatchNotification(
          swap.requesterId,
          {
            type: 'SWAP_DECLINED',
            swapId: swap.id,
            responderName: swap.responder.name,
            responderId: swap.responderId,
            bookTitle: swap.bookRequested.title,
          },
          request.log
        ).catch((err) => request.log.error(err, 'Failed to dispatch SWAP_DECLINED notification'));
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
    
    // Validate request body with Zod
    const RateSwapSchema = z.object({
      overallRating: z.number().int().min(1).max(5),
      bookCondition: z.number().int().min(1).max(5),
      communication: z.number().int().min(1).max(5),
      onTime: z.boolean(),
      comment: z.string().trim().optional().transform(val => val && val.length > 0 ? val : undefined),
    });

    let validated;
    try {
      validated = RateSwapSchema.parse(request.body);
    } catch (error) {
      reply.code(400);
      return { 
        success: false, 
        error: 'Invalid rating data. All ratings must be 1-5, onTime must be boolean.' 
      } as ApiResponse;
    }

    const { overallRating, onTime, bookCondition, communication, comment } = validated;

    try {

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

      // Create rating and update reputation in a single transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the rating
        const rating = await tx.swapRating.create({
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

        // Recalculate reputation using aggregate for accuracy
        const ratingStats = await tx.swapRating.aggregate({
          where: { ratedUserId },
          _avg: { overallRating: true },
          _count: { id: true },
        });

        // Count completed swaps (as requester or responder)
        const completedSwaps = await tx.swap.count({
          where: {
            OR: [
              { requesterId: ratedUserId },
              { responderId: ratedUserId },
            ],
            status: 'VERIFIED',
          },
        });

        // Update user reputation atomically
        await tx.user.update({
          where: { id: ratedUserId },
          data: {
            reputationScore: ratingStats._avg.overallRating || 0,
            reputationCount: ratingStats._count.id,
            swapsCompleted: completedSwaps,
          },
        });

        return rating;
      });

      return { success: true, data: result } as ApiResponse;
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

  // Get all ratings status for current user's swaps (batch endpoint)
  fastify.get('/ratings/my-status', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      // Get all user's swaps
      const userSwaps = await prisma.swap.findMany({
        where: {
          OR: [
            { requesterId: request.user.id },
            { responderId: request.user.id },
          ],
          status: 'VERIFIED',
        },
        select: { id: true },
      });

      const swapIds = userSwaps.map(s => s.id);

      // Get all ratings where user is the rater
      const userRatings = await prisma.swapRating.findMany({
        where: {
          swapId: { in: swapIds },
          raterId: request.user.id,
        },
        select: {
          swapId: true,
          overallRating: true,
          onTime: true,
          bookCondition: true,
          communication: true,
          comment: true,
        },
      });

      // Create map of swapId -> rating
      const ratingsMap: Record<string, any> = {};
      userRatings.forEach(rating => {
        ratingsMap[rating.swapId] = rating;
      });

      return { success: true, data: ratingsMap } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ratings status',
      } as ApiResponse;
    }
  });
}
