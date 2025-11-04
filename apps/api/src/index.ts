import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { routes } from './routes/index.js';
import { supabaseAuth } from './middleware/auth.js';
import { ensureStripeProducts } from './lib/stripe.js';
import { initializeOpenAI } from './lib/ai.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// CORS: allow * for single-port Replit setup
await fastify.register(cors, {
  origin: '*',
  credentials: true,
});

// Serve web build from apps/web/dist
await fastify.register(fastifyStatic, {
  root: resolve(__dirname, '../../web/dist'),
  prefix: '/',
});

// Set up fallback for SPA routing
fastify.setNotFoundHandler((request, reply) => {
  // If it's an API route, return 404
  if (request.url.startsWith('/api')) {
    reply.code(404).send({ error: 'Not Found' });
  } else {
    // Otherwise serve index.html for client-side routing
    reply.sendFile('index.html');
  }
});

// Auth middleware only for API routes
fastify.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/api')) {
    await supabaseAuth(request, reply);
  }
});

// Mount all API routes under /api/*
await fastify.register(routes, { prefix: '/api' });

// Initialize Stripe products on startup
await ensureStripeProducts();

// Initialize OpenAI (optional - will warn if missing)
initializeOpenAI();

// ✅ Register test seed route only when enabled
if (process.env.ENABLE_TEST_ROUTES === "1") {
  const { default: testSeedRoutes } = await import("./routes/test-seed.js");
  await fastify.register(testSeedRoutes);
  fastify.log.info('[TEST] Test-seed route enabled');
}

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 5000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port: PORT, host });
    console.log(`🚀 Server running on http://${host}:${PORT}`);
    console.log(`📱 Web app: http://${host}:${PORT}`);
    console.log(`🔌 API: http://${host}:${PORT}/api`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
