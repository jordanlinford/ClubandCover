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

      // Enforce HTTPS for security
      const url = new URL(validated.reviewUrl);
      if (url.protocol !== 'https:') {
        reply.code(400);
        return {
          success: false,
          error: 'Review URL must use HTTPS',
        } as ApiResponse;
      }

      // Strict hostname validation with subdomain support
      if (validated.platform === 'goodreads') {
        const validGoodreadsDomains = [
          'goodreads.com', 'www.goodreads.com', 'm.goodreads.com'
        ];
        if (!validGoodreadsDomains.includes(hostname)) {
          reply.code(400);
          return {
            success: false,
            error: 'Review URL must be from goodreads.com or a valid Goodreads subdomain',
          } as ApiResponse;
        }
      }

      if (validated.platform === 'amazon') {
        const validAmazonDomains = [
          'amazon.com', 'www.amazon.com', 'smile.amazon.com',
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

      // Check for duplicate review URL (prevent reusing someone else's review)
      const existingReviewWithUrl = await prisma.review.findFirst({
        where: {
          reviewUrl: validated.reviewUrl,
          NOT: {
            AND: [
              { swapId: validated.swapId },
              { reviewerId: request.user.id }
            ]
          }
        },
      });

      if (existingReviewWithUrl) {
        reply.code(409);
        return { 
          success: false, 
          error: 'This review URL has already been submitted by another user' 
        } as ApiResponse;
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

      // Award badges for verified swap reviews (no points for swaps)
      if (swap.status === 'VERIFIED') {
        const { maybeAwardSwapVerified, maybeAwardSwapMaster } = await import('../lib/award.js');
        await maybeAwardSwapVerified(request.user.id).catch(err => {
          fastify.log.error(err, 'Failed to check SWAP_VERIFIED badge');
        });
        await maybeAwardSwapMaster(request.user.id).catch(err => {
          fastify.log.error(err, 'Failed to check SWAP_MASTER badge');
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

  // Submit club book review (club members reviewing club-selected books)
  fastify.post('/club', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const schema = z.object({
        clubId: z.string().uuid(),
        bookId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        reviewUrl: z.string().url(),
        platform: z.enum(['goodreads', 'amazon']),
      });

      const validated = schema.parse(request.body);

      // Validate URL hostname and enforce HTTPS (security: prevent phishing)
      let hostname: string;
      let url: URL;
      try {
        url = new URL(validated.reviewUrl);
        hostname = url.hostname.toLowerCase();
      } catch {
        reply.code(400);
        return {
          success: false,
          error: 'Invalid review URL format',
        } as ApiResponse;
      }

      // Enforce HTTPS for security
      if (url.protocol !== 'https:') {
        reply.code(400);
        return {
          success: false,
          error: 'Review URL must use HTTPS',
        } as ApiResponse;
      }

      // Strict hostname validation with subdomain support
      if (validated.platform === 'goodreads') {
        const validGoodreadsDomains = [
          'goodreads.com', 'www.goodreads.com', 'm.goodreads.com'
        ];
        if (!validGoodreadsDomains.includes(hostname)) {
          reply.code(400);
          return {
            success: false,
            error: 'Review URL must be from goodreads.com or a valid Goodreads subdomain',
          } as ApiResponse;
        }
      }

      if (validated.platform === 'amazon') {
        const validAmazonDomains = [
          'amazon.com', 'www.amazon.com', 'smile.amazon.com',
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

      // Verify user is an active member of the club
      const membership = await prisma.membership.findFirst({
        where: {
          userId: request.user.id,
          clubId: validated.clubId,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        reply.code(403);
        return {
          success: false,
          error: 'Must be an active club member to review club books',
        } as ApiResponse;
      }

      // Verify book is in the club's ClubBook list (club selected it)
      const clubBook = await prisma.clubBook.findFirst({
        where: {
          clubId: validated.clubId,
          bookId: validated.bookId,
        },
        include: {
          book: {
            include: {
              pitch: { take: 1 }, // Verify book is from pitch library
            },
          },
        },
      });

      if (!clubBook) {
        reply.code(404);
        return {
          success: false,
          error: 'Book is not in this club\'s selected books list',
        } as ApiResponse;
      }

      // Additional validation: ensure book is from pitch library
      if (!clubBook.book.pitch || clubBook.book.pitch.length === 0) {
        reply.code(400);
        return {
          success: false,
          error: 'Book must be from the pitch library',
        } as ApiResponse;
      }

      // Check for duplicate review URL (prevent reusing someone else's review)
      const existingReviewWithUrl = await prisma.review.findFirst({
        where: {
          reviewUrl: validated.reviewUrl,
          NOT: {
            AND: [
              { clubBookId: clubBook.id },
              { reviewerId: request.user.id }
            ]
          }
        },
      });

      if (existingReviewWithUrl) {
        reply.code(409);
        return { 
          success: false, 
          error: 'This review URL has already been submitted by another user' 
        } as ApiResponse;
      }

      // Check if user already reviewed this club book
      const existingReview = await prisma.review.findFirst({
        where: {
          clubBookId: clubBook.id,
          reviewerId: request.user.id,
        },
      });

      if (existingReview) {
        reply.code(409);
        return {
          success: false,
          error: 'You have already reviewed this club book',
        } as ApiResponse;
      }

      // Create club book review
      const review = await prisma.review.create({
        data: {
          reviewerId: request.user.id,
          clubBookId: clubBook.id,
          bookId: validated.bookId,
          rating: validated.rating,
          reviewUrl: validated.reviewUrl,
          platform: validated.platform,
          verifiedSwap: false,
        },
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Award 50 points for club book review
      const { awardPoints } = await import('../lib/points.js');
      await awardPoints(
        request.user.id,
        'REVIEW_VERIFIED',
        50,
        'CLUB_REVIEW',
        review.id
      ).catch(err => {
        fastify.log.error(err, 'Failed to award points for club review');
      });

      // Check and award badges
      const { maybeAwardBookReviewer, maybeAwardCritic } = await import('../lib/award.js');
      await maybeAwardBookReviewer(request.user.id).catch(err => {
        fastify.log.error(err, 'Failed to check BOOK_REVIEWER badge');
      });
      await maybeAwardCritic(request.user.id).catch(err => {
        fastify.log.error(err, 'Failed to check CRITIC badge');
      });

      reply.code(201);
      return { success: true, data: review } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create club review',
      } as ApiResponse;
    }
  });
}
