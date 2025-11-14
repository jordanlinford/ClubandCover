import type { FastifyInstance } from 'fastify';
import { bookRoutes } from './books.js';
import { clubRoutes } from './clubs.js';
import { membershipRoutes } from './memberships.js';
import { swapRoutes } from './swaps.js';
import { billingRoutes } from './billing.js';
import { webhookRoutes } from './webhooks.js';
import { reviewRoutes } from './reviews.js';
import { aiRoutes } from './ai.js';
import { testSupportRoutes } from './test-support.js';
import threadRoutes from './threads.js';
import messageRoutes from './messages.js';
import moderationRoutes from './moderation.js';
import pitchesRoutes from './pitches.js';
import pitchNominationsRoutes from './pitch-nominations.js';
import pollsRoutes from './polls.js';
import { referralsRoutes } from './referrals.js';
import { notificationsRoutes } from './notifications.js';
import { settingsRoutes } from './settings.js';
import { discoverRoutes } from './discover.js';
import { checklistsRoutes } from './checklists.js';
import { analyticsRoutes } from './analytics.js';
import { cronRoutes } from './cron.js';
import { pollsFullRoutes } from './polls_full.js';
import onboardingRoutes from './onboarding.js';
import clubMessagesRoutes from './club-messages.js';
import pointsRoutes from './points.js';
import { authRoutes } from './auth.js';
import { adminRoutes } from './admin.js';
import { userRoutes } from './users.js';
import { rewardRoutes } from './rewards.js';
import { adminRewardRoutes } from './adminRewards.js';
import { authorFollowRoutes } from './author-follows.js';
import { authorProfileRoutes } from './author-profiles.js';
import { adminAuthorVerificationRoutes } from './admin-author-verifications.js';

export async function routes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/debug/config', async () => {
    return {
      supabaseBackend: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      supabaseFrontend: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      stripeBackend: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeFrontend: !!process.env.VITE_STRIPE_PUBLIC_KEY,
      resendEmail: !!process.env.RESEND_API_KEY,
      openaiBackend: !!process.env.OPENAI_API_KEY,
    };
  });

  await fastify.register(bookRoutes, { prefix: '/books' });
  await fastify.register(clubRoutes, { prefix: '/clubs' });
  await fastify.register(membershipRoutes, { prefix: '/memberships' });
  await fastify.register(swapRoutes, { prefix: '/swaps' });
  await fastify.register(billingRoutes, { prefix: '/billing' });
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });
  await fastify.register(reviewRoutes, { prefix: '/reviews' });
  await fastify.register(aiRoutes, { prefix: '/ai' });
  await fastify.register(userRoutes, { prefix: '/users' });
  await fastify.register(threadRoutes);
  await fastify.register(messageRoutes);
  await fastify.register(moderationRoutes, { prefix: '/moderation' });
  await fastify.register(pitchesRoutes, { prefix: '/pitches' });
  await fastify.register(pitchNominationsRoutes);
  await fastify.register(pollsRoutes, { prefix: '/polls' });
  
  // Sprint 5: Growth & Stickiness features
  await fastify.register(referralsRoutes);
  await fastify.register(notificationsRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(discoverRoutes);
  await fastify.register(checklistsRoutes);
  await fastify.register(analyticsRoutes, { prefix: '/analytics' });
  await fastify.register(cronRoutes);
  await fastify.register(pollsFullRoutes);
  
  // Sprint 6: Reader onboarding & club discovery
  await fastify.register(onboardingRoutes);
  await fastify.register(clubMessagesRoutes);
  
  // Points & Badges v1
  await fastify.register(pointsRoutes);
  
  // Rewards & Redemptions
  await fastify.register(rewardRoutes, { prefix: '/rewards' });
  
  // Authentication (email verification, password reset)
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // Phase 1 Monetization routes
  const creditsRoutes = (await import('./credits.js')).default;
  const sponsorshipsRoutes = (await import('./sponsorships.js')).default;
  await fastify.register(creditsRoutes);
  await fastify.register(sponsorshipsRoutes);
  
  // Admin routes (STAFF only)
  await fastify.register(adminRoutes, { prefix: '/admin' });
  await fastify.register(adminRewardRoutes, { prefix: '/admin' });
  
  // Author follows (subscription to authors)
  await fastify.register(authorFollowRoutes);
  
  // Author profiles and verification
  await fastify.register(authorProfileRoutes, { prefix: '/author-profiles' });
  await fastify.register(adminAuthorVerificationRoutes, { prefix: '/admin/author-verifications' });
  
  // Test support routes (only enabled in test environment)
  await fastify.register(testSupportRoutes, { prefix: '/test' });
}
