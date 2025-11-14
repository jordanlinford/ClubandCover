import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse } from '@repo/types';

export async function authorPublicRoutes(fastify: FastifyInstance) {
  // Get public author profile
  fastify.get('/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Get user with author role check
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          roles: true,
          accountStatus: true,
          createdAt: true,
        },
      });

      if (!user) {
        reply.code(404);
        return { success: false, error: 'Author not found' } as ApiResponse;
      }

      if (!user.roles.includes('AUTHOR')) {
        reply.code(404);
        return { success: false, error: 'User is not an author' } as ApiResponse;
      }

      if (user.accountStatus === 'DISABLED' || user.accountStatus === 'DELETED') {
        reply.code(404);
        return { success: false, error: 'Author not found' } as ApiResponse;
      }

      // Get author profile
      const authorProfile = await prisma.authorProfile.findUnique({
        where: { userId },
        select: {
          penName: true,
          bio: true,
          genres: true,
          website: true,
          socialLinks: true,
          verificationStatus: true,
        },
      });

      // Get follower count
      const followerCount = await prisma.authorFollow.count({
        where: { authorId: userId },
      });

      // Get published pitches count
      const publishedPitchesCount = await prisma.pitch.count({
        where: {
          authorId: userId,
          status: 'PUBLISHED',
        },
      });

      // Get published pitches list (limit to 20 most recent)
      const publishedPitches = await prisma.pitch.findMany({
        where: {
          authorId: userId,
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          title: true,
          synopsis: true,
          imageUrl: true,
          genres: true,
          createdAt: true,
          _count: {
            select: {
              nominations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Get books count
      const booksCount = await prisma.book.count({
        where: { ownerId: userId },
      });

      // Get completed swaps count (verified swaps)
      const completedSwapsCount = await prisma.swap.count({
        where: {
          OR: [
            { requesterId: userId },
            { responderId: userId },
          ],
          status: 'VERIFIED',
        },
      });

      // Check if current user is following (if authenticated)
      let isFollowing = false;
      if (request.user) {
        const follow = await prisma.authorFollow.findUnique({
          where: {
            followerId_authorId: {
              followerId: request.user.id,
              authorId: userId,
            },
          },
        });
        isFollowing = !!follow;
      }

      const publicAuthorProfile = {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        memberSince: user.createdAt,
        
        // Author profile data
        penName: authorProfile?.penName || null,
        bio: authorProfile?.bio || null,
        genres: authorProfile?.genres || [],
        website: authorProfile?.website || null,
        socialLinks: authorProfile?.socialLinks || null,
        isVerified: authorProfile?.verificationStatus === 'VERIFIED',
        
        // Stats
        stats: {
          followers: followerCount,
          publishedPitches: publishedPitchesCount,
          books: booksCount,
          completedSwaps: completedSwapsCount,
        },
        
        // Published pitches
        pitches: publishedPitches.map((pitch) => ({
          id: pitch.id,
          title: pitch.title,
          synopsis: pitch.synopsis,
          imageUrl: pitch.imageUrl,
          genres: pitch.genres,
          publishedAt: pitch.createdAt,
          nominationCount: pitch._count?.nominations ?? 0,
        })),
        
        // Current user's relationship
        isFollowing,
      };

      return { success: true, data: publicAuthorProfile } as ApiResponse;
    } catch (error) {
      request.log.error(error, 'Failed to fetch public author profile');
      reply.code(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch author profile',
      } as ApiResponse;
    }
  });
}
