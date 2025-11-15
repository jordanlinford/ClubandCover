import { prisma } from '../lib/prisma.js';

beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect();
});

// Global test utilities
global.testUtils = {
  async cleanupDatabase() {
    // Clean up test data in reverse foreign key order
    await prisma.vote.deleteMany({});
    await prisma.poll.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.pitch.deleteMany({});
    await prisma.swap.deleteMany({});
    await prisma.book.deleteMany({});
    await prisma.pointLedger.deleteMany({});
    await prisma.redemptionRequest.deleteMany({});
    await prisma.userBadge.deleteMany({});
    await prisma.authorProfile.deleteMany({});
    await prisma.userProfile.deleteMany({});
    await prisma.club.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@test.com',
        },
      },
    });
  },
};

declare global {
  var testUtils: {
    cleanupDatabase: () => Promise<void>;
  };
}
