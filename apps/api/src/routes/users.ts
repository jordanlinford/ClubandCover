import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateUserSchema, UpdateUserSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';

export async function userRoutes(fastify: FastifyInstance) {
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
