import Fastify, { FastifyInstance } from 'fastify';
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
import { supabaseAuth, requireActiveAccount } from './middleware/auth.js';
import { enforceSuspensionPolicy } from './middleware/suspensionEnforcement.js';
import { ensureStripeProducts } from './lib/stripe.js';
import { initializeOpenAI } from './lib/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BuildOptions {
  enableStatic?: boolean;
  ensureStripe?: boolean;
  enableTestRoutes?: boolean;
  enableAdminMigrations?: boolean;
  logger?: boolean | object;
  testMode?: boolean;
}

export async function build(options: BuildOptions = {}): Promise<FastifyInstance> {
  const {
    enableStatic = true,
    ensureStripe = true,
    enableTestRoutes = process.env.ENABLE_TEST_ROUTES === '1',
    enableAdminMigrations = true,
    testMode = false,
    logger = {
      level: process.env.LOG_LEVEL || 'info',
    },
  } = options;

  // Load environment variables once
  config();

  const fastify = Fastify({
    logger,
    trustProxy: true,
  });

  // CORS configuration
  const rawOrigins = process.env.CORS_ORIGIN || '*';
  const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map(s => s.trim());

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins === '*') return cb(null, true);
      const allowed = allowedOrigins.includes(origin);
      cb(null, allowed);
    },
    credentials: true,
  });

  fastify.log.info({ allowedOrigins }, 'CORS configured');

  // Cookie support
  await fastify.register(cookie, {
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
  });

  // Helmet security headers
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const connectSrcList = ["'self'", "https://api.stripe.com"];

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
        scriptSrc: isDevelopment
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"]
          : ["'self'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: connectSrcList,
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isDevelopment ? null : [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // CSRF protection
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

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  });

  // Serve static files if enabled (skip in tests)
  if (enableStatic) {
    await fastify.register(fastifyStatic, {
      root: resolve(__dirname, '../../web/dist'),
      prefix: '/',
    });

    // SPA fallback routing
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        reply.code(404).send({ error: 'Not Found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  // Auth middleware for API routes (use test auth in test mode)
  if (testMode) {
    const { testAuth, testRequireActiveAccount } = await import('./middleware/testAuth.js');
    fastify.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith('/api')) {
        await testAuth(request, reply);
      }
    });
    fastify.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith('/api')) {
        await testRequireActiveAccount(request, reply);
      }
    });
  } else {
    fastify.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith('/api')) {
        await supabaseAuth(request, reply);
      }
    });
    fastify.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith('/api')) {
        await requireActiveAccount(request, reply);
      }
    });
  }

  // Suspension enforcement
  fastify.addHook('onRequest', async (request, reply) => {
    // Debug logging for all POST requests
    if (request.method === 'POST' && request.url.includes('enable')) {
      request.log.info({
        url: request.url,
        startsWithApi: request.url.startsWith('/api'),
        method: request.method,
      }, '[APP] Checking if URL starts with /api');
    }
    
    if (request.url.startsWith('/api')) {
      await enforceSuspensionPolicy(request, reply);
    }
  });

  // Mount API routes
  await fastify.register(routes, { prefix: '/api' });

  // Version endpoint
  await fastify.register(versionRoutes);

  // Initialize Stripe products if enabled
  if (ensureStripe) {
    await ensureStripeProducts();
  }

  // Initialize OpenAI
  initializeOpenAI();

  // Test seed routes
  if (enableTestRoutes) {
    const { default: testSeedRoutes } = await import("./routes/test-seed.js");
    await fastify.register(testSeedRoutes);
    fastify.log.info('[TEST] Test-seed route enabled');
  }

  // Admin migration routes
  if (enableAdminMigrations) {
    const { default: adminMigrateRoutes } = await import("./routes/admin-migrate.js");
    await fastify.register(adminMigrateRoutes);
  }

  return fastify;
}
