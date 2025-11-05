import { PrismaClient, PointType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Point values for different actions
 */
export const POINT_VALUES: Record<PointType, number> = {
  SWAP_VERIFIED: 50,        // Points for completing a swap
  ON_TIME_DELIVERY: 25,     // Bonus for on-time delivery
  PITCH_SELECTED: 100,      // Points for having your pitch selected
  VOTE_PARTICIPATION: 3,    // Points for voting in a poll
  REVIEW_VERIFIED: 10,      // Points for verified book review
  SOCIAL_SHARE: 5,          // Points for sharing content
  HOST_ACTION: 15,          // Points for hosting club activities
} as const;

/**
 * Award points to a user with idempotency guarantees
 * 
 * @param userId - User to award points to
 * @param type - Type of point action (enum)
 * @param amount - Number of points to award (can be negative for deductions)
 * @param refType - Optional reference type for idempotency (e.g., "SWAP", "PITCH", "POLL")
 * @param refId - Optional reference ID for idempotency (e.g., swapId, pollId)
 * @returns The created PointLedger entry, or null if already awarded
 */
export async function awardPoints(
  userId: string,
  type: PointType,
  amount: number,
  refType?: string,
  refId?: string
): Promise<any> {
  // If refId is provided, check for existing entry (idempotency)
  if (refId && refType) {
    const existing = await prisma.pointLedger.findFirst({
      where: {
        userId,
        type,
        refType,
        refId,
      },
    });

    if (existing) {
      // Already awarded - return null to indicate no-op
      return null;
    }
  }

  // Award points in a transaction
  return await prisma.$transaction(async (tx) => {
    // Create ledger entry
    const entry = await tx.pointLedger.create({
      data: {
        userId,
        type,
        amount,
        refType: refType || null,
        refId: refId || null,
      },
    });

    // Update user's total points
    await tx.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: amount,
        },
      },
    });

    return entry;
  });
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
