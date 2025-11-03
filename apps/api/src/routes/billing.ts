import type { FastifyInstance } from 'fastify';

export async function billingRoutes(fastify: FastifyInstance) {
  // Placeholder billing endpoint - will be implemented with real Stripe integration later
  fastify.post('/stub', async (request, reply) => {
    return {
      success: true,
      data: {
        message: 'Billing integration coming soon!',
        feature: 'upgrade',
        timestamp: new Date().toISOString(),
      },
    };
  });
}
