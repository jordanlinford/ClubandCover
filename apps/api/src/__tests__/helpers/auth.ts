import { prisma } from '../../lib/prisma.js';
import { supabase } from '../../lib/supabase.js';
import type { User, AccountStatus, Role, Tier } from '@prisma/client';

interface CreateTestUserOptions {
  email: string;
  name: string;
  roles?: Role[];
  tier?: Tier;
  accountStatus?: AccountStatus;
  password?: string;
}

interface TestUser {
  user: User;
  token: string;
  supabaseUserId: string;
}

export async function createTestUser(options: CreateTestUserOptions): Promise<TestUser> {
  const {
    email,
    name,
    roles = ['READER'],
    tier = 'FREE',
    accountStatus = 'ACTIVE',
    password = 'Test1234!',
  } = options;

  // Create user in Supabase Auth (for dev environment, we'll use a mock token approach)
  // In production tests, you'd use Supabase's createUser API with service role key
  
  // For dev/test environment, create a mock Supabase user
  const supabaseUserId = crypto.randomUUID();
  
  // Create user in our database
  const user = await prisma.user.create({
    data: {
      id: supabaseUserId,
      email,
      name,
      roles,
      tier,
      accountStatus,
    },
  });

  // Generate a test JWT token
  // In dev environment, we use simple tokens that match the user ID
  // The dev auth middleware will accept tokens in format: `test-token-${userId}`
  const token = `test-token-${user.id}`;

  return {
    user,
    token,
    supabaseUserId,
  };
}

export async function createTestAuthor(options: Omit<CreateTestUserOptions, 'roles'> & {
  penName?: string;
  bio?: string;
}): Promise<TestUser & { authorProfileId: string }> {
  const { penName = options.name, bio = 'Test author bio', ...userOptions } = options;

  const testUser = await createTestUser({
    ...userOptions,
    roles: ['AUTHOR'],
  });

  const authorProfile = await prisma.authorProfile.create({
    data: {
      userId: testUser.user.id,
      penName,
      bio,
      verificationStatus: 'VERIFIED',
    },
  });

  return {
    ...testUser,
    authorProfileId: authorProfile.id,
  };
}

export async function createTestReader(
  options: Omit<CreateTestUserOptions, 'roles'>
): Promise<TestUser & { userProfileId: string }> {
  const testUser = await createTestUser({
    ...options,
    roles: ['READER'],
  });

  const userProfile = await prisma.userProfile.create({
    data: {
      userId: testUser.user.id,
    },
  });

  return {
    ...testUser,
    userProfileId: userProfile.id,
  };
}

export async function createTestClubAdmin(options: Omit<CreateTestUserOptions, 'roles'> & {
  clubName: string;
  clubDescription?: string;
}): Promise<TestUser & { clubId: string }> {
  const { clubName, clubDescription = 'Test club', ...userOptions } = options;

  const testUser = await createTestUser({
    ...userOptions,
    roles: ['CLUB_ADMIN', 'READER'],
  });

  // Create user profile first
  await prisma.userProfile.create({
    data: {
      userId: testUser.user.id,
    },
  });

  const club = await prisma.club.create({
    data: {
      name: clubName,
      description: clubDescription,
      createdById: testUser.user.id,
      isPublic: true,
      joinRules: 'OPEN',
    },
  });

  // Add user as club member
  await prisma.membership.create({
    data: {
      clubId: club.id,
      userId: testUser.user.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  return {
    ...testUser,
    clubId: club.id,
  };
}

export async function deleteTestUser(userId: string): Promise<void> {
  // Delete in reverse foreign key order
  await prisma.vote.deleteMany({ where: { userId } });
  await prisma.message.deleteMany({ where: { userId } });
  await prisma.membership.deleteMany({ where: { userId } });
  await prisma.pitch.deleteMany({ where: { authorId: userId } });
  await prisma.swap.deleteMany({
    where: {
      OR: [{ requesterId: userId }, { responderId: userId }],
    },
  });
  await prisma.book.deleteMany({ where: { ownerId: userId } });
  await prisma.pointLedger.deleteMany({ where: { userId } });
  await prisma.redemptionRequest.deleteMany({ where: { userId } });
  await prisma.userBadge.deleteMany({ where: { userId } });
  await prisma.authorProfile.deleteMany({ where: { userId } });
  await prisma.userProfile.deleteMany({ where: { userId } });
  await prisma.club.deleteMany({ where: { createdById: userId } });
  await prisma.user.delete({ where: { id: userId } });
}

export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
