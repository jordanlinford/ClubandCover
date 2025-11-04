import { z } from 'zod';

export const BookConditionSchema = z.enum([
  'NEW',
  'LIKE_NEW',
  'VERY_GOOD',
  'GOOD',
  'ACCEPTABLE',
]);

export const BookSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  author: z.string(),
  genres: z.array(z.string()),
  isbn: z.string().nullable(),
  description: z.string().nullable(),
  condition: BookConditionSchema,
  imageUrl: z.string().url().nullable(),
  isAvailable: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  author: z.string().min(1, 'Author is required'),
  genres: z.array(z.string()).default([]),
  isbn: z.string().optional(),
  description: z.string().optional(),
  condition: BookConditionSchema.default('GOOD'),
  imageUrl: z.string().url().optional(),
});

export const UpdateBookSchema = CreateBookSchema.partial();

export type Book = z.infer<typeof BookSchema>;
export type CreateBook = z.infer<typeof CreateBookSchema>;
export type UpdateBook = z.infer<typeof UpdateBookSchema>;
export type BookCondition = z.infer<typeof BookConditionSchema>;
