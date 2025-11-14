export type NotificationType =
  | 'POLL_CREATED'
  | 'POLL_CLOSING'
  | 'PITCH_ACCEPTED'
  | 'PITCH_REJECTED'
  | 'NEW_SWAP_REQUEST'
  | 'SWAP_ACCEPTED'
  | 'SWAP_DECLINED'
  | 'SWAP_DELIVERED'
  | 'SWAP_VERIFIED'
  | 'SWAP_REVIEW_REMINDER'
  | 'REVIEW_SUBMITTED'
  | 'REFERRAL_ACTIVATED'
  | 'POINTS_AWARDED'
  | 'MEMBERSHIP_APPROVED'
  | 'NEW_MESSAGE'
  | 'NEW_CLUB_INVITE'
  | 'CLUB_MENTION'
  | 'AUTHOR_NEW_PITCH';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  data: any;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationList {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

export interface UnreadCount {
  count: number;
}
