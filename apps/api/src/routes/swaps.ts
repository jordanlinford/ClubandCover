import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { CreateSwapSchema, UpdateSwapSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';

export async function swapRoutes(fastify: FastifyInstance) {
  // Get user's swaps (sent and received)
  fastify.get('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const swaps = await prisma.swap.findMany({
        where: {
          OR: [
            { requesterId: request.user.id },
            { recipientId: request.user.id },
          ],
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          recipient: { select: { id: true, name: true, email: true } },
          bookOffered: true,
          bookRequested: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: swaps } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch swaps',
      } as ApiResponse;
    }
  });

  // Create swap request
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const validated = CreateSwapSchema.parse(request.body);

      // Verify requester owns the offered book
      const offeredBook = await prisma.book.findUnique({
        where: { id: validated.bookOfferedId },
      });

      if (!offeredBook || offeredBook.ownerId !== request.user.id) {
        reply.code(400);
        return {
          success: false,
          error: 'You can only offer books you own',
        } as ApiResponse;
      }

      // Verify requested book exists and is available
      const requestedBook = await prisma.book.findUnique({
        where: { id: validated.bookRequestedId },
      });

      if (!requestedBook || !requestedBook.isAvailable) {
        reply.code(400);
        return {
          success: false,
          error: 'Requested book is not available',
        } as ApiResponse;
      }

      if (requestedBook.ownerId !== validated.recipientId) {
        reply.code(400);
        return {
          success: false,
          error: 'Book does not belong to specified recipient',
        } as ApiResponse;
      }

      const swap = await prisma.swap.create({
        data: {
          requesterId: request.user.id,
          ...validated,
          status: 'PENDING',
        },
        include: {
          bookOffered: true,
          bookRequested: true,
          requester: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true } },
        },
      });

      reply.code(201);
      return { success: true, data: swap } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create swap',
      } as ApiResponse;
    }
  });

  // Update swap status (recipient only, with valid state transitions)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };
      const validated = UpdateSwapSchema.parse(request.body);

      const swap = await prisma.swap.findUnique({
        where: { id },
        include: { bookOffered: true, bookRequested: true },
      });

      if (!swap) {
        reply.code(404);
        return { success: false, error: 'Swap not found' } as ApiResponse;
      }

      // Determine who can update based on status
      const canUpdate =
        (swap.status === 'PENDING' && swap.recipientId === request.user.id) ||
        (swap.status === 'ACCEPTED' &&
          (swap.recipientId === request.user.id || swap.requesterId === request.user.id));

      if (!canUpdate) {
        reply.code(403);
        return { success: false, error: 'Not authorized to update this swap' } as ApiResponse;
      }

      // Validate state transitions
      const validTransitions: Record<string, string[]> = {
        PENDING: ['ACCEPTED', 'DECLINED'],
        ACCEPTED: ['COMPLETED', 'CANCELLED'],
        DECLINED: [],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!validTransitions[swap.status]?.includes(validated.status)) {
        reply.code(400);
        return {
          success: false,
          error: `Cannot transition from ${swap.status} to ${validated.status}`,
        } as ApiResponse;
      }

      // Update book availability when swap is completed
      if (validated.status === 'COMPLETED') {
        await prisma.$transaction([
          prisma.book.update({
            where: { id: swap.bookOfferedId },
            data: { isAvailable: false },
          }),
          prisma.book.update({
            where: { id: swap.bookRequestedId },
            data: { isAvailable: false },
          }),
        ]);
      }

      const updated = await prisma.swap.update({
        where: { id },
        data: validated,
        include: {
          bookOffered: true,
          bookRequested: true,
          requester: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true } },
        },
      });

      return { success: true, data: updated } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update swap',
      } as ApiResponse;
    }
  });
}
