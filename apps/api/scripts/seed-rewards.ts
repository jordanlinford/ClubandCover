import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRewards() {
  console.log('🌱 Seeding rewards catalog...');

  const platformRewards = [
    {
      name: '3 Free Pitch Boosts',
      description: 'Boost 3 pitches to the top of club feeds for increased visibility. Pitch boosts last 7 days each.',
      pointsCost: 500,
      rewardType: 'FEATURE' as const,
      contributorId: null,
      copiesAvailable: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 1,
      metadata: {
        boostDays: 7,
        boostCount: 3,
      },
    },
    {
      name: 'Exclusive "Early Supporter" Badge',
      description: 'Display the prestigious Early Supporter badge on your profile to show your founding member status.',
      pointsCost: 1000,
      rewardType: 'FEATURE' as const,
      contributorId: null,
      copiesAvailable: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 2,
      metadata: {
        badgeCode: 'EARLY_SUPPORTER',
      },
    },
    {
      name: '1 Month Free Author Pro Upgrade',
      description: 'Unlock all Author Pro features for 30 days: unlimited pitches, advanced analytics, and priority support.',
      pointsCost: 2000,
      rewardType: 'FEATURE' as const,
      contributorId: null,
      copiesAvailable: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 3,
      metadata: {
        durationDays: 30,
        tier: 'PRO',
      },
    },
    {
      name: 'Custom Profile Theme',
      description: 'Choose from premium profile themes to personalize your author or reader profile page.',
      pointsCost: 750,
      rewardType: 'FEATURE' as const,
      contributorId: null,
      copiesAvailable: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 4,
      metadata: {
        durationDays: 90,
        feature: 'CUSTOM_THEME',
      },
    },
    {
      name: 'Top Reader Badge',
      description: 'Earn the exclusive Top Reader badge for completing 50+ book reviews.',
      pointsCost: 1500,
      rewardType: 'FEATURE' as const,
      contributorId: null,
      copiesAvailable: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 5,
      metadata: {
        badgeCode: 'TOP_READER',
      },
    },
  ];

  const authorContributedRewards = [
    {
      name: 'Signed Paperback - "The Last Ember"',
      description: 'A personally signed paperback copy of "The Last Ember" by bestselling author Sarah Chen. Includes a handwritten thank-you note.',
      pointsCost: 800,
      rewardType: 'AUTHOR_CONTRIBUTED' as const,
      contributorId: null, // Would be set to actual author ID in production
      copiesAvailable: 10,
      imageUrl: null,
      isActive: true,
      sortOrder: 10,
      metadata: {
        deliveryMethod: 'PHYSICAL_MAIL',
        estimatedDays: 14,
      },
    },
    {
      name: 'Virtual Coffee Chat with Author',
      description: '30-minute one-on-one video call with published author Michael Torres. Discuss writing, publishing, or get feedback on your work.',
      pointsCost: 1200,
      rewardType: 'AUTHOR_CONTRIBUTED' as const,
      contributorId: null,
      copiesAvailable: 5,
      imageUrl: null,
      isActive: true,
      sortOrder: 11,
      metadata: {
        deliveryMethod: 'EMAIL_CODE',
        instructions: 'Scheduling link will be emailed within 48 hours',
      },
    },
    {
      name: 'Exclusive Short Story Collection (Digital)',
      description: 'Download 3 never-before-published short stories by award-winning author Jennifer Liu. PDF and EPUB formats included.',
      pointsCost: 600,
      rewardType: 'DIGITAL' as const,
      contributorId: null,
      copiesAvailable: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 12,
      metadata: {
        deliveryMethod: 'EMAIL_CODE',
        instructions: 'Download link expires in 30 days',
      },
    },
  ];

  for (const reward of [...platformRewards, ...authorContributedRewards]) {
    // Check if reward already exists by name
    const existing = await prisma.rewardItem.findFirst({
      where: { name: reward.name },
    });

    if (existing) {
      await prisma.rewardItem.update({
        where: { id: existing.id },
        data: reward,
      });
      console.log(`✅ Updated reward: ${reward.name}`);
    } else {
      await prisma.rewardItem.create({
        data: reward,
      });
      console.log(`✅ Created reward: ${reward.name}`);
    }
  }

  console.log('✨ Rewards catalog seeded successfully!');
}

seedRewards()
  .catch((e) => {
    console.error('❌ Error seeding rewards:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
