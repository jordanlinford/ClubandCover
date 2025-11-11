import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateUserSchema, UpdateUserSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';
import { z } from 'zod';

export async function userRoutes(fastify: FastifyInstance) {
  // Get current authenticated user
  fastify.get('/me', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Please sign in to view your profile' } as ApiResponse;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          roles: true,
          tier: true,
          avatarUrl: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' } as ApiResponse;
      }

      return { success: true, data: user } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
      } as ApiResponse;
    }
  });

  // Get current user's clubs
  fastify.get('/me/clubs', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Please sign in to view your clubs' } as ApiResponse;
    }

    try {
      const memberships = await prisma.membership.findMany({
        where: {
          userId: request.user.id,
          status: 'ACTIVE',
        },
        include: {
          club: {
            include: {
              createdBy: { select: { id: true, name: true, avatarUrl: true } },
              _count: { select: { memberships: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      const clubs = memberships.map((m) => ({
        ...m.club,
        myRole: m.role,
        joinedAt: m.joinedAt,
      }));

      return { success: true, data: clubs } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch clubs',
      } as ApiResponse;
    }
  });

  // Get current user's reviewed books
  fastify.get('/me/reviewed-books', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Please sign in to view your reviewed books' } as ApiResponse;
    }

    try {
      const reviews = await prisma.review.findMany({
        where: { reviewerId: request.user.id },
        include: {
          book: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const reviewedBooks = reviews.map((r) => ({
        ...r.book,
        rating: r.rating,
        reviewText: r.review,
        reviewedAt: r.createdAt,
      }));

      return { success: true, data: reviewedBooks } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviewed books',
      } as ApiResponse;
    }
  });

  // Add role to current user (self-service)
  fastify.post('/me/roles', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Please sign in to manage your roles' } as ApiResponse;
    }

    try {
      const schema = z.object({
        role: z.enum(['AUTHOR', 'CLUB_ADMIN'], {
          errorMap: () => ({ message: 'You can only add AUTHOR or CLUB_ADMIN roles' }),
        }),
      });
      const { role } = schema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { roles: true },
      });

      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' } as ApiResponse;
      }

      if (user.roles.includes(role)) {
        return {
          success: true,
          message: 'You already have this role',
          data: user,
        } as ApiResponse;
      }

      const updated = await prisma.user.update({
        where: { id: request.user.id },
        data: { roles: { push: role } },
      });

      return { success: true, data: updated } as ApiResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return {
          success: false,
          error: error.errors[0]?.message || 'Invalid role',
        } as ApiResponse;
      }
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add role',
      } as ApiResponse;
    }
  });

  fastify.get('/', async (request, reply) => {
    try {
      const users = await prisma.user.findMany();
      return { success: true, data: users } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch users' 
      } as ApiResponse;
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = await prisma.user.findUnique({ where: { id } });
      
      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' } as ApiResponse;
      }
      
      return { success: true, data: user } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
      } as ApiResponse;
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const validated = CreateUserSchema.parse(request.body);
      const user = await prisma.user.create({ data: validated });
      
      reply.code(201);
      return { success: true, data: user } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      } as ApiResponse;
    }
  });

  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validated = UpdateUserSchema.parse(request.body);
      
      const user = await prisma.user.update({
        where: { id },
        data: validated,
      });
      
      return { success: true, data: user } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      } as ApiResponse;
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.user.delete({ where: { id } });
      
      return { success: true } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      } as ApiResponse;
    }
  });
}
