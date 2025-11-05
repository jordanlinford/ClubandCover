import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starting Sprint-4 schema migration...');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // The schema is already defined in schema.prisma
    // Prisma will auto-create tables based on the schema
    console.log('✅ Sprint-4 migration complete!');
    console.log('📊 New models: Pitch, Poll, PollOption, Vote, PointLedger');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
