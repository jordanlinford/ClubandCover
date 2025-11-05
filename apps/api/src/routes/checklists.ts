import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

// Define checklist steps for different user types
const CHECKLISTS = {
  READER_ONBOARDING: [
    { key: 'profile_complete', title: 'Complete your profile' },
    { key: 'add_first_book', title: 'Add your first book' },
    { key: 'join_club', title: 'Join a book club' },
    { key: 'make_first_swap', title: 'Request your first swap' },
  ],
  AUTHOR_ONBOARDING: [
    { key: 'profile_complete', title: 'Complete your profile' },
    { key: 'add_first_book', title: 'Add your first book' },
    { key: 'submit_pitch', title: 'Submit your first pitch' },
    { key: 'join_club', title: 'Join a book club' },
  ],
  HOST_ONBOARDING: [
    { key: 'profile_complete', title: 'Complete your profile' },
    { key: 'create_club', title: 'Create a book club' },
    { key: 'invite_members', title: 'Invite members' },
    { key: 'create_poll', title: 'Create a poll' },
  ],
};

export async function checklistsRoutes(fastify: FastifyInstance) {
  // Get checklist for a specific code
  fastify.get<{
    Params: { code: string };
  }>('/api/checklists/:code', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { code } = request.params;

      // Validate checklist code
      if (!CHECKLISTS[code as keyof typeof CHECKLISTS]) {
        return reply.status(404).send({
          success: false,
          error: 'Checklist not found',
        });
      }

      const steps = CHECKLISTS[code as keyof typeof CHECKLISTS];

      // Get completed steps for this checklist
      const completed = await prisma.checklistProgress.findMany({
        where: {
          userId,
          code,
        },
      });

      const completedKeys = new Set(completed.map((c) => c.stepKey));

      // Build checklist with completion status
      const checklist = {
        code,
        steps: steps.map((step) => ({
          ...step,
          completed: completedKeys.has(step.key),
        })),
        progress: {
          completed: completed.length,
          total: steps.length,
          percentage: Math.round((completed.length / steps.length) * 100),
        },
      };

      return reply.send({
        success: true,
        data: checklist,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get checklist',
      });
    }
  });

  // Mark a checklist step as complete
  fastify.post<{
    Params: { code: string; stepKey: string };
  }>('/api/checklists/:code/steps/:stepKey', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const { code, stepKey } = request.params;

      // Validate checklist code
      if (!CHECKLISTS[code as keyof typeof CHECKLISTS]) {
        return reply.status(404).send({
          success: false,
          error: 'Checklist not found',
        });
      }

      // Validate step key
      const steps = CHECKLISTS[code as keyof typeof CHECKLISTS];
      const step = steps.find((s) => s.key === stepKey);
      if (!step) {
        return reply.status(404).send({
          success: false,
          error: 'Step not found',
        });
      }

      // Mark step as complete (upsert for idempotency)
      const progress = await prisma.checklistProgress.upsert({
        where: {
          userId_code_stepKey: {
            userId,
            code,
            stepKey,
          },
        },
        update: {
          doneAt: new Date(),
        },
        create: {
          userId,
          code,
          stepKey,
        },
      });

      return reply.send({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to mark step complete',
      });
    }
  });

  // Get all checklists for current user
  fastify.get('/api/checklists', { onRequest: [requireAuth] }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      // Get all completed steps
      const allCompleted = await prisma.checklistProgress.findMany({
        where: { userId },
      });

      const completedByCode = new Map<string, Set<string>>();
      allCompleted.forEach((c) => {
        if (!completedByCode.has(c.code)) {
          completedByCode.set(c.code, new Set());
        }
        completedByCode.get(c.code)!.add(c.stepKey);
      });

      // Build all checklists
      const checklists = Object.entries(CHECKLISTS).map(([code, steps]) => {
        const completedKeys = completedByCode.get(code) || new Set();

        return {
          code,
          steps: steps.map((step) => ({
            ...step,
            completed: completedKeys.has(step.key),
          })),
          progress: {
            completed: completedKeys.size,
            total: steps.length,
            percentage: Math.round((completedKeys.size / steps.length) * 100),
          },
        };
      });

      return reply.send({
        success: true,
        data: checklists,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get checklists',
      });
    }
  });
}
