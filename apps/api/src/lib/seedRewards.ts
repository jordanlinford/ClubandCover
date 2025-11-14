import { prisma } from './prisma.js';

export async function seedInitialRewards() {
  const existingRewards = await prisma.rewardItem.count();
  
  if (existingRewards > 0) {
    console.log('[SEED] Rewards already exist, skipping seed');
    return { success: true, message: 'Rewards already seeded' };
  }

  const initialRewards = [
    {
      name: '$5 Amazon / Kindle Gift Card',
      description: 'Redeem for a $5 Amazon or Kindle gift card to buy your next great read!',
      pointsCost: 500,
      rewardType: 'PLATFORM' as const,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Free Ebook from Partner Author',
      description: 'Get a free ebook from one of our partnering authors. Perfect for discovering new voices!',
      pointsCost: 250,
      rewardType: 'AUTHOR_CONTRIBUTED' as const,
      copiesAvailable: 100,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Club & Cover Badge Pack',
      description: 'Unlock exclusive profile badges to show off your reader achievements!',
      pointsCost: 100,
      rewardType: 'FEATURE' as const,
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Feature Your Book to Clubs (48 Hours)',
      description: 'Authors: Get your book featured to all clubs for 48 hours to maximize visibility!',
      pointsCost: 750,
      rewardType: 'FEATURE' as const,
      sortOrder: 4,
      isActive: true,
    },
    {
      name: 'Bonus Points Multiplier (24 Hours)',
      description: 'Earn 2x points for all activities for the next 24 hours. Stack your rewards faster!',
      pointsCost: 300,
      rewardType: 'FEATURE' as const,
      sortOrder: 5,
      isActive: true,
    },
  ];

  const created = await prisma.rewardItem.createMany({
    data: initialRewards,
  });

  console.log(`[SEED] Created ${created.count} initial rewards`);
  
  return { 
    success: true, 
    message: `Created ${created.count} initial rewards`,
    count: created.count 
  };
}
