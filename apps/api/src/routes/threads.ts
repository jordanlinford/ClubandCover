import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createThreadSchema, ThreadListItem } from '@repo/types';
import { z } from 'zod';

export default async function threadRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/threads - Create a new thread (DM or CLUB)
   */
  fastify.post('/threads', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const body = createThreadSchema.parse(request.body);
    const userId = request.user.id;

    // Validate based on thread type
    if (body.type === 'CLUB') {
      if (!body.clubId) {
        return reply
          .code(400)
          .send({ success: false, error: 'clubId required for CLUB threads' });
      }

      // Check if user is a member of the club
      const membership = await prisma.membership.findFirst({
        where: {
          clubId: body.clubId,
          userId,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        return reply
          .code(403)
          .send({ success: false, error: 'You are not a member of this club' });
      }

      // Check if club thread already exists
      const existing = await prisma.messageThread.findFirst({
        where: {
          type: 'CLUB',
          clubId: body.clubId,
        },
      });

      if (existing) {
        // Return existing thread
        return reply.send({ success: true, data: existing });
      }

      // Create club thread with all active members
      const activeMembers = await prisma.membership.findMany({
        where: {
          clubId: body.clubId,
          status: 'ACTIVE',
        },
        select: { userId: true },
      });

      const thread = await prisma.messageThread.create({
        data: {
          type: 'CLUB',
          clubId: body.clubId,
          members: {
            create: activeMembers.map((m) => ({
              userId: m.userId,
              joinedAt: new Date(),
            })),
          },
        },
        include: {
          members: true,
        },
      });

      request.log.info({ threadId: thread.id, clubId: body.clubId }, 'Club thread created');

      return reply.send({ success: true, data: thread });
    } else {
      // DM thread
      if (!body.recipientId) {
        return reply
          .code(400)
          .send({ success: false, error: 'recipientId required for DM threads' });
      }

      if (body.recipientId === userId) {
        return reply
          .code(400)
          .send({ success: false, error: 'Cannot create DM thread with yourself' });
      }

      // Check if DM thread already exists between these users
      const existing = await prisma.messageThread.findFirst({
        where: {
          type: 'DM',
          members: {
            every: {
              userId: { in: [userId, body.recipientId] },
            },
          },
        },
        include: {
          members: true,
        },
      });

      if (existing && existing.members.length === 2) {
        return reply.send({ success: true, data: existing });
      }

      // Create DM thread
      const thread = await prisma.messageThread.create({
        data: {
          type: 'DM',
          members: {
            create: [
              { userId, joinedAt: new Date() },
              { userId: body.recipientId, joinedAt: new Date() },
            ],
          },
        },
        include: {
          members: true,
        },
      });

      request.log.info({ threadId: thread.id }, 'DM thread created');

      return reply.send({ success: true, data: thread });
    }
  });

  /**
   * GET /api/threads/mine - List user's threads with unread counts
   */
  fastify.get('/threads/mine', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const userId = request.user.id;

    // Find all threads the user is a member of
    const memberships = await prisma.threadMember.findMany({
      where: { userId },
      include: {
        thread: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        thread: {
          createdAt: 'desc',
        },
      },
    });

    // Build thread list with computed unread counts
    const threads: ThreadListItem[] = await Promise.all(
      memberships.map(async (m) => {
        const lastReadAt = m.lastReadAt || m.joinedAt;

        // Compute unread count
        const unreadCount = await prisma.message.count({
          where: {
            threadId: m.threadId,
            createdAt: {
              gt: lastReadAt,
            },
            senderId: {
              not: userId, // Don't count own messages
            },
          },
        });

        // Get other members (exclude current user)
        const otherMembers = m.thread.members
          .filter((tm) => tm.userId !== userId)
          .map((tm) => ({
            id: tm.user.id,
            name: tm.user.name,
            avatarUrl: tm.user.avatarUrl,
          }));

        return {
          id: m.thread.id,
          type: m.thread.type,
          clubId: m.thread.clubId,
          createdAt: m.thread.createdAt,
          unreadCount,
          lastMessage: m.thread.messages[0] || null,
          otherMembers,
        };
      })
    );

    return reply.send({ success: true, data: threads });
  });

  /**
   * GET /api/threads/:id - Get thread details
   */
  fastify.get('/threads/:id', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const { id } = request.params as { id: string };
    const userId = request.user.id;

    // Check if user is a member of this thread (or STAFF)
    const membership = await prisma.threadMember.findUnique({
      where: {
        threadId_userId: {
          threadId: id,
          userId,
        },
      },
    });

    if (!membership && request.user.role !== 'STAFF') {
      return reply.code(403).send({ success: false, error: 'Access denied' });
    }

    // Get thread details
    const thread = await prisma.messageThread.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      return reply.code(404).send({ success: false, error: 'Thread not found' });
    }

    return reply.send({ success: true, data: thread });
  });

  /**
   * POST /api/threads/:id/read - Mark thread as read
   */
  fastify.post('/threads/:id/read', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const { id } = request.params as { id: string };
    const userId = request.user.id;

    // Update lastReadAt for this user's thread membership
    const updated = await prisma.threadMember.updateMany({
      where: {
        threadId: id,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return reply.code(404).send({ success: false, error: 'Thread membership not found' });
    }

    return reply.send({ success: true, data: { threadId: id, readAt: new Date() } });
  });
}
