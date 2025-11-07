import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import Stripe from 'stripe';

// Credit schemas (imported inline until types package builds correctly)
const PurchaseCreditsSchema = z.object({
  amount: z.number().int().min(10).max(10000), // 10-10,000 credits
  paymentMethodId: z.string(), // Stripe payment method ID
});

const SpendCreditsSchema = z.object({
  pitchId: z.string().uuid(),
  amount: z.number().int().min(10), // Minimum 10 credits to boost
  durationDays: z.number().int().min(1).max(30).default(7), // 1-30 days boost
});

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

// Credit pricing: $0.10 per credit (10 credits = $1.00)
const CREDIT_PRICE_CENTS = 10; // 10 cents per credit

/**
 * Credit purchase and spending routes
 */
export default async function creditsRoutes(app: FastifyInstance) {
  
  // Get user's credit balance and transaction history
  app.get('/api/credits/balance', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const [user, transactions] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        }),
        prisma.creditTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            pitch: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
      ]);

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      return reply.send({
        success: true,
        data: {
          balance: user.creditBalance,
          transactions,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get credit balance',
      });
    }
  });

  // Purchase credits via Stripe
  app.post('/api/credits/purchase', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const body = PurchaseCreditsSchema.parse(request.body);

      // Get user's current balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          creditBalance: true,
          stripeCustomerId: true,
          email: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      // Calculate total amount in cents
      const totalAmountCents = body.amount * CREDIT_PRICE_CENTS;

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId,
          },
        });
        customerId = customer.id;

        // Update user with Stripe customer ID
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: 'usd',
        customer: customerId,
        payment_method: body.paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          userId,
          type: 'credit_purchase',
          credits: body.amount.toString(),
        },
      });

      // Handle different PaymentIntent states for SCA/3DS support
      if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
        // SCA/3DS authentication required - return client secret to frontend
        return reply.send({
          success: false,
          code: 'REQUIRES_AUTHENTICATION',
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        });
      }

      if (paymentIntent.status === 'requires_payment_method') {
        return reply.code(400).send({
          success: false,
          error: 'Payment method declined',
          code: 'PAYMENT_METHOD_DECLINED',
        });
      }

      if (paymentIntent.status !== 'succeeded') {
        return reply.code(400).send({
          success: false,
          error: 'Payment failed',
          code: 'PAYMENT_FAILED',
          paymentStatus: paymentIntent.status,
        });
      }

      // Add credits to user balance and record transaction atomically
      const updatedUser = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            creditBalance: {
              increment: body.amount,
            },
          },
          select: { creditBalance: true },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'PURCHASE',
            amount: body.amount,
            balanceBefore: user.creditBalance,
            balanceAfter: updatedUser.creditBalance,
            stripePaymentId: paymentIntent.id,
            description: `Purchased ${body.amount} credits`,
          },
        });

        return updatedUser;
      });

      return reply.send({
        success: true,
        data: {
          creditsPurchased: body.amount,
          newBalance: updatedUser.creditBalance,
          paymentIntentId: paymentIntent.id,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to purchase credits',
      });
    }
  });

  // Confirm credit purchase after SCA/3DS completion
  app.post('/api/credits/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { paymentIntentId } = request.body as { paymentIntentId: string };

      if (!paymentIntentId) {
        return reply.code(400).send({
          success: false,
          error: 'Payment intent ID is required',
        });
      }

      // Retrieve the PaymentIntent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Verify this PaymentIntent belongs to the user
      if (paymentIntent.metadata.userId !== userId) {
        return reply.code(403).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Check if payment succeeded
      if (paymentIntent.status !== 'succeeded') {
        return reply.code(400).send({
          success: false,
          error: 'Payment not completed',
          status: paymentIntent.status,
        });
      }

      // Check if credits were already awarded (idempotency)
      const existingTransaction = await prisma.creditTransaction.findFirst({
        where: {
          stripePaymentId: paymentIntent.id,
        },
      });

      if (existingTransaction) {
        // Credits already awarded
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        });

        return reply.send({
          success: true,
          data: {
            creditsPurchased: existingTransaction.amount,
            newBalance: user?.creditBalance || 0,
            paymentIntentId: paymentIntent.id,
            alreadyProcessed: true,
          },
        });
      }

      // Award credits
      const credits = parseInt(paymentIntent.metadata.credits || '0');
      if (credits <= 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid credit amount',
        });
      }

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

      // Add credits to user balance and record transaction atomically
      const updatedUser = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            creditBalance: {
              increment: credits,
            },
          },
          select: { creditBalance: true },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'PURCHASE',
            amount: credits,
            balanceBefore: user.creditBalance,
            balanceAfter: updatedUser.creditBalance,
            stripePaymentId: paymentIntent.id,
            description: `Purchased ${credits} credits (SCA confirmed)`,
          },
        });

        return updatedUser;
      });

      return reply.send({
        success: true,
        data: {
          creditsPurchased: credits,
          newBalance: updatedUser.creditBalance,
          paymentIntentId: paymentIntent.id,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to confirm credit purchase',
      });
    }
  });

  // Spend credits to boost a pitch
  app.post('/api/credits/spend', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const body = SpendCreditsSchema.parse(request.body);

      // Get user and pitch
      const [user, pitch] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        }),
        prisma.pitch.findUnique({
          where: { id: body.pitchId },
          select: { 
            id: true,
            authorId: true,
            title: true,
            isBoosted: true,
            boostEndsAt: true,
          },
        }),
      ]);

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      if (!pitch) {
        return reply.code(404).send({
          success: false,
          error: 'Pitch not found',
        });
      }

      // Verify user owns the pitch
      if (pitch.authorId !== userId) {
        return reply.code(403).send({
          success: false,
          error: 'You can only boost your own pitches',
        });
      }

      // Calculate new boost end date
      const now = new Date();
      const currentBoostEnd = pitch.boostEndsAt && pitch.boostEndsAt > now 
        ? pitch.boostEndsAt 
        : now;
      
      const newBoostEnd = new Date(currentBoostEnd.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

      // Deduct credits, boost pitch, and record transaction atomically
      const result = await prisma.$transaction(async (tx) => {
        // Atomic conditional update - only deducts if balance is sufficient
        const updateResult = await tx.user.updateMany({
          where: {
            id: userId,
            creditBalance: { gte: body.amount }, // Only update if balance sufficient
          },
          data: {
            creditBalance: { decrement: body.amount },
          },
        });

        // Check if update succeeded (balance was sufficient)
        if (updateResult.count === 0) {
          // Either user doesn't exist or insufficient balance
          const currentUser = await tx.user.findUnique({
            where: { id: userId },
            select: { creditBalance: true },
          });

          if (!currentUser) {
            throw new Error('USER_NOT_FOUND');
          }

          throw new Error(`INSUFFICIENT_CREDITS:${currentUser.creditBalance}:${body.amount}`);
        }

        // Fetch updated balance
        const updatedUser = await tx.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        });

        if (!updatedUser) {
          throw new Error('USER_NOT_FOUND');
        }

        const balanceBefore = updatedUser.creditBalance + body.amount;

        const updatedPitch = await tx.pitch.update({
          where: { id: body.pitchId },
          data: {
            isBoosted: true,
            boostEndsAt: newBoostEnd,
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            pitchId: body.pitchId,
            type: 'BOOST_PITCH',
            amount: -body.amount, // Negative for spending
            balanceBefore,
            balanceAfter: updatedUser.creditBalance,
            description: `Boosted "${pitch.title}" for ${body.durationDays} days`,
          },
        });

        return { updatedUser, updatedPitch };
      });

      return reply.send({
        success: true,
        data: {
          creditsSpent: body.amount,
          newBalance: result.updatedUser.creditBalance,
          pitch: result.updatedPitch,
          boostEndsAt: newBoostEnd,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      
      // Handle user not found
      if (error.message === 'USER_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

      // Handle insufficient credits error thrown from transaction
      if (error.message?.startsWith('INSUFFICIENT_CREDITS:')) {
        const [, currentBalance, required] = error.message.split(':');
        return reply.code(400).send({
          success: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: parseInt(currentBalance),
          required: parseInt(required),
        });
      }

      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to spend credits',
      });
    }
  });

  // Create club sponsorship
  app.post('/api/credits/sponsor/:pitchId', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { pitchId } = request.params as { pitchId: string };
      
      const schema = z.object({
        targetGenres: z.array(z.string()).optional().default([]),
        minMemberCount: z.number().optional(),
        maxMemberCount: z.number().optional(),
        targetFrequency: z.string().optional(),
        budget: z.number().min(10),
        durationDays: z.number().min(7).max(90),
      });
      const body = schema.parse(request.body);

      // Get pitch and user
      const [pitch, user] = await Promise.all([
        prisma.pitch.findUnique({
          where: { id: pitchId },
          select: { 
            id: true,
            authorId: true,
            title: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        }),
      ]);

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
        });
      }

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

      // Check sufficient credits
      if (user.creditBalance < body.budget) {
        return reply.code(400).send({
          success: false,
          error: `Insufficient credits. Need ${body.budget}, have ${user.creditBalance}`,
        });
      }

      const balanceBefore = user.creditBalance;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

      // Create sponsorship and deduct credits atomically
      const result = await prisma.$transaction(async (tx) => {
        const sponsorship = await tx.sponsoredPitch.create({
          data: {
            userId,
            pitchId,
            targetGenres: body.targetGenres,
            minMemberCount: body.minMemberCount,
            maxMemberCount: body.maxMemberCount,
            targetFrequency: body.targetFrequency,
            budget: body.budget,
            startDate,
            endDate,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { creditBalance: { decrement: body.budget } },
          select: { creditBalance: true },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            pitchId,
            type: 'SPONSOR_CLUB',
            amount: -body.budget,
            balanceBefore,
            balanceAfter: updatedUser.creditBalance,
            description: `Club sponsorship for "${pitch.title}" (${body.durationDays} days)`,
          },
        });

        return { sponsorship, updatedUser };
      });

      return reply.send({
        success: true,
        data: {
          sponsorship: result.sponsorship,
          newBalance: result.updatedUser.creditBalance,
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

  // Get sponsored pitches for a club
  app.get('/api/credits/sponsored/:clubId', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { clubId } = request.params as { clubId: string };

      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: {
          preferredGenres: true,
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

      const sponsorships = await prisma.sponsoredPitch.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            { targetGenres: { isEmpty: true } },
            { targetGenres: { hasSome: club.preferredGenres } },
          ],
          AND: [
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
          ],
        },
        include: {
          pitch: {
            include: {
              author: {
                select: { id: true, name: true, avatarUrl: true },
              },
              book: {
                select: { id: true, title: true, author: true, genres: true, imageUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Update impressions
      await prisma.sponsoredPitch.updateMany({
        where: { id: { in: sponsorships.map((s) => s.id) } },
        data: { impressions: { increment: 1 } },
      });

      return reply.send({
        success: true,
        data: sponsorships.map((s) => s.pitch),
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get sponsored pitches',
      });
    }
  });

  // Get user's sponsorship analytics
  app.get('/api/credits/sponsorships', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const sponsorships = await prisma.sponsoredPitch.findMany({
        where: { userId },
        include: {
          pitch: {
            select: {
              id: true,
              title: true,
              book: {
                select: { title: true, author: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: sponsorships,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get sponsorships',
      });
    }
  });
}
