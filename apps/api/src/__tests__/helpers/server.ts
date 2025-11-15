import { build } from '../../app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;

export async function startTestServer(): Promise<FastifyInstance> {
  if (!app) {
    // Build server with test configuration
    app = await build({
      testMode: true, // Enable test auth bypass
      enableStatic: false, // Skip static files in tests
      ensureStripe: false, // Skip Stripe product initialization
      enableAdminMigrations: false, // Skip admin migrations
      logger: false, // Disable logging in tests
    });
    await app.ready();
  }
  return app;
}

export async function stopTestServer(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

export function getTestServer(): FastifyInstance {
  if (!app) {
    throw new Error('Test server not started. Call startTestServer() first.');
  }
  return app;
}
