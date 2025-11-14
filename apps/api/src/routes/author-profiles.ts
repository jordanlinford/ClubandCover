import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse } from '@repo/types';
import { z } from 'zod';
import { requireAuth, requireActiveAccount } from '../middleware/auth.js';

const CreateAuthorProfileSchema = z.object({
  penName: z.string().min(1).max(100).optional(),
  bio: z.string().min(1).max(5000).optional(),
  genres: z.array(z.string()).default([]),
  website: z.string().url().optional().or(z.literal('')),
  socialLinks: z.record(z.string(), z.string().url()).optional(),
});

const SubmitVerificationSchema = z.object({
  type: z.enum(['AMAZON_LINK', 'GOODREADS_LINK', 'PUBLISHER_PAGE', 'ISBN', 'OTHER']),
  value: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export async function authorProfileRoutes(fastify: FastifyInstance) {
  // Get current user's author profile (returns null if not created yet)
  fastify.get('/', { preHandler: [requireAuth, requireActiveAccount] }, async (request, reply) => {

    try {
      const profile = await prisma.authorProfile.findUnique({
        where: { userId: request.user.id },
        include: {
          verificationProofs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Return success with null data if profile doesn't exist yet
      return { success: true, data: profile } as ApiResponse;
    } catch (error) {
      request.log.error(error, 'Failed to fetch author profile');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch author profile',
      } as ApiResponse;
    }
  });

  // Create or update author profile
  fastify.post('/', { preHandler: [requireAuth, requireActiveAccount] }, async (request, reply) => {

    try {
      const data = CreateAuthorProfileSchema.parse(request.body);

      // Check if profile already exists
      const existing = await prisma.authorProfile.findUnique({
        where: { userId: request.user.id },
      });

      let profile;
      if (existing) {
        // Update existing profile
        profile = await prisma.authorProfile.update({
          where: { userId: request.user.id },
          data: {
            penName: data.penName,
            bio: data.bio,
            genres: data.genres,
            website: data.website || null,
            socialLinks: data.socialLinks || null,
          },
          include: {
            verificationProofs: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      } else {
        // Create new profile
        profile = await prisma.authorProfile.create({
          data: {
            userId: request.user.id,
            penName: data.penName,
            bio: data.bio,
            genres: data.genres,
            website: data.website || null,
            socialLinks: data.socialLinks || null,
          },
          include: {
            verificationProofs: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }

      return { success: true, data: profile } as ApiResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { success: false, error: error.errors[0].message } as ApiResponse;
      }

      request.log.error(error, 'Failed to create/update author profile');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save author profile',
      } as ApiResponse;
    }
  });

  // Submit verification proof
  fastify.post('/submit-verification', { preHandler: [requireAuth, requireActiveAccount] }, async (request, reply) => {

    try {
      const data = SubmitVerificationSchema.parse(request.body);

      // Get or create author profile
      let profile = await prisma.authorProfile.findUnique({
        where: { userId: request.user.id },
      });

      if (!profile) {
        reply.code(404);
        return {
          success: false,
          error: 'Please create your author profile first',
        } as ApiResponse;
      }

      // Check if already pending or verified
      if (profile.verificationStatus === 'PENDING') {
        reply.code(409);
        return {
          success: false,
          error: 'You already have a pending verification request',
        } as ApiResponse;
      }

      if (profile.verificationStatus === 'VERIFIED') {
        reply.code(409);
        return {
          success: false,
          error: 'Your author profile is already verified',
        } as ApiResponse;
      }

      // Create verification proof and update profile status to PENDING
      const result = await prisma.$transaction(async (tx) => {
        // Create verification proof
        await tx.authorVerification.create({
          data: {
            authorProfileId: profile!.id,
            type: data.type,
            value: data.value,
            notes: data.notes,
          },
        });

        // Update profile status to PENDING
        const updatedProfile = await tx.authorProfile.update({
          where: { id: profile!.id },
          data: {
            verificationStatus: 'PENDING',
          },
          include: {
            verificationProofs: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        return updatedProfile;
      });

      return { success: true, data: result } as ApiResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { success: false, error: error.errors[0].message } as ApiResponse;
      }

      request.log.error(error, 'Failed to submit verification');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit verification',
      } as ApiResponse;
    }
  });
}
