import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import csrf from '@fastify/csrf-protection';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { routes } from './routes/index.js';
import { versionRoutes } from './routes/version.js';
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
  // Trust proxy headers (required for correct client IP detection behind reverse proxies)
  trustProxy: true,
});

// CORS: support comma-separated list of allowed origins
const rawOrigins = process.env.CORS_ORIGIN || '*';
const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map(s => s.trim());

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return cb(null, true);
    
    // If wildcard, allow all
    if (allowedOrigins === '*') return cb(null, true);
    
    // Check if origin is in allowed list
    const allowed = allowedOrigins.includes(origin);
    cb(null, allowed);
  },
  credentials: true,
});

// Log CORS configuration
fastify.log.info({ allowedOrigins }, 'CORS configured');

// Register cookie support (required for CSRF)
await fastify.register(cookie, {
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
});

// Register helmet for security headers
const isDevelopment = process.env.NODE_ENV !== 'production';

// Build connectSrc list including Supabase URL
const connectSrcList = ["'self'", "https://api.stripe.com"];

// Add Supabase URL to CSP if configured (check both SUPABASE_URL and VITE_SUPABASE_URL)
const supabaseUrl = process.env.SUPABASE_URL?.startsWith('http') 
  ? process.env.SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL;

if (supabaseUrl && supabaseUrl.startsWith('http')) {
  connectSrcList.push(supabaseUrl);
}

if (isDevelopment) {
  connectSrcList.push("wss:", "ws:");
}

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Stripe requires js.stripe.com for scripts; unsafe-* only in dev
      scriptSrc: isDevelopment 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"]
        : ["'self'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"], // inline styles needed for components
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: connectSrcList,
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isDevelopment ? null : [],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Stripe embeds
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Register CSRF protection
await fastify.register(csrf, {
  sessionPlugin: '@fastify/cookie',
  cookieOpts: { 
    signed: true,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
});

fastify.log.info('Security headers and CSRF protection enabled');

// Health check endpoint for monitoring
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };
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

// Register version endpoint
await fastify.register(versionRoutes);

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

// ✅ Temporary Sprint-4 migration endpoint
const { default: adminMigrateRoutes } = await import("./routes/admin-migrate.js");
await fastify.register(adminMigrateRoutes);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 5000;
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info({ port, host }, 'Server started');
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📱 Web app: http://${host}:${port}`);
    console.log(`🔌 API: http://${host}:${port}/api`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
