import type { FastifyInstance } from 'fastify';
import { bookRoutes } from './books.js';
import { clubRoutes } from './clubs.js';
import { membershipRoutes } from './memberships.js';
import { swapRoutes } from './swaps.js';
import { billingRoutes } from './billing.js';
import { webhookRoutes } from './webhooks.js';
import { reviewRoutes } from './reviews.js';
import { aiRoutes } from './ai.js';

export async function routes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/debug/config', async () => {
    return {
      supabaseBackend: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      supabaseFrontend: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      stripeBackend: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeFrontend: !!process.env.VITE_STRIPE_PUBLIC_KEY,
      resendEmail: !!process.env.RESEND_API_KEY,
      openaiBackend: !!process.env.OPENAI_API_KEY,
    };
  });

  await fastify.register(bookRoutes, { prefix: '/books' });
  await fastify.register(clubRoutes, { prefix: '/clubs' });
  await fastify.register(membershipRoutes, { prefix: '/memberships' });
  await fastify.register(swapRoutes, { prefix: '/swaps' });
  await fastify.register(billingRoutes, { prefix: '/billing' });
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });
  await fastify.register(reviewRoutes, { prefix: '/reviews' });
  await fastify.register(aiRoutes, { prefix: '/ai' });
}
