import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse } from '@repo/types';
import { z } from 'zod';
import { requireAuth, requireActiveAccount, requireStaffRole } from '../middleware/auth.js';

const ApproveVerificationSchema = z.object({
  profileId: z.string().uuid(),
});

const RejectVerificationSchema = z.object({
  profileId: z.string().uuid(),
  reason: z.string().min(1).max(1000).optional(),
});

export async function adminAuthorVerificationRoutes(fastify: FastifyInstance) {
  // Get all pending author verifications
  fastify.get('/pending', { preHandler: [requireAuth, requireActiveAccount, requireStaffRole] }, async (request, reply) => {

    try {
      const pendingProfiles = await prisma.authorProfile.findMany({
        where: {
          verificationStatus: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
          verificationProofs: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: {
          updatedAt: 'asc', // Oldest pending first
        },
      });

      return { success: true, data: pendingProfiles } as ApiResponse;
    } catch (error) {
      request.log.error(error, 'Failed to fetch pending verifications');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pending verifications',
      } as ApiResponse;
    }
  });

  // Approve author verification
  fastify.post('/approve', { preHandler: [requireAuth, requireActiveAccount, requireStaffRole] }, async (request, reply) => {

    try {
      const data = ApproveVerificationSchema.parse(request.body);

      const profile = await prisma.authorProfile.findUnique({
        where: { id: data.profileId },
      });

      if (!profile) {
        reply.code(404);
        return { success: false, error: 'Author profile not found' } as ApiResponse;
      }

      if (profile.verificationStatus !== 'PENDING') {
        reply.code(400);
        return {
          success: false,
          error: 'Only pending verifications can be approved',
        } as ApiResponse;
      }

      // Approve verification
      const updatedProfile = await prisma.authorProfile.update({
        where: { id: data.profileId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedByAdminId: request.user.id,
          rejectionReason: null, // Clear any previous rejection reason
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          verificationProofs: true,
        },
      });

      return { success: true, data: updatedProfile } as ApiResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { success: false, error: error.errors[0].message } as ApiResponse;
      }

      request.log.error(error, 'Failed to approve verification');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve verification',
      } as ApiResponse;
    }
  });

  // Reject author verification
  fastify.post('/reject', { preHandler: [requireAuth, requireActiveAccount, requireStaffRole] }, async (request, reply) => {

    try {
      const data = RejectVerificationSchema.parse(request.body);

      const profile = await prisma.authorProfile.findUnique({
        where: { id: data.profileId },
      });

      if (!profile) {
        reply.code(404);
        return { success: false, error: 'Author profile not found' } as ApiResponse;
      }

      if (profile.verificationStatus !== 'PENDING') {
        reply.code(400);
        return {
          success: false,
          error: 'Only pending verifications can be rejected',
        } as ApiResponse;
      }

      // Reject verification
      const updatedProfile = await prisma.authorProfile.update({
        where: { id: data.profileId },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: data.reason,
          verifiedAt: null,
          verifiedByAdminId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          verificationProofs: true,
        },
      });

      return { success: true, data: updatedProfile } as ApiResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { success: false, error: error.errors[0].message } as ApiResponse;
      }

      request.log.error(error, 'Failed to reject verification');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject verification',
      } as ApiResponse;
    }
  });
}
