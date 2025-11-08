import { PrismaClient } from '@prisma/client';
import { awardPoints } from './points.js';
import { awardBadge } from './badges.js';

const prisma = new PrismaClient();

/**
 * Auto-award FIRST_VOTE badge after first vote
 */
export async function maybeAwardFirstVote(userId: string) {
  const voteCount = await prisma.pointLedger.count({
    where: { userId, type: 'VOTE_PARTICIPATION' },
  });

  if (voteCount >= 1) {
    await awardBadge(userId, 'FIRST_VOTE');
  }
}

/**
 * Auto-award BOOKWORM badge after 10 votes
 */
export async function maybeAwardBookworm(userId: string) {
  const voteCount = await prisma.vote.count({
    where: { userId },
  });

  if (voteCount >= 10) {
    await awardBadge(userId, 'BOOKWORM');
  }
}

/**
 * Auto-award AUTHOR_LAUNCH badge after first pitch
 */
export async function maybeAwardAuthorLaunch(userId: string) {
  const pitchCount = await prisma.pointLedger.count({
    where: { userId, type: 'PITCH_CREATED' },
  });

  if (pitchCount >= 1) {
    await awardBadge(userId, 'AUTHOR_LAUNCH');
  }
}

/**
 * Auto-award SOCIABLE badge after 20 valid messages (≥10 chars)
 */
export async function maybeAwardSociable(userId: string) {
  // Count messages with body length >= 10
  const messages = await prisma.clubMessage.findMany({
    where: { userId },
    select: { body: true },
  });

  const validMessages = messages.filter(m => m.body.length >= 10);
  
  if (validMessages.length >= 20) {
    await awardBadge(userId, 'SOCIABLE');
  }
}

/**
 * Auto-award LOYAL_MEMBER badge after joining 3 clubs
 */
export async function maybeAwardLoyalMember(userId: string) {
  const clubCount = await prisma.membership.count({
    where: { userId, status: 'ACTIVE' },
  });

  if (clubCount >= 3) {
    await awardBadge(userId, 'LOYAL_MEMBER');
  }
}

/**
 * Auto-award HOST_STARTER badge after creating first club
 */
export async function maybeAwardHostStarter(userId: string) {
  const clubCount = await prisma.club.count({
    where: { createdById: userId },
  });

  if (clubCount >= 1) {
    await awardBadge(userId, 'HOST_STARTER');
  }
}

/**
 * Auto-award FAN_FAVORITE badge when pitch selected by 3 different clubs
 */
export async function maybeAwardFanFavorite(userId: string) {
  // Count unique clubs that selected this author's pitches
  const selectedPitches = await prisma.poll.findMany({
    where: {
      status: 'CLOSED',
      options: {
        some: {
          pitch: {
            authorId: userId,
          },
          votes: {
            some: {},
          },
        },
      },
    },
    distinct: ['clubId'],
  });

  if (selectedPitches.length >= 3) {
    await awardBadge(userId, 'FAN_FAVORITE');
  }
}

/**
 * Auto-award SWAP_VERIFIED badge after first verified swap with review
 */
export async function maybeAwardSwapVerified(userId: string) {
  const verifiedSwapReviewCount = await prisma.review.count({
    where: { reviewerId: userId, verifiedSwap: true },
  });

  if (verifiedSwapReviewCount >= 1) {
    await awardBadge(userId, 'SWAP_VERIFIED');
  }
}

/**
 * Auto-award SWAP_MASTER badge after 5 verified swaps with reviews
 */
export async function maybeAwardSwapMaster(userId: string) {
  const verifiedSwapReviewCount = await prisma.review.count({
    where: { reviewerId: userId, verifiedSwap: true },
  });

  if (verifiedSwapReviewCount >= 5) {
    await awardBadge(userId, 'SWAP_MASTER');
  }
}

/**
 * Auto-award BOOK_REVIEWER badge after first club book review
 */
export async function maybeAwardBookReviewer(userId: string) {
  const clubReviewCount = await prisma.review.count({
    where: { reviewerId: userId, clubBookId: { not: null } },
  });

  if (clubReviewCount >= 1) {
    await awardBadge(userId, 'BOOK_REVIEWER');
  }
}

/**
 * Auto-award CRITIC badge after 10 club book reviews
 */
export async function maybeAwardCritic(userId: string) {
  const clubReviewCount = await prisma.review.count({
    where: { reviewerId: userId, clubBookId: { not: null } },
  });

  if (clubReviewCount >= 10) {
    await awardBadge(userId, 'CRITIC');
  }
}

/**
 * Auto-award DECISIVE badge after completing 3 polls
 */
export async function maybeAwardDecisive(userId: string) {
  const pollCount = await prisma.poll.count({
    where: { createdBy: userId, status: 'CLOSED' },
  });

  if (pollCount >= 3) {
    await awardBadge(userId, 'DECISIVE');
  }
}

/**
 * Combined award function: award points and check for badge eligibility
 */
export async function awardPointsAndBadges(params: {
  userId: string;
  pointType: 'VOTE_PARTICIPATION' | 'MESSAGE_POSTED' | 'PITCH_CREATED' | 'JOIN_CLUB' | 'SWAP_COMPLETED';
  refType?: string;
  refId?: string;
  amount?: number;
}) {
  const { userId, pointType, refType, refId, amount } = params;

  // Award points
  const result = await awardPoints(userId, pointType, amount, refType, refId);

  // Check for badge awards based on point type
  if (result.ok && !result.idempotent) {
    switch (pointType) {
      case 'VOTE_PARTICIPATION':
        await maybeAwardFirstVote(userId);
        await maybeAwardBookworm(userId);
        break;
      
      case 'MESSAGE_POSTED':
        await maybeAwardSociable(userId);
        break;
      
      case 'PITCH_CREATED':
        await maybeAwardAuthorLaunch(userId);
        break;
      
      case 'JOIN_CLUB':
        await maybeAwardLoyalMember(userId);
        break;
      
      case 'SWAP_COMPLETED':
        await maybeAwardSwapMaster(userId);
        break;
    }
  }

  return result;
}
