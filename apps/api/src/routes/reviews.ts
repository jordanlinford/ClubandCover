import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
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

  // Submit external review (Goodreads/Amazon URL)
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const schema = z.object({
        swapId: z.string().uuid(),
        bookId: z.string().uuid(),
        revieweeId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        reviewUrl: z.string().url(),
        platform: z.enum(['goodreads', 'amazon']),
      });

      const validated = schema.parse(request.body);

      // Validate URL hostname matches platform (security: prevent phishing with goodreads.com.attacker.site)
      let hostname: string;
      try {
        const url = new URL(validated.reviewUrl);
        hostname = url.hostname.toLowerCase();
      } catch {
        reply.code(400);
        return {
          success: false,
          error: 'Invalid review URL format',
        } as ApiResponse;
      }

      // Strict hostname validation
      if (validated.platform === 'goodreads') {
        if (hostname !== 'goodreads.com' && hostname !== 'www.goodreads.com') {
          reply.code(400);
          return {
            success: false,
            error: 'Review URL must be from goodreads.com or www.goodreads.com',
          } as ApiResponse;
        }
      }

      if (validated.platform === 'amazon') {
        const validAmazonDomains = [
          'amazon.com', 'www.amazon.com',
          'amazon.co.uk', 'www.amazon.co.uk',
          'amazon.ca', 'www.amazon.ca',
          'amazon.de', 'www.amazon.de',
          'amazon.fr', 'www.amazon.fr',
          'amazon.es', 'www.amazon.es',
          'amazon.it', 'www.amazon.it',
          'amazon.co.jp', 'www.amazon.co.jp',
          'amazon.in', 'www.amazon.in',
          'amazon.com.au', 'www.amazon.com.au',
        ];
        if (!validAmazonDomains.includes(hostname)) {
          reply.code(400);
          return {
            success: false,
            error: 'Review URL must be from a valid Amazon domain',
          } as ApiResponse;
        }
      }

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

      // Create or update review (upsert)
      const review = await prisma.review.upsert({
        where: {
          swapId_reviewerId: {
            swapId: validated.swapId,
            reviewerId: request.user.id,
          },
        },
        create: {
          reviewerId: request.user.id,
          revieweeId: validated.revieweeId,
          swapId: validated.swapId,
          bookId: validated.bookId,
          rating: validated.rating,
          reviewUrl: validated.reviewUrl,
          platform: validated.platform,
          verifiedSwap: swap.status === 'VERIFIED',
        },
        update: {
          rating: validated.rating,
          reviewUrl: validated.reviewUrl,
          platform: validated.platform,
          verifiedSwap: swap.status === 'VERIFIED',
        },
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Award points if this is a verified swap review
      if (swap.status === 'VERIFIED') {
        const { awardPoints } = await import('../lib/points.js');
        await awardPoints(
          request.user.id,
          'REVIEW_VERIFIED',
          undefined,
          'REVIEW',
          review.id
        ).catch(err => {
          fastify.log.error(err, 'Failed to award REVIEW_VERIFIED points');
        });
      }

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
