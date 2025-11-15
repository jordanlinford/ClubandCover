import { prisma } from '../../lib/prisma.js';
import type { 
  PollType, 
  PollStatus, 
  PitchStatus, 
  PointType, 
  BookCondition,
  RewardType 
} from '@prisma/client';

/**
 * Test data factories aligned with current Prisma schema
 * Prevents ad-hoc Prisma calls and schema drift
 */

// Enum constants to prevent typos and ensure type safety
export const TestEnums = {
  PollType: {
    PITCH: 'PITCH' as PollType,
    BOOK: 'BOOK' as PollType,
  },
  PollStatus: {
    DRAFT: 'DRAFT' as PollStatus,
    OPEN: 'OPEN' as PollStatus,
    CLOSED: 'CLOSED' as PollStatus,
    ARCHIVED: 'ARCHIVED' as PollStatus,
  },
  PitchStatus: {
    SUBMITTED: 'SUBMITTED' as PitchStatus,
    ACCEPTED: 'ACCEPTED' as PitchStatus,
    REJECTED: 'REJECTED' as PitchStatus,
    ARCHIVED: 'ARCHIVED' as PitchStatus,
  },
  PointType: {
    SWAP_VERIFIED: 'SWAP_VERIFIED' as PointType,
    ON_TIME_DELIVERY: 'ON_TIME_DELIVERY' as PointType,
    PITCH_SELECTED: 'PITCH_SELECTED' as PointType,
    VOTE_PARTICIPATION: 'VOTE_PARTICIPATION' as PointType,
    REVIEW_VERIFIED: 'REVIEW_VERIFIED' as PointType,
    EARNED: 'EARNED' as PointType,
    SPENT: 'SPENT' as PointType,
  },
  BookCondition: {
    NEW: 'NEW' as BookCondition,
    LIKE_NEW: 'LIKE_NEW' as BookCondition,
    GOOD: 'GOOD' as BookCondition,
    ACCEPTABLE: 'ACCEPTABLE' as BookCondition,
  },
  RewardType: {
    PLATFORM: 'PLATFORM' as RewardType,
    AUTHOR_CONTRIBUTED: 'AUTHOR_CONTRIBUTED' as RewardType,
  },
};

// Factory: Create test book
export async function createTestBook(params: {
  ownerId: string;
  title?: string;
  author?: string;
  isbn?: string;
  condition?: BookCondition;
  genres?: string[];
}) {
  return prisma.book.create({
    data: {
      ownerId: params.ownerId,
      title: params.title ?? 'Test Book',
      author: params.author ?? 'Test Author',
      isbn: params.isbn,
      condition: params.condition ?? TestEnums.BookCondition.GOOD,
      genres: params.genres ?? ['FICTION'],
    },
  });
}

// Factory: Create test poll
export async function createTestPoll(params: {
  clubId: string;
  createdBy: string;
  type?: PollType;
  status?: PollStatus;
  closesAt?: Date;
}) {
  return prisma.poll.create({
    data: {
      clubId: params.clubId,
      createdBy: params.createdBy,
      type: params.type ?? TestEnums.PollType.PITCH,
      status: params.status ?? TestEnums.PollStatus.OPEN,
      opensAt: new Date(),
      closesAt: params.closesAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

// Factory: Create test pitch
export async function createTestPitch(params: {
  authorId: string;
  bookId: string;
  title?: string;
  synopsis?: string;
  genres?: string[];
  status?: PitchStatus;
}) {
  return prisma.pitch.create({
    data: {
      authorId: params.authorId,
      bookId: params.bookId,
      title: params.title ?? 'Test Pitch',
      synopsis: params.synopsis ?? 'Test synopsis',
      genres: params.genres ?? ['FICTION'],
      status: params.status ?? TestEnums.PitchStatus.SUBMITTED,
    },
  });
}

// Factory: Create pitch nomination
export async function createTestPitchNomination(params: {
  pitchId: string;
  userId: string;
}) {
  return prisma.pitchNomination.create({
    data: {
      pitchId: params.pitchId,
      userId: params.userId,
    },
  });
}

// Factory: Create point ledger entry
export async function createTestPointEntry(params: {
  userId: string;
  amount: number;
  type: PointType;
  refType?: string;
  refId?: string;
}) {
  return prisma.pointLedger.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      type: params.type,
      refType: params.refType,
      refId: params.refId,
    },
  });
}

// Factory: Create reward item
export async function createTestRewardItem(params: {
  name?: string;
  pointsCost?: number;
  copiesAvailable?: number;
  rewardType?: RewardType;
}) {
  return prisma.rewardItem.create({
    data: {
      name: params.name ?? 'Test Reward',
      description: 'Test reward description',
      pointsCost: params.pointsCost ?? 100,
      copiesAvailable: params.copiesAvailable ?? 10,
      rewardType: params.rewardType ?? TestEnums.RewardType.PLATFORM,
    },
  });
}

// Factory: Create redemption request
export async function createTestRedemptionRequest(params: {
  userId: string;
  rewardItemId: string;
  pointsSpent: number;
  status?: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'DECLINED' | 'CANCELLED';
}) {
  return prisma.redemptionRequest.create({
    data: {
      userId: params.userId,
      rewardItemId: params.rewardItemId,
      pointsSpent: params.pointsSpent,
      status: params.status ?? 'PENDING',
    },
  });
}

// Factory: Create message thread (DM between two users)
export async function createTestMessageThread(params: {
  userId1: string;
  userId2: string;
}) {
  const thread = await prisma.messageThread.create({
    data: {
      type: 'DM',
      members: {
        create: [
          { 
            user: {
              connect: { id: params.userId1 }
            }
          },
          { 
            user: {
              connect: { id: params.userId2 }
            }
          },
        ],
      },
    },
  });
  return thread;
}
