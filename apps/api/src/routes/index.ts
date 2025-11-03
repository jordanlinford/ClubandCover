import type { FastifyInstance } from 'fastify';
import { userRoutes } from './users';

export async function routes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await fastify.register(userRoutes, { prefix: '/users' });
}
