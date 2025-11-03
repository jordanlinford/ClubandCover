import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { routes } from './routes';
import { supabaseAuth } from './middleware/auth';

config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

fastify.addHook('onRequest', supabaseAuth);

await fastify.register(routes, { prefix: '/api' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 API server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
