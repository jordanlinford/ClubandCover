import type { FastifyInstance } from 'fastify';
import { bookRoutes } from './books';
import { clubRoutes } from './clubs';
import { membershipRoutes } from './memberships';
import { swapRoutes } from './swaps';
import { billingRoutes } from './billing';
import { webhookRoutes } from './webhooks';
import { reviewRoutes } from './reviews';

export async function routes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await fastify.register(bookRoutes, { prefix: '/books' });
  await fastify.register(clubRoutes, { prefix: '/clubs' });
  await fastify.register(membershipRoutes, { prefix: '/memberships' });
  await fastify.register(swapRoutes, { prefix: '/swaps' });
  await fastify.register(billingRoutes, { prefix: '/billing' });
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });
  await fastify.register(reviewRoutes, { prefix: '/reviews' });
}
