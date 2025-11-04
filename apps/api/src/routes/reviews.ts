import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateReviewSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';

export async function reviewRoutes(fastify: FastifyInstance) {
  // Get reviews for a book
  fastify.get('/book/:bookId', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string };

      const reviews = await prisma.review.findMany({
        where: { bookId },
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: reviews } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
      } as ApiResponse;
    }
  });

  // Create a review (authenticated only)
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const validated = CreateReviewSchema.parse(request.body);

      // Verify the swap exists and user is part of it
      const swap = await prisma.swap.findUnique({
        where: { id: validated.swapId },
      });

      if (!swap) {
        reply.code(404);
        return { success: false, error: 'Swap not found' } as ApiResponse;
      }

      if (swap.requesterId !== request.user.id && swap.responderId !== request.user.id) {
        reply.code(403);
        return { success: false, error: 'Not authorized to review this swap' } as ApiResponse;
      }

      // Check if review already exists
      const existing = await prisma.review.findUnique({
        where: {
          swapId_reviewerId: {
            swapId: validated.swapId,
            reviewerId: request.user.id,
          },
        },
      });

      if (existing) {
        reply.code(400);
        return { success: false, error: 'You have already reviewed this swap' } as ApiResponse;
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          reviewerId: request.user.id,
          revieweeId: validated.revieweeId,
          swapId: validated.swapId,
          bookId: validated.bookId,
          rating: validated.rating,
          comment: validated.comment,
          verifiedSwap: swap.status === 'VERIFIED',
        },
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      reply.code(201);
      return { success: true, data: review } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create review',
      } as ApiResponse;
    }
  });
}
