import { z } from 'zod';
import { TierSchema } from './role';

export const CheckoutSessionRequestSchema = z.object({
  plan: z.enum(['PRO_AUTHOR', 'PRO_CLUB']),
});

export const CheckoutSessionResponseSchema = z.object({
  url: z.string().url(),
});

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  swapId: z.string().uuid().nullable(),
  amount: z.number().int(),
  stripePaymentId: z.string(),
  plan: TierSchema,
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CheckoutSessionRequest = z.infer<typeof CheckoutSessionRequestSchema>;
export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
