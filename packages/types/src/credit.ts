import { z } from 'zod';

export const CreditTransactionTypeSchema = z.enum([
  'PURCHASE',
  'BOOST_PITCH',
  'SPONSOR_CLUB',
  'REFUND',
]);

export const CreditTransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  pitchId: z.string().uuid().nullable(),
  type: CreditTransactionTypeSchema,
  amount: z.number().int(),
  balanceBefore: z.number().int(),
  balanceAfter: z.number().int(),
  stripePaymentId: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.date(),
});

export const PurchaseCreditsSchema = z.object({
  amount: z.number().int().min(10).max(10000), // 10-10,000 credits
  paymentMethodId: z.string(), // Stripe payment method ID
});

export const SpendCreditsSchema = z.object({
  pitchId: z.string().uuid(),
  amount: z.number().int().min(10), // Minimum 10 credits to boost
  durationDays: z.number().int().min(1).max(30).default(7), // 1-30 days boost
});

export type CreditTransactionType = z.infer<typeof CreditTransactionTypeSchema>;
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;
export type PurchaseCredits = z.infer<typeof PurchaseCreditsSchema>;
export type SpendCredits = z.infer<typeof SpendCreditsSchema>;
