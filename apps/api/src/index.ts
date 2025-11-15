import { build } from './app.js';

// Build the server with production defaults
const fastify = await build({
  enableStatic: true,
  ensureStripe: true,
  enableAdminMigrations: true,
});

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
