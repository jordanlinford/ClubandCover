import { prisma } from './prisma.js';
import { awardPoints } from './points.js';
import { createNotification } from './notifications.js';

const REFERRAL_CODE_LENGTH = 8;
const MAX_REWARDED_ACTIVATIONS_PER_DAY = 5;
const REF_BASE = process.env.REFERRAL_BASE_URL || '';

/**
 * Build a full referral URL with base domain
 * If no base set, returns code-only URL fragment for graceful fallback
 */
export function buildReferralUrl(code: string): string {
  return REF_BASE 
    ? `${REF_BASE}?ref=${encodeURIComponent(code)}` 
    : `?ref=${encodeURIComponent(code)}`;
}

export interface ReferralResult {
  code: string;
  id: string;
  url: string;
}

export interface ActivationResult {
  success: boolean;
  referrerId?: string;
  refereeId?: string;
  alreadyActivated?: boolean;
  limitReached?: boolean;
}

/**
 * Generate a unique referral code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a referral code for a user
 */
export async function createReferralCode(userId: string): Promise<ReferralResult> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateCode();
    
    try {
      const referral = await prisma.referral.create({
        data: {
          referrerId: userId,
          code,
          status: 'ISSUED',
        },
      });

      return {
        code: referral.code,
        id: referral.id,
        url: buildReferralUrl(referral.code),
      };
    } catch (error: any) {
      // If unique constraint violation, try again
      if (error.code === 'P2002') {
        attempts++;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate unique referral code');
}

/**
 * Activate a referral code for a new user
 * Enforces idempotency: same user can't activate same code twice
 * Enforces rate limit: max 5 rewarded activations per referrer per 24h
 */
export async function activateReferralCode(
  code: string,
  refereeId: string
): Promise<ActivationResult> {
  // Find the referral
  const referral = await prisma.referral.findUnique({
    where: { code },
    include: { referrer: true },
  });

  if (!referral) {
    return { success: false };
  }

  // Check if already activated by this user (idempotency)
  if (referral.refereeId === refereeId) {
    return {
      success: false,
      alreadyActivated: true,
      referrerId: referral.referrerId,
      refereeId,
    };
  }

  // If already activated by someone else, fail
  if (referral.status === 'ACTIVATED') {
    return { success: false };
  }

  // Check daily activation limit for this referrer
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivations = await prisma.referral.count({
    where: {
      referrerId: referral.referrerId,
      status: 'ACTIVATED',
      activatedAt: {
        gte: twentyFourHoursAgo,
      },
    },
  });

  if (recentActivations >= MAX_REWARDED_ACTIVATIONS_PER_DAY) {
    return {
      success: false,
      limitReached: true,
      referrerId: referral.referrerId,
    };
  }

  // Activate the referral
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: 'ACTIVATED',
      refereeId,
      activatedAt: new Date(),
    },
  });

  // Award points to both users
  try {
    // Referrer gets 50 points
    await awardPoints(
      referral.referrerId,
      'REFERRAL_ACTIVATED',
      50,
      'referral',
      referral.id
    );

    // Referee gets 25 points
    await awardPoints(refereeId, 'REFERRAL_ACTIVATED', 25, 'referral', referral.id);

    // Create notification for referrer
    await createNotification(referral.referrerId, 'REFERRAL_ACTIVATED', {
      referralCode: code,
      points: 50,
    });

    // Create notification for referee
    await createNotification(refereeId, 'REFERRAL_ACTIVATED', {
      referralCode: code,
      points: 25,
    });
  } catch (error) {
    console.error('Failed to award points or create notifications:', error);
    // Don't fail the activation if points/notifications fail
  }

  return {
    success: true,
    referrerId: referral.referrerId,
    refereeId,
  };
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const [issued, activated, totalPoints] = await Promise.all([
    prisma.referral.count({
      where: { referrerId: userId },
    }),
    prisma.referral.count({
      where: {
        referrerId: userId,
        status: 'ACTIVATED',
      },
    }),
    prisma.pointLedger.aggregate({
      where: {
        userId,
        type: 'REFERRAL_ACTIVATED',
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    issued,
    activated,
    pointsEarned: totalPoints._sum.amount || 0,
  };
}

/**
 * Get all referrals for a user
 */
export async function getUserReferrals(userId: string) {
  return prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
