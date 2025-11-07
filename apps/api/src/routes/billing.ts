import type { FastifyInstance } from 'fastify';
import { stripe, STRIPE_PRODUCTS, STRIPE_PRICES, CREDIT_PACKAGES } from '../lib/stripe';
import { CheckoutSessionRequestSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';
import { z } from 'zod';

export async function billingRoutes(fastify: FastifyInstance) {
  // Create Stripe checkout session
  fastify.post('/checkout-session', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const validated = CheckoutSessionRequestSchema.parse(request.body);

      // Map plan to Stripe product
      const productId = STRIPE_PRODUCTS[validated.plan];
      if (!productId) {
        reply.code(400);
        return { success: false, error: 'Invalid plan' } as ApiResponse;
      }

      // Get the price for this product
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        reply.code(500);
        return { success: false, error: 'Product price not found' } as ApiResponse;
      }

      // Create checkout session
      const baseUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER}.repl.co`
        : `http://localhost:5000`;

      const session = await stripe.checkout.sessions.create({
        customer_email: request.user.email,
        line_items: [
          {
            price: prices.data[0].id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/billing?status=success`,
        cancel_url: `${baseUrl}/billing?status=cancel`,
        metadata: {
          userId: request.user.id,
          plan: validated.plan,
        },
      });

      return {
        success: true,
        data: { url: session.url },
      } as ApiResponse;
    } catch (error) {
      console.error('[BILLING] Checkout session error:', error);
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      } as ApiResponse;
    }
  });

  // Create credit purchase checkout session
  fastify.post('/credits/checkout', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const schema = z.object({
        package: z.enum(['CREDITS_10', 'CREDITS_50', 'CREDITS_100']),
      });
      const { package: packageType } = schema.parse(request.body);

      // Get product ID
      const productId = STRIPE_PRODUCTS[packageType];
      if (!productId) {
        reply.code(400);
        return { success: false, error: 'Invalid package' } as ApiResponse;
      }

      // Get the price for this product
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        reply.code(500);
        return { success: false, error: 'Product price not found' } as ApiResponse;
      }

      // Create checkout session for one-time payment
      const baseUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_CLUSTER}.repl.co`
        : `http://localhost:5000`;

      const session = await stripe.checkout.sessions.create({
        customer_email: request.user.email,
        line_items: [
          {
            price: prices.data[0].id,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/credits?status=success`,
        cancel_url: `${baseUrl}/credits?status=cancel`,
        metadata: {
          userId: request.user.id,
          packageType,
          credits: CREDIT_PACKAGES[packageType].toString(),
        },
      });

      return {
        success: true,
        data: { url: session.url },
      } as ApiResponse;
    } catch (error) {
      console.error('[BILLING] Credit checkout error:', error);
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      } as ApiResponse;
    }
  });

  // Legacy stub endpoint (keep for backwards compatibility)
  fastify.post('/stub', async (request, reply) => {
    return {
      success: true,
      data: {
        message: 'Use POST /api/billing/checkout-session for real billing',
        feature: 'checkout',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse;
  });
}
