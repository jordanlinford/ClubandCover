import { z } from 'zod';

export const MembershipRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'PENDING']);
export const MembershipStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DECLINED', 'REMOVED']);

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  clubId: z.string().uuid(),
  role: MembershipRoleSchema,
  status: MembershipStatusSchema,
  joinedAt: z.date(),
  invitedBy: z.string().nullable(),
});

export const CreateMembershipSchema = z.object({
  clubId: z.string().uuid(),
});

export const UpdateMembershipSchema = z.object({
  role: MembershipRoleSchema.optional(),
  status: MembershipStatusSchema.optional(),
});

export type Membership = z.infer<typeof MembershipSchema>;
export type CreateMembership = z.infer<typeof CreateMembershipSchema>;
export type UpdateMembership = z.infer<typeof UpdateMembershipSchema>;
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;
