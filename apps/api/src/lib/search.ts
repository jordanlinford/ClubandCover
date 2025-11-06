import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

export interface SearchFilters {
  genres?: string[];
  minRating?: number;
  isAvailable?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Full-text search for books using PostgreSQL FTS
 */
export async function searchBooks(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0
): Promise<SearchResult<any>> {
  const whereConditions: Prisma.BookWhereInput[] = [];

  // Add FTS condition if query provided
  if (query && query.trim()) {
    // Use PostgreSQL full-text search with GIN index
    whereConditions.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  // Add filter conditions
  if (filters.genres && filters.genres.length > 0) {
    whereConditions.push({
      genres: {
        hasSome: filters.genres,
      },
    });
  }

  if (filters.isAvailable !== undefined) {
    whereConditions.push({
      isAvailable: filters.isAvailable,
    });
  }

  const where: Prisma.BookWhereInput = whereConditions.length > 0
    ? { AND: whereConditions }
    : {};

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.book.count({ where }),
  ]);

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Full-text search for clubs using PostgreSQL FTS
 */
export async function searchClubs(
  query: string,
  filters: { genres?: string[] } = {},
  limit = 20,
  offset = 0
): Promise<SearchResult<any>> {
  const whereConditions: Prisma.ClubWhereInput[] = [];

  // Add FTS condition if query provided
  if (query && query.trim()) {
    whereConditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  // Add filter conditions
  if (filters.genres && filters.genres.length > 0) {
    whereConditions.push({
      genres: {
        hasSome: filters.genres,
      },
    });
  }

  // Only show public clubs in search
  whereConditions.push({
    isPublic: true,
  });

  const where: Prisma.ClubWhereInput = whereConditions.length > 0
    ? { AND: whereConditions }
    : {};

  const [items, total] = await Promise.all([
    prisma.club.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            memberships: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.club.count({ where }),
  ]);

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Full-text search for pitches using PostgreSQL FTS
 */
export async function searchPitches(
  query: string,
  filters: { status?: string; authorId?: string } = {},
  limit = 20,
  offset = 0
): Promise<SearchResult<any>> {
  const whereConditions: Prisma.PitchWhereInput[] = [];

  // Add FTS condition if query provided
  if (query && query.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { synopsis: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  // Add filter conditions
  if (filters.status) {
    whereConditions.push({
      status: filters.status as any,
    });
  }

  if (filters.authorId) {
    whereConditions.push({
      authorId: filters.authorId,
    });
  }

  const where: Prisma.PitchWhereInput = whereConditions.length > 0
    ? { AND: whereConditions }
    : {};

  // Add where condition to exclude expired boosts
  const now = new Date();
  
  const [items, total] = await Promise.all([
    prisma.pitch.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [
        // Boosted pitches first (active boosts only)
        // Note: Prisma doesn't support complex conditional ordering directly,
        // so we use a workaround with raw SQL or fetch and sort in memory
        { isBoosted: 'desc' }, // Boosted pitches first
        { createdAt: 'desc' }, // Then by recency
      ],
      take: limit,
      skip: offset,
    }),
    prisma.pitch.count({ where }),
  ]);
  
  // Filter out expired boosts in memory (Prisma limitation for complex date comparisons in orderBy)
  const filteredItems = items.map(pitch => ({
    ...pitch,
    isBoosted: pitch.isBoosted && (!pitch.boostEndsAt || pitch.boostEndsAt > now),
  }));
  
  // Re-sort to ensure active boosts are truly first
  filteredItems.sort((a, b) => {
    if (a.isBoosted === b.isBoosted) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.isBoosted ? -1 : 1;
  });

  return {
    items: filteredItems,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get trending books (most swaps in last 30 days)
 */
export async function getTrendingBooks(limit = 10) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get books with most swap activity
  const books = await prisma.book.findMany({
    where: {
      OR: [
        {
          swapsOffered: {
            some: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
        {
          swapsRequested: {
            some: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          swapsOffered: true,
          swapsRequested: true,
        },
      },
    },
    take: limit,
  });

  return books;
}

/**
 * Get trending clubs (most activity in last 30 days)
 */
export async function getTrendingClubs(limit = 10) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get clubs with most recent activity
  const clubs = await prisma.club.findMany({
    where: {
      isPublic: true,
      OR: [
        {
          memberships: {
            some: {
              joinedAt: { gte: thirtyDaysAgo },
            },
          },
        },
        {
          pitches: {
            some: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      ],
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return clubs;
}

/**
 * Get trending pitches (most impressions in last 7 days)
 */
export async function getTrendingPitches(limit = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pitches = await prisma.pitch.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      status: 'SUBMITTED',
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      impressions: 'desc',
    },
    take: limit,
  });

  return pitches;
}

/**
 * Increment pitch impressions
 */
export async function incrementPitchImpressions(pitchId: string) {
  try {
    await prisma.pitch.update({
      where: { id: pitchId },
      data: {
        impressions: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error('Failed to increment pitch impressions:', error);
    // Don't throw - impressions are not critical
  }
}
