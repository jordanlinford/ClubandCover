import { z } from 'zod';
import { UserRoleSchema, TierSchema } from './role';

export const AccountStatusSchema = z.enum(['ACTIVE', 'DISABLED', 'DELETED']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  roles: z.array(UserRoleSchema),
  tier: TierSchema,
  accountStatus: AccountStatusSchema,
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  disabledAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
