import type { FastifyInstance } from 'fastify';
import { stripe } from '../lib/stripe';
import { prisma } from '../lib/prisma';
import type { ApiResponse } from '@repo/types';
import Stripe from 'stripe';

export async function webhookRoutes(fastify: FastifyInstance) {
  // Stripe webhook handler
  fastify.post('/stripe', {
    config: {
      rawBody: true,
    },
    handler: async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        reply.code(500);
        return { success: false, error: 'Webhook secret not configured' } as ApiResponse;
      }

      let event: Stripe.Event;

      try {
        // @ts-ignore - rawBody is added by Fastify plugin
        event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('[WEBHOOK] Signature verification failed:', err.message);
        reply.code(400);
        return { success: false, error: `Webhook Error: ${err.message}` } as ApiResponse;
      }

      console.log('[WEBHOOK] Received event:', event.type);

      try {
        switch (event.type) {
          case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode === 'payment') {
              // Credit purchase
              await handleCreditPurchase(session);
            } else {
              // Subscription purchase
              await handleCheckoutCompleted(session);
            }
            break;

          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;

          default:
            console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
        }

        return { success: true } as ApiResponse;
      } catch (error) {
        console.error('[WEBHOOK] Handler error:', error);
        reply.code(500);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Webhook handler failed',
        } as ApiResponse;
      }
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as 'PRO_AUTHOR' | 'PRO_CLUB';

  if (!userId || !plan) {
    console.error('[WEBHOOK] Missing userId or plan in session metadata');
    return;
  }

  // Update user tier and store Stripe customer ID / subscription ID
  await prisma.user.update({
    where: { id: userId },
    data: {
      tier: plan,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
    },
  });

  // Sync authorTier on all user's pitches for visibility boost algorithm
  await prisma.pitch.updateMany({
    where: { authorId: userId },
    data: { authorTier: plan },
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      amount: session.amount_total || 0,
      stripePaymentId: session.id,
      plan,
      status: 'COMPLETED',
    },
  });

  console.log(`[WEBHOOK] User ${userId} upgraded to ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find user by subscription ID
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error('[WEBHOOK] User not found for subscription:', subscription.id);
    return;
  }

  // Update tier based on subscription status
  if (subscription.status === 'active') {
    const productId = subscription.items.data[0]?.price.product as string;
    const tier = mapProductToTier(productId);

    if (tier) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tier },
      });
      // Sync authorTier on all user's pitches for visibility boost algorithm
      await prisma.pitch.updateMany({
        where: { authorId: user.id },
        data: { authorTier: tier },
      });
      console.log(`[WEBHOOK] User ${user.id} subscription updated to ${tier}`);
    }
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    // Downgrade to FREE
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: 'FREE' },
    });
    // Sync authorTier on all user's pitches
    await prisma.pitch.updateMany({
      where: { authorId: user.id },
      data: { authorTier: 'FREE' },
    });
    console.log(`[WEBHOOK] User ${user.id} downgraded to FREE`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Find user and downgrade to FREE
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error('[WEBHOOK] User not found for subscription:', subscription.id);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      tier: 'FREE',
      stripeSubscriptionId: null,
    },
  });

  // Sync authorTier on all user's pitches
  await prisma.pitch.updateMany({
    where: { authorId: user.id },
    data: { authorTier: 'FREE' },
  });

  console.log(`[WEBHOOK] User ${user.id} subscription deleted, downgraded to FREE`);
}

async function handleCreditPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const credits = parseInt(session.metadata?.credits || '0');
  const packageType = session.metadata?.packageType;

  if (!userId || !credits) {
    console.error('[WEBHOOK] Missing userId or credits in session metadata');
    return;
  }

  // Get current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user) {
    console.error('[WEBHOOK] User not found:', userId);
    return;
  }

  const balanceBefore = user.creditBalance;
  const balanceAfter = balanceBefore + credits;

  // Update user credit balance
  await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: balanceAfter },
  });

  // Create credit transaction record
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: 'PURCHASE',
      amount: credits,
      balanceBefore,
      balanceAfter,
      stripePaymentId: session.id,
      description: `Purchased ${packageType?.replace('CREDITS_', '')} credits`,
    },
  });

  console.log(`[WEBHOOK] User ${userId} purchased ${credits} credits, new balance: ${balanceAfter}`);
}

function mapProductToTier(productId: string): 'PRO_AUTHOR' | 'PRO_CLUB' | 'PUBLISHER' | null {
  if (productId.includes('pro_author')) return 'PRO_AUTHOR';
  if (productId.includes('pro_club')) return 'PRO_CLUB';
  if (productId.includes('publisher')) return 'PUBLISHER';
  return null;
}
