import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Badge catalog with display information
 */
export const BADGE_CATALOG = {
  // Reader badges
  FIRST_VOTE: {
    id: 'FIRST_VOTE',
    name: 'First Vote',
    description: 'Cast your first vote in a poll',
    category: 'READER',
    icon: 'Target',
  },
  BOOKWORM: {
    id: 'BOOKWORM',
    name: 'Bookworm',
    description: 'Cast votes on 10 different polls',
    category: 'READER',
    icon: 'BookOpen',
  },
  SOCIABLE: {
    id: 'SOCIABLE',
    name: 'Sociable',
    description: 'Posted 20 valid messages (≥10 chars) in club rooms',
    category: 'READER',
    icon: 'Users',
  },
  LOYAL_MEMBER: {
    id: 'LOYAL_MEMBER',
    name: 'Loyal Member',
    description: 'Member of 3 clubs',
    category: 'READER',
    icon: 'Sparkles',
  },

  // Host/Club badges
  HOST_STARTER: {
    id: 'HOST_STARTER',
    name: 'Host Starter',
    description: 'Created a club',
    category: 'HOST',
    icon: 'Users',
  },
  COMMUNITY_ACTIVE: {
    id: 'COMMUNITY_ACTIVE',
    name: 'Community Active',
    description: '5 unique members posted messages in last 7 days',
    category: 'HOST',
    icon: 'TrendingUp',
  },
  DECISIVE: {
    id: 'DECISIVE',
    name: 'Decisive',
    description: 'Completed 3 polls',
    category: 'HOST',
    icon: 'Trophy',
  },

  // Author badges
  AUTHOR_LAUNCH: {
    id: 'AUTHOR_LAUNCH',
    name: 'Author Launch',
    description: 'Created your first pitch',
    category: 'AUTHOR',
    icon: 'Feather',
  },
  FAN_FAVORITE: {
    id: 'FAN_FAVORITE',
    name: 'Fan Favorite',
    description: 'Pitch selected by 3 different clubs',
    category: 'AUTHOR',
    icon: 'Trophy',
  },
  SWAP_MASTER: {
    id: 'SWAP_MASTER',
    name: 'Swap Master',
    description: 'Completed 5 swaps',
    category: 'AUTHOR',
    icon: 'Repeat',
  },
} as const;

export type BadgeCode = keyof typeof BADGE_CATALOG;

/**
 * Award a badge to a user (idempotent)
 */
export async function awardBadge(
  userId: string,
  code: BadgeCode
): Promise<{ ok: boolean; idempotent?: boolean; error?: string }> {
  try {
    // Validate badge code exists
    if (!BADGE_CATALOG[code]) {
      return { ok: false, error: 'INVALID_BADGE_CODE' };
    }

    await prisma.userBadge.create({
      data: {
        userId,
        code,
      },
    });

    return { ok: true };
  } catch (error: any) {
    // P2002 = unique constraint violation (already has badge)
    if (error.code === 'P2002') {
      return { ok: true, idempotent: true };
    }
    return { ok: false, error: 'DATABASE_ERROR' };
  }
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(userId: string, code: BadgeCode): Promise<boolean> {
  const badge = await prisma.userBadge.findUnique({
    where: {
      userId_code: { userId, code },
    },
  });
  return !!badge;
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string) {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { awardedAt: 'desc' },
  });

  // Augment with badge metadata from catalog
  return userBadges.map(ub => ({
    ...ub,
    badge: BADGE_CATALOG[ub.code as keyof typeof BADGE_CATALOG],
  }));
}

/**
 * Get badge progress for a user (how close they are to earning specific badges)
 */
export async function getBadgeProgress(userId: string) {
  const [votes, messages, clubs, pitches, swaps, polls] = await Promise.all([
    // Count votes
    prisma.vote.count({ where: { userId } }),
    
    // Count valid messages (≥10 chars) - need to query ClubMessage
    prisma.clubMessage.count({
      where: {
        userId,
        body: {
          // This is a rough approximation; ideally filter by length in app logic
        },
      },
    }),
    
    // Count active memberships
    prisma.membership.count({
      where: { userId, status: 'ACTIVE' },
    }),
    
    // Count pitches
    prisma.pitch.count({ where: { authorId: userId } }),
    
    // Count verified swaps
    prisma.swap.count({
      where: {
        OR: [{ requesterId: userId }, { responderId: userId }],
        status: 'VERIFIED',
      },
    }),
    
    // Count closed polls created by user
    prisma.poll.count({
      where: { createdById: userId, status: 'CLOSED' },
    }),
  ]);

  return {
    FIRST_VOTE: votes >= 1,
    BOOKWORM: { current: votes, required: 10, complete: votes >= 10 },
    SOCIABLE: { current: messages, required: 20, complete: messages >= 20 },
    LOYAL_MEMBER: { current: clubs, required: 3, complete: clubs >= 3 },
    AUTHOR_LAUNCH: pitches >= 1,
    FAN_FAVORITE: { current: 0, required: 3, complete: false }, // Need to track pitch selections
    SWAP_MASTER: { current: swaps, required: 5, complete: swaps >= 5 },
    DECISIVE: { current: polls, required: 3, complete: polls >= 3 },
  };
}
