import { z } from 'zod';

export const SwapStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED',
]);

export const SwapSchema = z.object({
  id: z.string().uuid(),
  requesterId: z.string(),
  bookOfferedId: z.string().uuid(),
  recipientId: z.string(),
  bookRequestedId: z.string().uuid(),
  status: SwapStatusSchema,
  message: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSwapSchema = z.object({
  bookOfferedId: z.string().uuid(),
  recipientId: z.string(),
  bookRequestedId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export const UpdateSwapSchema = z.object({
  status: SwapStatusSchema,
});

export type Swap = z.infer<typeof SwapSchema>;
export type CreateSwap = z.infer<typeof CreateSwapSchema>;
export type UpdateSwap = z.infer<typeof UpdateSwapSchema>;
export type SwapStatus = z.infer<typeof SwapStatusSchema>;
