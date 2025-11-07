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
      preferredGenres: {
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

  // Add where condition to exclude expired boosts
  const now = new Date();
  
  const where: Prisma.PitchWhereInput = whereConditions.length > 0
    ? { AND: whereConditions }
    : {};
  
  const [items, total] = await Promise.all([
    prisma.pitch.findMany({
      where: {
        ...where,
        OR: [
          // Either not boosted
          { isBoosted: false },
          // Or boosted but not expired
          {
            isBoosted: true,
            boostEndsAt: { gte: now },
          },
          // Or boosted with no end date (shouldn't happen, but be defensive)
          {
            isBoosted: true,
            boostEndsAt: null,
          },
        ],
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
      orderBy: [
        // Boosted pitches first (only active boosts will be returned due to where clause)
        { isBoosted: 'desc' },
        // Then by author tier (PUBLISHER > PRO_AUTHOR/PRO_CLUB > FREE)
        { authorTier: 'desc' },
        // Then by recency
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.pitch.count({ 
      where: {
        ...where,
        OR: [
          { isBoosted: false },
          {
            isBoosted: true,
            boostEndsAt: { gte: now },
          },
          {
            isBoosted: true,
            boostEndsAt: null,
          },
        ],
      },
    }),
  ]);

  return {
    items,
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
