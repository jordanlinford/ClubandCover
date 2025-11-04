import { z } from 'zod';

/**
 * Sprint-3: Messaging & Moderation Types
 * Shared Zod schemas and TypeScript types for thread-based messaging
 */

// ============================================================================
// Enums
// ============================================================================

export const threadTypeSchema = z.enum(['DM', 'CLUB']);
export type ThreadType = z.infer<typeof threadTypeSchema>;

export const reportStatusSchema = z.enum(['PENDING', 'REVIEWED', 'DISMISSED']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

// ============================================================================
// Thread Schemas
// ============================================================================

export const createThreadSchema = z.object({
  type: threadTypeSchema,
  clubId: z.string().uuid().optional(),
  // For DM threads, we'll pass recipientId separately
  recipientId: z.string().uuid().optional(),
});

export const threadMemberSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  userId: z.string().uuid(),
  joinedAt: z.date(),
  lastReadAt: z.date().nullable(),
});

export const threadSchema = z.object({
  id: z.string().uuid(),
  type: threadTypeSchema,
  clubId: z.string().uuid().nullable(),
  createdAt: z.date(),
});

export const threadWithMembersSchema = threadSchema.extend({
  members: z.array(threadMemberSchema),
  unreadCount: z.number().optional(), // Computed field
});

export type CreateThread = z.infer<typeof createThreadSchema>;
export type ThreadMember = z.infer<typeof threadMemberSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type ThreadWithMembers = z.infer<typeof threadWithMembersSchema>;

// ============================================================================
// Message Schemas
// ============================================================================

export const createMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  flaggedAt: z.date().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.date().nullable(),
});

export const messageWithSenderSchema = messageSchema.extend({
  sender: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

export type CreateMessage = z.infer<typeof createMessageSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageWithSender = z.infer<typeof messageWithSenderSchema>;

// ============================================================================
// Moderation Schemas
// ============================================================================

export const createReportSchema = z.object({
  reason: z.string().min(10).max(1000),
});

export const moderationReportSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  reporterId: z.string().uuid(),
  reason: z.string(),
  status: reportStatusSchema,
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.date().nullable(),
  createdAt: z.date(),
});

export const reviewActionSchema = z.object({
  action: z.enum(['FLAG', 'CLEAR', 'DISMISS']),
  notes: z.string().optional(),
});

export type CreateReport = z.infer<typeof createReportSchema>;
export type ModerationReport = z.infer<typeof moderationReportSchema>;
export type ReviewAction = z.infer<typeof reviewActionSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export const threadListItemSchema = threadSchema.extend({
  unreadCount: z.number(),
  lastMessage: messageSchema.nullable(),
  otherMembers: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
    })
  ),
});

export type ThreadListItem = z.infer<typeof threadListItemSchema>;

export const messagePageSchema = z.object({
  messages: z.array(messageWithSenderSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export type MessagePage = z.infer<typeof messagePageSchema>;

export const moderationQueueItemSchema = moderationReportSchema.extend({
  message: messageWithSenderSchema,
  reporter: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
  }),
});

export type ModerationQueueItem = z.infer<typeof moderationQueueItemSchema>;
