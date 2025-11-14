import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient, PitchStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * Pitch routes for author book pitches
 */
export default async function pitchesRoutes(app: FastifyInstance) {
  // Create a new pitch
  app.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // Helper function to validate and normalize YouTube URLs
    const validateYouTubeUrl = (url: string): string | null => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Accept youtube.com and youtu.be
        if (!['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com'].includes(hostname)) {
          return null;
        }
        
        let videoId: string | null = null;
        
        // Extract video ID from different YouTube URL formats
        if (hostname.includes('youtube.com')) {
          const pathname = urlObj.pathname;
          
          // Handle /watch?v=ID
          if (pathname.includes('/watch')) {
            videoId = urlObj.searchParams.get('v');
          }
          // Handle /embed/ID
          else if (pathname.startsWith('/embed/')) {
            videoId = pathname.split('/embed/')[1]?.split('?')[0];
          }
          // Handle /shorts/ID
          else if (pathname.startsWith('/shorts/')) {
            videoId = pathname.split('/shorts/')[1]?.split('?')[0];
          }
          // Handle /live/ID
          else if (pathname.startsWith('/live/')) {
            videoId = pathname.split('/live/')[1]?.split('?')[0];
          }
        } else if (hostname === 'youtu.be') {
          videoId = urlObj.pathname.slice(1).split('?')[0];
        }
        
        if (!videoId || videoId.length !== 11) {
          return null;
        }
        
        // Return canonical embed URL
        return `https://www.youtube.com/embed/${videoId}`;
      } catch {
        return null;
      }
    };

    // Validate request body
    const schema = z.object({
      bookId: z.string().uuid(),
      targetClubId: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      synopsis: z.string().optional(),
      sampleUrl: z.string().url().optional(),
      genres: z.array(z.string()).max(3, 'Maximum 3 genres allowed').optional(),
      theme: z.string().max(500, 'Theme must be 500 characters or less').optional(),
      imageUrl: z.string().url('Must be a valid URL').optional(),
      videoUrl: z.string().optional(),
      availableFormats: z.array(z.enum(['PAPERBACK', 'HARDCOVER', 'EBOOK', 'AUDIOBOOK']))
        .min(1, 'At least one format must be selected'),
      offerFreeIfChosen: z.boolean().optional(),
    });

    const body = schema.parse(request.body);
    
    // Validate format and free offer combination
    if (body.offerFreeIfChosen && body.availableFormats && body.availableFormats.length > 0) {
      const hasPhysicalFormat = body.availableFormats.some(
        format => format === 'PAPERBACK' || format === 'HARDCOVER'
      );
      
      if (hasPhysicalFormat) {
        // Note: Physical format free offers imply shipping responsibility
        // This could be expanded in the future to track shipping details
        // For now, we just log the commitment
        request.log.info({
          userId,
          pitchData: { title: body.title, formats: body.availableFormats },
        }, 'Author offering physical format for free - shipping required');
      }
    }
    
    // Validate and normalize YouTube URL if provided
    let normalizedVideoUrl: string | null = null;
    if (body.videoUrl) {
      normalizedVideoUrl = validateYouTubeUrl(body.videoUrl);
      if (!normalizedVideoUrl) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid YouTube URL. Please provide a valid youtube.com or youtu.be URL',
        });
      }
    }

    // Verify the book exists and belongs to the user
    const book = await prisma.book.findUnique({
      where: { id: body.bookId },
    });

    if (!book) {
      return reply.code(404).send({
        success: false,
        error: 'Book not found',
      });
    }

    if (book.ownerId !== userId) {
      return reply.code(403).send({
        success: false,
        error: 'You can only pitch your own books',
      });
    }

    // If targetClubId is provided, verify the club exists
    if (body.targetClubId) {
      const club = await prisma.club.findUnique({
        where: { id: body.targetClubId },
      });

      if (!club) {
        return reply.code(404).send({
          success: false,
          error: 'Target club not found',
        });
      }
    }

    // Enforce tier-based pitch limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      return reply.code(401).send({
        success: false,
        error: 'User not found',
      });
    }

    // Count active pitches (not archived)
    const activePitchCount = await prisma.pitch.count({
      where: {
        authorId: userId,
        status: { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED'] },
      },
    });

    // Tier limits for active pitches
    const tierLimits: Record<string, number> = {
      FREE: 3,
      PRO_AUTHOR: 10,
      PRO_CLUB: 10,
      PUBLISHER: 999, // Essentially unlimited
    };

    const limit = tierLimits[user.tier] || 1;

    if (activePitchCount >= limit) {
      return reply.code(403).send({
        success: false,
        error: `You have reached your pitch limit (${limit} active pitches)`,
        code: 'PITCH_LIMIT_REACHED',
        currentCount: activePitchCount,
        limit: limit,
        requiredTier: user.tier === 'FREE' ? 'PRO_AUTHOR' : undefined,
      } as any);
    }

    // Create the pitch
    const pitch = await prisma.pitch.create({
      data: {
        authorId: userId,
        bookId: body.bookId,
        targetClubId: body.targetClubId || null,
        title: body.title,
        synopsis: body.synopsis || null,
        sampleUrl: body.sampleUrl || null,
        genres: body.genres || [],
        theme: body.theme || null,
        imageUrl: body.imageUrl || null,
        videoUrl: normalizedVideoUrl,
        availableFormats: body.availableFormats,
        offerFreeIfChosen: body.offerFreeIfChosen || false,
        status: 'SUBMITTED',
        authorTier: user.tier, // Set author tier for visibility boost sorting
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        book: true,
        targetClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Award PITCH_CREATED points
    const { awardPoints } = await import('../lib/points.js');
    const { maybeAwardAuthorLaunch } = await import('../lib/award.js');
    
    await awardPoints(userId, 'PITCH_CREATED', undefined, 'PITCH', pitch.id).catch(err => {
      request.log.error(err, 'Failed to award PITCH_CREATED points');
    });
    
    // Check for AUTHOR_LAUNCH badge (first pitch)
    await maybeAwardAuthorLaunch(userId).catch(err => {
      request.log.error(err, 'Failed to check AUTHOR_LAUNCH badge');
    });

    // Notify all followers of this author
    const followers = await prisma.authorFollow.findMany({
      where: { authorId: userId },
      select: { followerId: true },
    });

    if (followers.length > 0) {
      await prisma.notification.createMany({
        data: followers.map(follow => ({
          userId: follow.followerId,
          type: 'AUTHOR_NEW_PITCH',
          message: `${pitch.author.name} just pitched a new book: ${pitch.title}`,
          link: `/pitches/${pitch.id}`,
          metadata: {
            authorId: userId,
            authorName: pitch.author.name,
            pitchId: pitch.id,
            pitchTitle: pitch.title,
          },
        })),
      }).catch(err => {
        request.log.error(err, 'Failed to notify followers of new pitch');
      });
    }

    return reply.send({
      success: true,
      data: pitch,
    });
  });

  // Get current author's pitches
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const schema = z.object({
      status: z.enum(['SUBMITTED', 'ACCEPTED', 'REJECTED', 'ARCHIVED']).optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = schema.parse(request.query);

    const where: any = {
      authorId: userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [pitches, total] = await Promise.all([
      prisma.pitch.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              imageUrl: true,
            },
          },
          targetClub: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              pollOptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.pitch.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: pitches,
      total,
    });
  });

  // List pitches with filters
  app.get('/', async (request, reply) => {
    const schema = z.object({
      status: z.enum(['SUBMITTED', 'ACCEPTED', 'REJECTED', 'ARCHIVED']).optional(),
      authorId: z.string().uuid().optional(),
      targetClubId: z.string().uuid().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = schema.parse(request.query);

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.targetClubId) {
      where.targetClubId = query.targetClubId;
    }

    const [pitches, total] = await Promise.all([
      prisma.pitch.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              imageUrl: true,
              genres: true,
            },
          },
          targetClub: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          // Boosted pitches first
          { isBoosted: 'desc' },
          // Then by author tier for visibility boost
          { authorTier: 'desc' },
          // Then by recency
          { createdAt: 'desc' },
        ],
        take: query.limit,
        skip: query.offset,
      }),
      prisma.pitch.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        pitches,
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  });

  // Get a single pitch by ID
  app.get('/:id', async (request, reply) => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    const params = schema.parse(request.params);

    const pitch = await prisma.pitch.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        book: true,
        targetClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!pitch) {
      return reply.code(404).send({
        success: false,
        error: 'Pitch not found',
      });
    }

    return reply.send({
      success: true,
      data: pitch,
    });
  });

  // Update pitch status (club hosts only for ACCEPTED/REJECTED)
  app.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      status: z.enum(['ACCEPTED', 'REJECTED', 'ARCHIVED']),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    // Get the pitch
    const pitch = await prisma.pitch.findUnique({
      where: { id: params.id },
      include: {
        targetClub: true,
      },
    });

    if (!pitch) {
      return reply.code(404).send({
        success: false,
        error: 'Pitch not found',
      });
    }

    // Check permissions
    if (body.status === 'ACCEPTED' || body.status === 'REJECTED') {
      // Only club co-hosts can accept/reject pitches
      if (!pitch.targetClubId) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot accept/reject a pitch without a target club',
        });
      }

      const membership = await prisma.membership.findUnique({
        where: {
          clubId_userId: {
            userId,
            clubId: pitch.targetClubId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return reply.code(403).send({
          success: false,
          error: 'Only club owners and admins can accept or reject pitches',
        });
      }
    }

    // Update the pitch
    const updatedPitch = await prisma.pitch.update({
      where: { id: params.id },
      data: {
        status: body.status,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        book: true,
        targetClub: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: updatedPitch,
    });
  });
}
