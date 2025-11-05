import { FastifyInstance } from 'fastify';

export async function versionRoutes(fastify: FastifyInstance) {
  fastify.get('/api/version', async () => {
    return {
      name: 'Book Pitch',
      tag: 'Sprint-5',
      commit: process.env.GIT_SHA || 'unknown',
      ts: new Date().toISOString(),
    };
  });
}
