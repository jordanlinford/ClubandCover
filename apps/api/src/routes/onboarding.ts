import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ensureUser } from '../middleware/ensureUser.js';

const setRoleSchema = z.object({
  role: z.enum(['READER', 'AUTHOR', 'CLUB_ADMIN']),
});

const updateProfileSchema = z.object({
  genres: z.array(z.string()).optional(),
  booksPerMonth: z.number().min(0).max(12).nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export default async function onboardingRoutes(app: FastifyInstance) {
  // Set user role (creates profile if missing)
  app.post(
    '/api/onboarding/role',
    { preHandler: [ensureUser] },
    async (request, reply) => {
      try {
        const { role } = setRoleSchema.parse(request.body);
        const userId = (request as any).user.id;

        // Update user role
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { role },
        });

        // Create profile if missing
        let profileCreated = false;
        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId },
        });

        if (!existingProfile) {
          await prisma.userProfile.create({
            data: { userId },
          });
          profileCreated = true;
        }

        return reply.send({
          success: true,
          data: {
            userId: updatedUser.id,
            role: updatedUser.role,
            profileCreated,
          },
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to set user role',
        });
      }
    }
  );

  // Update user profile preferences
  app.patch(
    '/api/onboarding/profile',
    { preHandler: [ensureUser] },
    async (request, reply) => {
      try {
        const data = updateProfileSchema.parse(request.body);
        const userId = (request as any).user.id;

        // Ensure profile exists
        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId },
        });

        let profile;
        let isNewProfile = false;
        if (existingProfile) {
          profile = await prisma.userProfile.update({
            where: { userId },
            data,
          });
        } else {
          // Create profile if missing
          profile = await prisma.userProfile.create({
            data: {
              userId,
              ...data,
            },
          });
          isNewProfile = true;
        }

        // Award ONBOARDING_COMPLETED points for first-time profile completion
        if (isNewProfile) {
          const { awardPoints } = await import('../lib/points.js');
          await awardPoints(userId, 'ONBOARDING_COMPLETED').catch(err => {
            request.log.error(err, 'Failed to award ONBOARDING_COMPLETED points');
          });
        }

        return reply.send({
          success: true,
          data: {
            userId: profile.userId,
            genres: profile.genres,
            booksPerMonth: profile.booksPerMonth,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
          },
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
        }
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update profile',
        });
      }
    }
  );
}
