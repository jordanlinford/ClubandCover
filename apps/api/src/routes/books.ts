import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { CreateBookSchema, UpdateBookSchema } from '@repo/types';
import type { ApiResponse } from '@repo/types';
import { isAIEnabled, generateEmbedding, getEmbeddingText } from '../lib/ai.js';
import { hasRole } from '../middleware/auth.js';

export async function bookRoutes(fastify: FastifyInstance) {
  // List all available books (Authors only - AuthorSwap feature)
  fastify.get('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    if (!hasRole(request.user, 'AUTHOR')) {
      reply.code(403);
      return { success: false, error: 'Books feature is only available to authors' } as ApiResponse;
    }

    try {
      const books = await prisma.book.findMany({
        where: { isAvailable: true },
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: books } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch books',
      } as ApiResponse;
    }
  });

  // Get user's own books (Authors only - AuthorSwap feature)
  fastify.get('/my-books', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    if (!hasRole(request.user, 'AUTHOR')) {
      reply.code(403);
      return { success: false, error: 'Books feature is only available to authors' } as ApiResponse;
    }

    try {
      const books = await prisma.book.findMany({
        where: { ownerId: request.user.id },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: books } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch books',
      } as ApiResponse;
    }
  });

  // Get single book (Authors only - AuthorSwap feature)
  fastify.get('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    if (!hasRole(request.user, 'AUTHOR')) {
      reply.code(403);
      return { success: false, error: 'Books feature is only available to authors' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };
      const book = await prisma.book.findUnique({
        where: { id },
        include: { owner: { select: { id: true, name: true, email: true } } },
      });

      if (!book) {
        reply.code(404);
        return { success: false, error: 'Book not found' } as ApiResponse;
      }

      return { success: true, data: book } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch book',
      } as ApiResponse;
    }
  });

  // Create book (Authors only - AuthorSwap feature)
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    if (!hasRole(request.user, 'AUTHOR')) {
      reply.code(403);
      return { success: false, error: 'Books feature is only available to authors' } as ApiResponse;
    }

    try {
      const validated = CreateBookSchema.parse(request.body);
      const book = await prisma.book.create({
        data: {
          ...validated,
          ownerId: request.user.id,
        },
      });

      // Auto-index embedding if AI is enabled
      if (isAIEnabled()) {
        try {
          const embeddingText = getEmbeddingText(book);
          const vector = await generateEmbedding(embeddingText);
          await prisma.embedding.create({
            data: {
              entityType: 'BOOK',
              bookId: book.id,
              embedding: JSON.stringify(vector),
            },
          });
        } catch (error) {
          // Log error but don't fail book creation
          fastify.log.error('Failed to generate embedding for book', error);
        }
      }

      reply.code(201);
      return { success: true, data: book } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create book',
      } as ApiResponse;
    }
  });

  // Update book (Authors only - AuthorSwap feature)
  fastify.patch('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    if (!hasRole(request.user, 'AUTHOR')) {
      reply.code(403);
      return { success: false, error: 'Books feature is only available to authors' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };
      const validated = UpdateBookSchema.parse(request.body);

      // Check ownership
      const book = await prisma.book.findUnique({ where: { id } });
      if (!book) {
        reply.code(404);
        return { success: false, error: 'Book not found' } as ApiResponse;
      }
      if (book.ownerId !== request.user.id) {
        reply.code(403);
        return { success: false, error: 'Not authorized to update this book' } as ApiResponse;
      }

      const updated = await prisma.book.update({
        where: { id },
        data: validated,
      });

      return { success: true, data: updated } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update book',
      } as ApiResponse;
    }
  });

  // Delete book (Authors only - AuthorSwap feature)
  fastify.delete('/:id', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Unauthorized' } as ApiResponse;
    }

    if (!hasRole(request.user, 'AUTHOR')) {
      reply.code(403);
      return { success: false, error: 'Books feature is only available to authors' } as ApiResponse;
    }

    try {
      const { id } = request.params as { id: string };

      // Check ownership
      const book = await prisma.book.findUnique({ where: { id } });
      if (!book) {
        reply.code(404);
        return { success: false, error: 'Book not found' } as ApiResponse;
      }
      if (book.ownerId !== request.user.id) {
        reply.code(403);
        return { success: false, error: 'Not authorized to delete this book' } as ApiResponse;
      }

      await prisma.book.delete({ where: { id } });
      return { success: true } as ApiResponse;
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete book',
      } as ApiResponse;
    }
  });
}
