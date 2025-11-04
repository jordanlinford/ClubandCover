import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  reviewerId: z.string(),
  revieweeId: z.string(),
  swapId: z.string().uuid(),
  bookId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  verifiedSwap: z.boolean(),
  createdAt: z.date(),
});

export const CreateReviewSchema = z.object({
  revieweeId: z.string(),
  swapId: z.string().uuid(),
  bookId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type Review = z.infer<typeof ReviewSchema>;
export type CreateReview = z.infer<typeof CreateReviewSchema>;
