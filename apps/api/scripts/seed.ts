import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Check if Supabase credentials exist
  const hasSupabase = !!(
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let authorId: string;
  let readerId: string;

  if (hasSupabase) {
    console.log('✅ Supabase credentials found - would create users via Supabase Admin API');
    console.log('   (Skipping actual Supabase user creation in seed)');
    console.log('   Run sign-up manually via the app to create real users.\n');
    
    // Use placeholder IDs for now
    authorId = 'seed-author-id';
    readerId = 'seed-reader-id';
    
    // Create placeholder users in DB
    await prisma.user.upsert({
      where: { id: authorId },
      update: {},
      create: {
        id: authorId,
        email: 'author@example.com',
        name: 'Alice Author',
        bio: 'Loves writing and sharing books',
      },
    });

    await prisma.user.upsert({
      where: { id: readerId },
      update: {},
      create: {
        id: readerId,
        email: 'reader@example.com',
        name: 'Bob Reader',
        bio: 'Avid reader and book club enthusiast',
      },
    });

    console.log('✅ Created placeholder users in database');
  } else {
    console.log('⚠️  Supabase credentials not found');
    console.log('   Run sign-in manually via /auth/sign-in to create users.\n');
    
    // Use placeholder IDs
    authorId = 'manual-author-id';
    readerId = 'manual-reader-id';
    
    await prisma.user.upsert({
      where: { id: authorId },
      update: {},
      create: {
        id: authorId,
        email: 'author@example.com',
        name: 'Alice Author',
        bio: 'Loves writing and sharing books',
      },
    });

    await prisma.user.upsert({
      where: { id: readerId },
      update: {},
      create: {
        id: readerId,
        email: 'reader@example.com',
        name: 'Bob Reader',
        bio: 'Avid reader and book club enthusiast',
      },
    });

    console.log('✅ Created placeholder users in database');
  }

  // Seed Books
  console.log('\n📚 Seeding books...');
  
  const book1 = await prisma.book.upsert({
    where: { id: 'seed-book-1' },
    update: {},
    create: {
      id: 'seed-book-1',
      userId: authorId,
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '9780743273565',
      description: 'A classic American novel set in the Jazz Age',
      condition: 'VERY_GOOD',
      imageUrl: null,
      isAvailable: true,
    },
  });

  const book2 = await prisma.book.upsert({
    where: { id: 'seed-book-2' },
    update: {},
    create: {
      id: 'seed-book-2',
      userId: readerId,
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '9780061120084',
      description: 'A gripping tale of racial injustice and childhood innocence',
      condition: 'GOOD',
      imageUrl: null,
      isAvailable: true,
    },
  });

  const book3 = await prisma.book.upsert({
    where: { id: 'seed-book-3' },
    update: {},
    create: {
      id: 'seed-book-3',
      userId: authorId,
      title: '1984',
      author: 'George Orwell',
      isbn: '9780451524935',
      description: 'A dystopian social science fiction novel',
      condition: 'LIKE_NEW',
      imageUrl: null,
      isAvailable: false, // Not available - in a swap
    },
  });

  console.log(`✅ Created ${3} books`);

  // Seed Club
  console.log('\n📖 Seeding clubs...');
  
  const club = await prisma.club.upsert({
    where: { id: 'seed-club-1' },
    update: {},
    create: {
      id: 'seed-club-1',
      creatorId: authorId,
      name: 'Classic Literature Club',
      description: 'A club for lovers of timeless classics',
      imageUrl: null,
      maxMembers: 50,
      isPublic: true,
    },
  });

  console.log(`✅ Created club: ${club.name}`);

  // Seed Memberships
  console.log('\n👥 Seeding memberships...');
  
  await prisma.membership.upsert({
    where: { id: 'seed-membership-1' },
    update: {},
    create: {
      id: 'seed-membership-1',
      userId: authorId,
      clubId: club.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.membership.upsert({
    where: { id: 'seed-membership-2' },
    update: {},
    create: {
      id: 'seed-membership-2',
      userId: readerId,
      clubId: club.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created ${2} memberships`);

  // Seed Swap (pending)
  console.log('\n🔄 Seeding swaps...');
  
  const swap = await prisma.swap.upsert({
    where: { id: 'seed-swap-1' },
    update: {},
    create: {
      id: 'seed-swap-1',
      requesterId: readerId,
      recipientId: authorId,
      requestedBookId: book3.id,
      offeredBookId: book2.id,
      status: 'PENDING',
      message: 'Would love to read 1984! Happy to trade my copy of To Kill a Mockingbird.',
    },
  });

  console.log(`✅ Created pending swap request`);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Summary:');
  console.log('  - 2 users (Alice Author, Bob Reader)');
  console.log('  - 3 books (The Great Gatsby, To Kill a Mockingbird, 1984)');
  console.log('  - 1 club (Classic Literature Club)');
  console.log('  - 2 memberships');
  console.log('  - 1 pending swap request\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
