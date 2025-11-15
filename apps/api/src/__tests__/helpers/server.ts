import { build } from '../../app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;

export async function startTestServer(): Promise<FastifyInstance> {
  if (!app) {
    app = await build();
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
