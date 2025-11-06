import { z } from 'zod';

export const SponsoredPitchSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  pitchId: z.string().uuid(),
  targetGenres: z.array(z.string()).default([]),
  minMemberCount: z.number().int().nullable(),
  maxMemberCount: z.number().int().nullable(),
  targetFrequency: z.string().nullable(),
  budget: z.number().int(),
  creditsSpent: z.number().int(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSponsorshipSchema = z.object({
  pitchId: z.string().uuid(),
  targetGenres: z.array(z.string()).optional().default([]), // Empty = all genres
  minMemberCount: z.number().int().min(1).optional(), // Minimum club size
  maxMemberCount: z.number().int().min(1).optional(), // Maximum club size
  targetFrequency: z.string().optional(), // e.g., "1-2", "3-5", "6+"
  budget: z.number().int().min(100), // Minimum 100 credits for sponsorship
  durationDays: z.number().int().min(1).max(90).default(30), // 1-90 days
});

export const SponsorshipTargeting = z.object({
  genres: z.array(z.string()).optional(),
  minMembers: z.number().int().optional(),
  maxMembers: z.number().int().optional(),
  frequency: z.string().optional(),
});

export const SponsorshipAnalyticsSchema = z.object({
  sponsorshipId: z.string().uuid(),
  pitchId: z.string().uuid(),
  pitchTitle: z.string(),
  budget: z.number(),
  creditsSpent: z.number(),
  impressions: z.number(),
  clicks: z.number(),
  ctr: z.number(), // Click-through rate
  costPerImpression: z.number(),
  costPerClick: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
  daysRemaining: z.number(),
});

export type SponsoredPitch = z.infer<typeof SponsoredPitchSchema>;
export type CreateSponsorship = z.infer<typeof CreateSponsorshipSchema>;
export type SponsorshipTargeting = z.infer<typeof SponsorshipTargeting>;
export type SponsorshipAnalytics = z.infer<typeof SponsorshipAnalyticsSchema>;
