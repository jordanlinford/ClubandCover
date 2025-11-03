import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateMembershipSchema, UpdateMembershipSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';

export async function membershipRoutes(fastify: FastifyInstance) {
  // Request to join a club
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const validated = CreateMembershipSchema.parse(request.body);

      // Check if club exists and is public or user is invited
      const club = await prisma.club.findUnique({
        where: { id: validated.clubId },
      });

      if (!club) {
        reply.code(404);
        return { success: false, error: 'Club not found' } as ApiResponse;
      }

      // Check if already a member
      const existing = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId: validated.clubId,
            userId: request.user.id,
          },
        },
      });

      if (existing) {
        reply.code(400);
        return { success: false, error: 'Already a member or pending' } as ApiResponse;
      }

      const membership = await prisma.membership.create({
        data: {
          userId: request.user.id,
          clubId: validated.clubId,
          role: 'PENDING',
          status: 'PENDING',
        },
      });

      reply.code(201);
      return { success: true, data: membership } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request membership',
      } as ApiResponse;
    }
  });

  // Approve/decline membership (owner/admin only)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };
      const validated = UpdateMembershipSchema.parse(request.body);

      // Get the membership to check
      const membership = await prisma.membership.findUnique({
        where: { id },
        include: { club: true },
      });

      if (!membership) {
        reply.code(404);
        return { success: false, error: 'Membership not found' } as ApiResponse;
      }

      // Check if requester is owner/admin of the club
      const requesterMembership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId: membership.clubId,
            userId: request.user.id,
          },
        },
      });

      if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
        reply.code(403);
        return {
          success: false,
          error: 'Not authorized to manage memberships',
        } as ApiResponse;
      }

      // Update membership
      const updated = await prisma.membership.update({
        where: { id },
        data: {
          ...validated,
          role: validated.status === 'ACTIVE' ? 'MEMBER' : membership.role,
        },
      });

      return { success: true, data: updated } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update membership',
      } as ApiResponse;
    }
  });

  // Leave club
  fastify.delete('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };

      const membership = await prisma.membership.findUnique({
        where: { id },
      });

      if (!membership) {
        reply.code(404);
        return { success: false, error: 'Membership not found' } as ApiResponse;
      }

      if (membership.userId !== request.user.id) {
        reply.code(403);
        return { success: false, error: 'Not authorized' } as ApiResponse;
      }

      if (membership.role === 'OWNER') {
        reply.code(400);
        return {
          success: false,
          error: 'Club owner cannot leave. Transfer ownership first.',
        } as ApiResponse;
      }

      await prisma.membership.delete({ where: { id } });
      return { success: true } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave club',
      } as ApiResponse;
    }
  });
}
