import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'READER',
  'AUTHOR',
  'CLUB_ADMIN',
  'STAFF',
]);

export const TierSchema = z.enum([
  'FREE',
  'PRO_AUTHOR',
  'PRO_CLUB',
  'PUBLISHER',
]);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type Tier = z.infer<typeof TierSchema>;
