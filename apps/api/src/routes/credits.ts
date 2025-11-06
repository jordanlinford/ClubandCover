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

      // Add credits to user balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          creditBalance: {
            increment: body.amount,
          },
        },
        select: { creditBalance: true },
      });

      // Record transaction
      await prisma.creditTransaction.create({
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

      // Check if user has enough credits
      if (user.creditBalance < body.amount) {
        return reply.code(400).send({
          success: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: user.creditBalance,
          required: body.amount,
        });
      }

      // Calculate new boost end date
      const now = new Date();
      const currentBoostEnd = pitch.boostEndsAt && pitch.boostEndsAt > now 
        ? pitch.boostEndsAt 
        : now;
      
      const newBoostEnd = new Date(currentBoostEnd.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

      // Deduct credits and boost pitch
      const [updatedUser, updatedPitch] = await Promise.all([
        prisma.user.update({
          where: { id: userId },
          data: {
            creditBalance: {
              decrement: body.amount,
            },
          },
          select: { creditBalance: true },
        }),
        prisma.pitch.update({
          where: { id: body.pitchId },
          data: {
            isBoosted: true,
            boostEndsAt: newBoostEnd,
          },
        }),
      ]);

      // Record transaction
      await prisma.creditTransaction.create({
        data: {
          userId,
          pitchId: body.pitchId,
          type: 'BOOST_PITCH',
          amount: -body.amount, // Negative for spending
          balanceBefore: user.creditBalance,
          balanceAfter: updatedUser.creditBalance,
          description: `Boosted "${pitch.title}" for ${body.durationDays} days`,
        },
      });

      return reply.send({
        success: true,
        data: {
          creditsSpent: body.amount,
          newBalance: updatedUser.creditBalance,
          pitch: updatedPitch,
          boostEndsAt: newBoostEnd,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to spend credits',
      });
    }
  });
}
