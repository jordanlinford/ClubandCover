import { z } from 'zod';

export const SwapStatusSchema = z.enum([
  'REQUESTED',
  'ACCEPTED',
  'DECLINED',
  'DELIVERED',
  'VERIFIED',
]);

export const SwapSchema = z.object({
  id: z.string().uuid(),
  requesterId: z.string(),
  bookOfferedId: z.string().uuid(),
  responderId: z.string(),
  bookRequestedId: z.string().uuid(),
  status: SwapStatusSchema,
  message: z.string().nullable(),
  dueDate: z.date().nullable(),
  deliverable: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSwapSchema = z.object({
  bookOfferedId: z.string().uuid(),
  responderId: z.string(),
  bookRequestedId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export const UpdateSwapSchema = z.object({
  status: SwapStatusSchema.optional(),
  dueDate: z.string().datetime().optional(),
  deliverable: z.string().url().optional(),
});

export type Swap = z.infer<typeof SwapSchema>;
export type CreateSwap = z.infer<typeof CreateSwapSchema>;
export type UpdateSwap = z.infer<typeof UpdateSwapSchema>;
export type SwapStatus = z.infer<typeof SwapStatusSchema>;
