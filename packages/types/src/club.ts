import { z } from 'zod';

export const ClubSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  genres: z.array(z.string()),
  imageUrl: z.string().url().nullable(),
  createdById: z.string(),
  maxMembers: z.number().int(),
  isPublic: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateClubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(100),
  description: z.string().max(500).optional(),
  genres: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  maxMembers: z.number().int().min(2).max(1000).default(50),
  isPublic: z.boolean().default(true),
});

export const UpdateClubSchema = CreateClubSchema.partial();

export type Club = z.infer<typeof ClubSchema>;
export type CreateClub = z.infer<typeof CreateClubSchema>;
export type UpdateClub = z.infer<typeof UpdateClubSchema>;
