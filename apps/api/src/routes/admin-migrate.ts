import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function adminMigrateRoutes(fastify: FastifyInstance) {
  // Temporary migration endpoint - remove after Sprint-4 setup
  fastify.post('/api/admin/migrate-sprint4', async (request, reply) => {
    try {
      fastify.log.info('Starting Sprint-4 migration...');
      
      const { stdout, stderr } = await execAsync(
        'cd /home/runner/workspace/apps/api && npx prisma db push --accept-data-loss --skip-generate',
        { env: process.env }
      );
      
      fastify.log.info({ stdout, stderr }, 'Migration output');
      
      return {
        success: true,
        message: 'Sprint-4 schema pushed successfully',
        output: stdout,
        warnings: stderr
      };
    } catch (error: any) {
      fastify.log.error({ error }, 'Migration failed');
      return reply.status(500).send({
        success: false,
        error: error.message,
        output: error.stdout,
        stderr: error.stderr
      });
    }
  });
}
