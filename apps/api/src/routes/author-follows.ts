import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import type { ApiResponse } from '@repo/types';
import { z } from 'zod';

export async function authorFollowRoutes(fastify: FastifyInstance) {
  // Follow an author
  fastify.post('/authors/:authorId/follow', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Authentication required' } as ApiResponse;
    }

    try {
      const { authorId } = request.params as { authorId: string };

      // Check if author exists and has AUTHOR role
      const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { roles: true },
      });

      if (!author) {
        reply.code(404);
        return { success: false, error: 'Author not found' } as ApiResponse;
      }

      if (!author.roles.includes('AUTHOR')) {
        reply.code(400);
        return { success: false, error: 'User is not an author' } as ApiResponse;
      }

      // Can't follow yourself
      if (authorId === request.user.id) {
        reply.code(400);
        return { success: false, error: 'You cannot follow yourself' } as ApiResponse;
      }

      // Check if already following
      const existingFollow = await prisma.authorFollow.findUnique({
        where: {
          followerId_authorId: {
            followerId: request.user.id,
            authorId,
          },
        },
      });

      if (existingFollow) {
        return { success: true, message: 'Already following this author' } as ApiResponse;
      }

      // Create follow
      const follow = await prisma.authorFollow.create({
        data: {
          followerId: request.user.id,
          authorId,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Successfully followed author',
        data: follow,
      } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to follow author',
      } as ApiResponse;
    }
  });

  // Unfollow an author
  fastify.delete('/authors/:authorId/follow', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Authentication required' } as ApiResponse;
    }

    try {
      const { authorId } = request.params as { authorId: string };

      const deleted = await prisma.authorFollow.deleteMany({
        where: {
          followerId: request.user.id,
          authorId,
        },
      });

      if (deleted.count === 0) {
        reply.code(404);
        return { success: false, error: 'Not following this author' } as ApiResponse;
      }

      return {
        success: true,
        message: 'Successfully unfollowed author',
      } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unfollow author',
      } as ApiResponse;
    }
  });

  // Get authors I'm following
  fastify.get('/users/me/following', async (request, reply) => {
    if (!request.user) {
      reply.code(401);
      return { success: false, error: 'Authentication required' } as ApiResponse;
    }

    try {
      const following = await prisma.authorFollow.findMany({
        where: { followerId: request.user.id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              tier: true,
              profile: {
                select: {
                  bio: true,
                  genres: true,
                },
              },
              _count: {
                select: {
                  books: true,
                  followers: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: following.map((f) => ({
          ...f.author,
          followedAt: f.createdAt,
        })),
      } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch following',
      } as ApiResponse;
    }
  });

  // Get follower count for an author
  fastify.get('/authors/:authorId/followers/count', async (request, reply) => {
    try {
      const { authorId } = request.params as { authorId: string };

      const count = await prisma.authorFollow.count({
        where: { authorId },
      });

      return { success: true, data: { count } } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch follower count',
      } as ApiResponse;
    }
  });

  // Check if current user is following an author
  fastify.get('/authors/:authorId/following/status', async (request, reply) => {
    if (!request.user) {
      return { success: true, data: { isFollowing: false } } as ApiResponse;
    }

    try {
      const { authorId } = request.params as { authorId: string };

      const follow = await prisma.authorFollow.findUnique({
        where: {
          followerId_authorId: {
            followerId: request.user.id,
            authorId,
          },
        },
      });

      return { success: true, data: { isFollowing: !!follow } } as ApiResponse;
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check following status',
      } as ApiResponse;
    }
  });
}
