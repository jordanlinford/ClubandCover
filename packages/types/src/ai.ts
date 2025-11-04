import { z } from 'zod';

// AI feature schemas
export const GenerateBlurbSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  genres: z.array(z.string()).optional(),
  subtitle: z.string().optional(),
  currentBlurb: z.string().optional(),
});

export const IndexOneSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['BOOK', 'CLUB']),
});

export const MatchSchema = z.object({
  bookId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
}).refine(data => data.bookId || data.clubId, {
  message: 'Either bookId or clubId must be provided',
});

export const MatchResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['BOOK', 'CLUB']),
  score: z.number().min(0).max(1),
  why: z.string(),
});

// Types
export type GenerateBlurbRequest = z.infer<typeof GenerateBlurbSchema>;
export type IndexOneRequest = z.infer<typeof IndexOneSchema>;
export type MatchRequest = z.infer<typeof MatchSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
