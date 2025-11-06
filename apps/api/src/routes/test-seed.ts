import { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js";

export default async function testSeedRoutes(fastify: FastifyInstance) {
  fastify.post("/api/test/seed-users", async (req, reply) => {
    // ✅ Only allow when explicitly enabled
    if (process.env.NODE_ENV === "production") {
      return reply.code(403).send({ error: "Forbidden in production" });
    }
    if (process.env.ENABLE_TEST_ROUTES !== "1") {
      return reply.code(403).send({ error: "Test routes not enabled" });
    }

    // ✅ Require a seed token header
    const token = req.headers["x-seed-token"];
    if (token !== process.env.TEST_SEED_TOKEN) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // ✅ Use the service-role key (server-only)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const users = [
      { email: "alice.test+e2e@bookpitch.dev", password: "Test123!" },
      { email: "bob.test+e2e@bookpitch.dev", password: "Test123!" },
    ];

    const results: any[] = [];
    for (const u of users) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        app_metadata: { seeded: true },
        user_metadata: { name: u.email.split("@")[0] },
      });
      results.push({
        email: u.email,
        id: data?.user?.id,
        error: error?.message ?? null,
      });
    }

    return { success: true, results };
  });

  // New comprehensive test fixture endpoint
  fastify.post("/api/test/seed-club-fixture", async (req, reply) => {
    // ✅ Only allow when explicitly enabled
    if (process.env.NODE_ENV === "production") {
      return reply.code(403).send({ error: "Forbidden in production" });
    }
    if (process.env.ENABLE_TEST_ROUTES !== "1") {
      return reply.code(403).send({ error: "Test routes not enabled" });
    }

    // ✅ Require a seed token header
    const token = req.headers["x-seed-token"];
    if (token !== process.env.TEST_SEED_TOKEN) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      // Create everything in a transaction for atomicity
      const fixture = await prisma.$transaction(async (tx) => {
        // 1. Generate a test user ID (Supabase auth may not be configured in test env)
        const testEmail = "clubtest@bookpitch.dev";
        const testPassword = "Test123!";
        
        // Try to create user in Supabase if configured
        let userId: string;
        try {
          if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: testEmail,
              password: testPassword,
              email_confirm: true,
              app_metadata: { seeded: true },
              user_metadata: { name: "Club Test User" },
            });

            if (authError || !authData.user) {
              throw new Error(`Failed to create auth user: ${authError?.message}`);
            }

            userId = authData.user.id;
          } else {
            // Fallback: generate a deterministic UUID for testing
            userId = 'test-user-clubtest-00000000-0000-0000-0000-000000000001';
            fastify.log.warn('SUPABASE_URL not configured, using fallback test user ID');
          }
        } catch (err: any) {
          fastify.log.error(`Supabase auth error: ${err.message}, using fallback`);
          userId = 'test-user-clubtest-00000000-0000-0000-0000-000000000001';
        }

        // 2. Create user record in database
        const user = await tx.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: testEmail,
            name: "Club Test User",
            role: "AUTHOR",
          },
          update: {},
        });

        // 3. Create user profile
        await tx.userProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            genres: ["Fiction", "Mystery"],
            booksPerMonth: 2,
            bio: "Test user for pitch browsing",
          },
          update: {},
        });

        // 4. Create a club
        const club = await tx.club.create({
          data: {
            name: "Mystery Book Club",
            description: "A club for mystery lovers",
            about: "We read mystery novels and discuss plot twists",
            preferredGenres: ["Mystery", "Thriller"],
            frequency: 12,
            minPointsToJoin: 0,
            isPublic: true,
            createdById: user.id,
          },
        });

        // 5. Create active membership for the user
        await tx.membership.create({
          data: {
            clubId: club.id,
            userId: user.id,
            status: "ACTIVE",
            role: "OWNER",
          },
        });

        // 6. Create a book
        const book = await tx.book.create({
          data: {
            title: "The Silent Witness",
            author: "Jane Detective",
            isbn: "978-1-234567-89-0",
            description: "A gripping mystery novel",
            imageUrl: "https://picsum.photos/seed/mystery1/400/600",
            ownerId: user.id,
          },
        });

        // 7. Create 3 pitches targeting the club
        const pitch1 = await tx.pitch.create({
          data: {
            title: "Why The Silent Witness is perfect for our club",
            synopsis: "This mystery novel has everything we love: complex characters, intricate plot twists, and a satisfying resolution. The author masterfully weaves clues throughout the narrative.",
            sampleUrl: "https://example.com/sample1",
            status: "SUBMITTED",
            targetClubId: club.id,
            authorId: user.id,
            bookId: book.id,
          },
        });

        const book2 = await tx.book.create({
          data: {
            title: "Murder at Midnight",
            author: "John Sleuth",
            isbn: "978-1-234567-89-1",
            description: "A classic whodunit",
            imageUrl: "https://picsum.photos/seed/mystery2/400/600",
            ownerId: user.id,
          },
        });

        const pitch2 = await tx.pitch.create({
          data: {
            title: "A Classic Whodunit for Mystery Fans",
            synopsis: "Murder at Midnight brings back the golden age of detective fiction with clever misdirection and memorable characters. Perfect for fans of Agatha Christie.",
            sampleUrl: "https://example.com/sample2",
            status: "SUBMITTED",
            targetClubId: club.id,
            authorId: user.id,
            bookId: book2.id,
          },
        });

        const book3 = await tx.book.create({
          data: {
            title: "The Last Clue",
            author: "Sarah Mystery",
            isbn: "978-1-234567-89-2",
            description: "A modern mystery thriller",
            imageUrl: "https://picsum.photos/seed/mystery3/400/600",
            ownerId: user.id,
          },
        });

        const pitch3 = await tx.pitch.create({
          data: {
            title: "A Modern Take on Classic Mystery",
            synopsis: "The Last Clue combines traditional mystery elements with contemporary themes. The protagonist's investigation will keep you guessing until the final page.",
            sampleUrl: null,
            status: "SUBMITTED",
            targetClubId: club.id,
            authorId: user.id,
            bookId: book3.id,
          },
        });

        // 8. Seed points for the user
        const pointsEntries = [
          { amount: 10, eventType: 'ACCOUNT_CREATED', refType: null, refId: null },
          { amount: 15, eventType: 'ONBOARDING_COMPLETED', refType: null, refId: null },
          { amount: 5, eventType: 'JOIN_CLUB', refType: 'CLUB', refId: club.id },
          { amount: 10, eventType: 'PITCH_CREATED', refType: 'PITCH', refId: pitch1.id },
          { amount: 10, eventType: 'PITCH_CREATED', refType: 'PITCH', refId: pitch2.id },
          { amount: 3, eventType: 'VOTE_PARTICIPATION', refType: null, refId: null },
          { amount: 3, eventType: 'VOTE_PARTICIPATION', refType: null, refId: null },
          { amount: 1, eventType: 'MESSAGE_POSTED', refType: 'CLUB', refId: club.id },
        ];

        for (const entry of pointsEntries) {
          await tx.pointLedger.create({
            data: {
              userId: user.id,
              amount: entry.amount,
              eventType: entry.eventType as any,
              refType: entry.refType,
              refId: entry.refId,
            },
          });
        }

        // 9. Seed badges for the user
        const badgesToAward = [
          { badgeId: 'FIRST_VOTE', earnedAt: new Date(Date.now() - 86400000 * 5) }, // 5 days ago
          { badgeId: 'AUTHOR_LAUNCH', earnedAt: new Date(Date.now() - 86400000 * 3) }, // 3 days ago
          { badgeId: 'HOST_STARTER', earnedAt: new Date(Date.now() - 86400000 * 2) }, // 2 days ago
        ];

        for (const badge of badgesToAward) {
          await tx.userBadge.create({
            data: {
              userId: user.id,
              badgeId: badge.badgeId,
              earnedAt: badge.earnedAt,
            },
          });
        }

        return {
          user: { id: user.id, email: user.email, password: testPassword },
          club: { id: club.id, name: club.name },
          books: [book.id, book2.id, book3.id],
          pitches: [pitch1.id, pitch2.id, pitch3.id],
          pointsTotal: pointsEntries.reduce((sum, p) => sum + p.amount, 0),
          badgesCount: badgesToAward.length,
        };
      });

      return {
        success: true,
        message: "Test fixture created successfully",
        fixture,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || "Failed to create test fixture",
      });
    }
  });
}
