import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export async function membershipRoutes(fastify: FastifyInstance) {
  // Request to join a club
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const schema = z.object({
        clubId: z.string().uuid(),
      });
      const validated = schema.parse(request.body);

      // Check if club exists
      const club = await prisma.club.findUnique({
        where: { id: validated.clubId },
      });

      if (!club) {
        reply.code(404);
        return { success: false, error: 'Club not found' };
      }

      // Check if already a member or banned
      const existing = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            clubId: validated.clubId,
            userId: request.user.id,
          },
        },
      });

      if (existing) {
        if (existing.status === 'REMOVED') {
          reply.code(403);
          return { success: false, error: 'You have been removed from this club and cannot rejoin' };
        }
        reply.code(400);
        return { success: false, error: 'Already a member or pending' };
      }

      // Enforce joinRules
      const joinRules = club.joinRules || 'APPROVAL'; // Default to APPROVAL if not set

      if (joinRules === 'INVITE_ONLY') {
        reply.code(403);
        return { success: false, error: 'This club is invite-only' };
      }

      // Determine status and role based on joinRules
      const status = joinRules === 'OPEN' ? 'ACTIVE' : 'PENDING';
      const role = joinRules === 'OPEN' ? 'MEMBER' : 'PENDING';

      const membership = await prisma.membership.create({
        data: {
          userId: request.user.id,
          clubId: validated.clubId,
          role,
          status,
        },
      });

      reply.code(201);
      return { success: true, data: membership };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request membership',
      };
    }
  });

  // Approve/decline membership (owner/admin only)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const { id } = request.params as { id: string };
      const schema = z.object({
        status: z.enum(['PENDING', 'ACTIVE', 'DECLINED', 'REMOVED']).optional(),
        role: z.enum(['PENDING', 'MEMBER', 'ADMIN', 'OWNER']).optional(),
      });
      const validated = schema.parse(request.body);

      // Get the membership to check
      const membership = await prisma.membership.findUnique({
        where: { id },
        include: { club: true },
      });

      if (!membership) {
        reply.code(404);
        return { success: false, error: 'Membership not found' };
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
        };
      }

      // Update membership - build data object to respect caller-supplied values
      const updateData: any = {};
      
      // Always apply status if provided
      if (validated.status !== undefined) {
        updateData.status = validated.status;
      }
      
      // Role logic:
      // 1. If caller provided a role, use it
      // 2. Else if transitioning to ACTIVE for first time, default to MEMBER
      // 3. Else keep existing role
      if (validated.role !== undefined) {
        updateData.role = validated.role;
      } else if (validated.status === 'ACTIVE' && membership.status !== 'ACTIVE') {
        updateData.role = 'MEMBER';
      }

      const updated = await prisma.membership.update({
        where: { id },
        data: updateData,
      });

      return { success: true, data: updated };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update membership',
      };
    }
  });

  // Leave club
  fastify.delete('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const { id } = request.params as { id: string };

      const membership = await prisma.membership.findUnique({
        where: { id },
      });

      if (!membership) {
        reply.code(404);
        return { success: false, error: 'Membership not found' };
      }

      if (membership.userId !== request.user.id) {
        reply.code(403);
        return { success: false, error: 'Not authorized' };
      }

      if (membership.role === 'OWNER') {
        reply.code(400);
        return {
          success: false,
          error: 'Club owner cannot leave. Transfer ownership first.',
        };
      }

      await prisma.membership.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave club',
      };
    }
  });
}
