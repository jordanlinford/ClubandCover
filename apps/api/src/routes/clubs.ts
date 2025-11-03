import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateClubSchema, UpdateClubSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';

export async function clubRoutes(fastify: FastifyInstance) {
  // List all clubs (public only for non-members)
  fastify.get('/', async (request, reply) => {
    try {
      const clubs = await prisma.club.findMany({
        where: { isPublic: true },
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: clubs } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch clubs',
      } as ApiResponse;
    }
  });

  // Get single club
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const club = await prisma.club.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true } },
          memberships: {
            where: { status: 'ACTIVE' },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      });

      if (!club) {
        reply.code(404);
        return { success: false, error: 'Club not found' } as ApiResponse;
      }

      return { success: true, data: club } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch club',
      } as ApiResponse;
    }
  });

  // Create club
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const validated = CreateClubSchema.parse(request.body);
      
      const club = await prisma.club.create({
        data: {
          ...validated,
          createdById: request.user.id,
          memberships: {
            create: {
              userId: request.user.id,
              role: 'OWNER',
              status: 'ACTIVE',
            },
          },
        },
        include: { memberships: true },
      });

      reply.code(201);
      return { success: true, data: club } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create club',
      } as ApiResponse;
    }
  });

  // Update club (owner/admin only)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };
      const validated = UpdateClubSchema.parse(request.body);

      // Check permissions
      const membership = await prisma.membership.findUnique({
        where: { clubId_userId: { clubId: id, userId: request.user.id } },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        reply.code(403);
        return { success: false, error: 'Not authorized to update this club' } as ApiResponse;
      }

      const updated = await prisma.club.update({
        where: { id },
        data: validated,
      });

      return { success: true, data: updated } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update club',
      } as ApiResponse;
    }
  });
}
