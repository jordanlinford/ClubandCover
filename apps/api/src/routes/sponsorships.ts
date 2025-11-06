import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();

// Sponsorship schema (inline until types package builds)
const CreateSponsorshipSchema = z.object({
  pitchId: z.string().uuid(),
  targetGenres: z.array(z.string()).optional().default([]), // Empty = all genres
  minMemberCount: z.number().int().min(1).optional(), // Minimum club size
  maxMemberCount: z.number().int().min(1).optional(), // Maximum club size
  targetFrequency: z.string().optional(), // e.g., "1-2", "3-5", "6+"
  budget: z.number().int().min(100), // Minimum 100 credits for sponsorship
  durationDays: z.number().int().min(1).max(90).default(30), // 1-90 days
});

/**
 * Club sponsorship routes - authors pay to feature pitches to targeted clubs
 */
export default async function sponsorshipsRoutes(app: FastifyInstance) {
  
  // Create a new club sponsorship
  app.post<{
    Params: { id: string };
  }>('/api/pitches/:id/sponsor', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const pitchId = request.params.id;
      const body = CreateSponsorshipSchema.parse(request.body);

      // Verify pitch exists and user owns it
      const pitch = await prisma.pitch.findUnique({
        where: { id: pitchId },
        select: {
          id: true,
          authorId: true,
          title: true,
          status: true,
        },
      });

      if (!pitch) {
        return reply.code(404).send({
          success: false,
          error: 'Pitch not found',
        });
      }

      if (pitch.authorId !== userId) {
        return reply.code(403).send({
          success: false,
          error: 'You can only sponsor your own pitches',
        });
      }

      // Get user's credit balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      // Check if user has enough credits
      if (user.creditBalance < body.budget) {
        return reply.code(400).send({
          success: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: user.creditBalance,
          required: body.budget,
        });
      }

      // Validate targeting parameters
      if (body.minMemberCount && body.maxMemberCount) {
        if (body.minMemberCount > body.maxMemberCount) {
          return reply.code(400).send({
            success: false,
            error: 'minMemberCount cannot be greater than maxMemberCount',
          });
        }
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

      // Create sponsorship
      const sponsorship = await prisma.sponsoredPitch.create({
        data: {
          userId,
          pitchId,
          targetGenres: body.targetGenres || [],
          minMemberCount: body.minMemberCount || null,
          maxMemberCount: body.maxMemberCount || null,
          targetFrequency: body.targetFrequency || null,
          budget: body.budget,
          startDate,
          endDate,
          isActive: true,
        },
      });

      // Deduct budget from user's credit balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          creditBalance: {
            decrement: body.budget,
          },
        },
        select: { creditBalance: true },
      });

      // Record credit transaction
      await prisma.creditTransaction.create({
        data: {
          userId,
          pitchId,
          type: 'SPONSOR_CLUB',
          amount: -body.budget, // Negative for spending
          balanceBefore: user.creditBalance,
          balanceAfter: updatedUser.creditBalance,
          description: `Sponsored "${pitch.title}" to targeted clubs for ${body.durationDays} days`,
        },
      });

      return reply.send({
        success: true,
        data: {
          sponsorship,
          creditsSpent: body.budget,
          newBalance: updatedUser.creditBalance,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to create sponsorship',
      });
    }
  });

  // Get sponsored pitches for a specific club (with targeting logic)
  app.get<{
    Params: { id: string };
  }>('/api/clubs/:id/sponsored-pitches', async (request, reply) => {
    try {
      const clubId = request.params.id;

      // Get club details to match targeting
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: {
          id: true,
          preferredGenres: true,
          frequency: true,
          _count: {
            select: {
              memberships: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      });

      if (!club) {
        return reply.code(404).send({
          success: false,
          error: 'Club not found',
        });
      }

      const memberCount = club._count.memberships;
      const now = new Date();

      // Find active sponsorships that match this club's criteria
      const sponsorships = await prisma.sponsoredPitch.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            // No genre targeting (all genres)
            { targetGenres: { equals: [] } },
            // Genre targeting matches club's genres
            { 
              targetGenres: {
                hasSome: club.preferredGenres,
              },
            },
          ],
          AND: [
            // Member count filters
            {
              OR: [
                { minMemberCount: null },
                { minMemberCount: { lte: memberCount } },
              ],
            },
            {
              OR: [
                { maxMemberCount: null },
                { maxMemberCount: { gte: memberCount } },
              ],
            },
            // Frequency filter (if specified)
            {
              OR: [
                { targetFrequency: null },
                ...(club.frequency ? [{ targetFrequency: club.frequency }] : []),
              ],
            },
          ],
        },
        include: {
          pitch: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              book: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  genres: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Limit to top 10 sponsored pitches
      });

      // Track impressions for each sponsorship
      if (sponsorships.length > 0) {
        await prisma.sponsoredPitch.updateMany({
          where: {
            id: {
              in: sponsorships.map(s => s.id),
            },
          },
          data: {
            impressions: {
              increment: 1,
            },
            creditsSpent: {
              increment: 1, // 1 credit per impression
            },
          },
        });
      }

      return reply.send({
        success: true,
        data: sponsorships
          .filter(s => s.pitch) // Only include sponsorships with valid pitch data
          .map(s => s.pitch),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get sponsored pitches',
      });
    }
  });

  // Get sponsorship analytics for an author
  app.get('/api/sponsorships/analytics', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const sponsorships = await prisma.sponsoredPitch.findMany({
        where: { userId },
        include: {
          pitch: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const analytics = sponsorships.map(s => {
        const daysTotal = Math.ceil((s.endDate.getTime() - s.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.ceil((Date.now() - s.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, daysTotal - daysElapsed);

        return {
          sponsorshipId: s.id,
          pitchId: s.pitch.id,
          pitchTitle: s.pitch.title,
          budget: s.budget,
          creditsSpent: s.creditsSpent,
          impressions: s.impressions,
          clicks: s.clicks,
          ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
          costPerImpression: s.impressions > 0 ? s.creditsSpent / s.impressions : 0,
          costPerClick: s.clicks > 0 ? s.creditsSpent / s.clicks : 0,
          startDate: s.startDate,
          endDate: s.endDate,
          isActive: s.isActive,
          daysRemaining,
        };
      });

      return reply.send({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get sponsorship analytics',
      });
    }
  });

  // Track click on sponsored pitch
  app.post<{
    Params: { id: string };
  }>('/api/sponsorships/:id/click', async (request, reply) => {
    try {
      const sponsorshipId = request.params.id;

      await prisma.sponsoredPitch.update({
        where: { id: sponsorshipId },
        data: {
          clicks: {
            increment: 1,
          },
        },
      });

      return reply.send({
        success: true,
        message: 'Click tracked',
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to track click',
      });
    }
  });
}
