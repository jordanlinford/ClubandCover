import { PrismaClient, PointType } from '@prisma/client';
import { startOfDay } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Point values for different actions
 */
export const POINT_VALUES: Record<PointType, number> = {
  // Existing
  SWAP_VERIFIED: 50,
  ON_TIME_DELIVERY: 25,
  PITCH_SELECTED: 100,
  VOTE_PARTICIPATION: 3,
  REVIEW_VERIFIED: 10,
  SOCIAL_SHARE: 5,
  HOST_ACTION: 15,
  REFERRAL_ACTIVATED: 50,
  
  // New (Points & Badges v1)
  ACCOUNT_CREATED: 10,
  ONBOARDING_COMPLETED: 15,
  JOIN_CLUB: 5,
  MESSAGE_POSTED: 1,
  PITCH_CREATED: 10,
  SWAP_COMPLETED: 25,
} as const;

/**
 * Daily caps for specific point types (max points per day)
 */
export const DAILY_CAPS: Partial<Record<PointType, number>> = {
  VOTE_PARTICIPATION: 10,    // Max 10 pts/day from voting
  MESSAGE_POSTED: 10,        // Max 10 pts/day from messages
  REFERRAL_ACTIVATED: 250,   // Max 5 activations × 50 pts = 250/day
};

/**
 * Award points to a user with idempotency and daily caps
 * 
 * @param userId - User to award points to
 * @param type - Type of point action (enum)
 * @param amount - Number of points to award (optional, uses POINT_VALUES by default)
 * @param refType - Optional reference type for idempotency (e.g., "SWAP", "PITCH", "POLL")
 * @param refId - Optional reference ID for idempotency (e.g., swapId, pollId)
 * @returns Result object with status
 */
export async function awardPoints(
  userId: string,
  type: PointType,
  amount?: number,
  refType?: string,
  refId?: string
): Promise<{ ok: boolean; amount?: number; reason?: string; idempotent?: boolean; capped?: boolean }> {
  // Use default point value if not specified
  const pointsToAward = amount ?? POINT_VALUES[type];
  
  if (!pointsToAward || pointsToAward <= 0) {
    return { ok: false, reason: 'UNKNOWN_EVENT' };
  }

  // Check idempotency when refId is provided
  if (refId && refType) {
    const existing = await prisma.pointLedger.findUnique({
      where: {
        userId_type_refType_refId: {
          userId,
          type,
          refType,
          refId,
        },
      },
    });

    if (existing) {
      return { ok: true, idempotent: true };
    }
  }

  // Check daily caps
  const dailyCap = DAILY_CAPS[type];
  if (dailyCap !== undefined) {
    const today = startOfDay(new Date());
    
    // Get or create daily counter
    const dailyCounter = await prisma.dailyPointCounter.upsert({
      where: {
        userId_type_date: {
          userId,
          type,
          date: today,
        },
      },
      update: {},
      create: {
        userId,
        type,
        date: today,
        total: 0,
      },
    });

    // Check if cap reached
    if (dailyCounter.total >= dailyCap) {
      return { ok: false, reason: 'DAILY_CAP_REACHED' };
    }

    // Cap the award amount if it would exceed daily limit
    const remainingCap = dailyCap - dailyCounter.total;
    const actualAmount = Math.min(remainingCap, pointsToAward);
    
    if (actualAmount <= 0) {
      return { ok: false, reason: 'DAILY_CAP_REACHED' };
    }

    // Award points with cap enforcement
    await prisma.$transaction(async (tx) => {
      // Create ledger entry
      await tx.pointLedger.create({
        data: {
          userId,
          type,
          amount: actualAmount,
          refType: refType || null,
          refId: refId || null,
        },
      });

      // Update user's total points
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: actualAmount,
          },
        },
      });

      // Update daily counter
      await tx.dailyPointCounter.update({
        where: {
          userId_type_date: {
            userId,
            type,
            date: today,
          },
        },
        data: {
          total: {
            increment: actualAmount,
          },
        },
      });
    });

    return {
      ok: true,
      amount: actualAmount,
      capped: actualAmount < pointsToAward,
    };
  }

  // No cap - award full amount
  await prisma.$transaction(async (tx) => {
    await tx.pointLedger.create({
      data: {
        userId,
        type,
        amount: pointsToAward,
        refType: refType || null,
        refId: refId || null,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: pointsToAward,
        },
      },
    });
  });

  return { ok: true, amount: pointsToAward };
}

/**
 * Get a user's point history
 */
export async function getUserPointHistory(userId: string, limit: number = 50) {
  return await prisma.pointLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get a user's current point balance
 */
export async function getUserPoints(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  return user?.points || 0;
}

/**
 * Calculate reputation tier based on point total
 * Returns a numeric reputation value (0-5)
 */
export function calculateReputation(points: number): number {
  if (points >= 1000) return 5; // LEGENDARY
  if (points >= 500) return 4;  // EXPERT
  if (points >= 250) return 3;  // ADVANCED
  if (points >= 100) return 2;  // INTERMEDIATE
  if (points >= 25) return 1;   // BEGINNER
  return 0;                     // NEWCOMER
}

/**
 * Get reputation tier label
 */
export function getReputationLabel(reputation: number): string {
  const labels = ['NEWCOMER', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGENDARY'];
  return labels[Math.min(reputation, labels.length - 1)];
}

/**
 * Update a user's reputation based on their points
 */
export async function updateUserReputation(userId: string): Promise<void> {
  const points = await getUserPoints(userId);
  const reputation = calculateReputation(points);

  await prisma.user.update({
    where: { id: userId },
    data: { reputation },
  });
}
